"""
Base Agent class for Multi-Agent System V7.

Provides common functionality for all agents including:
- LLM interaction
- JSON extraction and validation
- Retry logic
- Schema validation
"""

import json
import logging
import re
from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Optional, Type

from pydantic import BaseModel, ValidationError

from llm_client import LLMClient, LLMConfig

logger = logging.getLogger(__name__)

# Type variable for agent output schemas
T = TypeVar('T', bound=BaseModel)


class BaseAgent(ABC, Generic[T]):
    """
    Abstract base class for all agents in the V7 pipeline.
    
    Each agent must:
    1. Define a system prompt
    2. Specify an output schema (Pydantic model)
    3. Implement the process() method
    """
    
    def __init__(
        self,
        llm_client: LLMClient,
        max_retries: int = 3,
        temperature: float = 0.0
    ):
        """
        Initialize the agent.
        
        Args:
            llm_client: LLM client instance
            max_retries: Maximum retry attempts on validation failure
            temperature: LLM sampling temperature
        """
        self._llm_client = llm_client
        self._max_retries = max_retries
        self._temperature = temperature
        self._agent_name = self.__class__.__name__
        
        logger.info(f"{self._agent_name} initialized with max_retries={max_retries}")
    
    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """System prompt for this agent. Must be implemented by subclasses."""
        pass
    
    @property
    @abstractmethod
    def output_schema(self) -> Type[T]:
        """Pydantic schema for this agent's output. Must be implemented by subclasses."""
        pass
    
    def extract_json(self, response: str) -> str:
        """
        Extract JSON from LLM response, handling markdown wrappers and common errors.
        
        Args:
            response: Raw LLM response text
            
        Returns:
            Cleaned JSON string
        """
        # Try to extract JSON from markdown code blocks
        json_pattern = r"```(?:json)?\s*([\s\S]*?)```"
        matches = re.findall(json_pattern, response)
        
        if matches:
            json_str = matches[0].strip()
        else:
            # Try to find JSON object directly (starts with { ends with })
            response = response.strip()
            
            # Find the first { and last }
            start_idx = response.find("{")
            end_idx = response.rfind("}")
            
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                json_str = response[start_idx:end_idx + 1]
            else:
                # Return as-is if no extraction needed
                json_str = response
        
        # Clean up common LLM JSON errors
        json_str = self._clean_json(json_str)
        
        return json_str
    
    def _clean_json(self, json_str: str) -> str:
        """
        Clean common JSON formatting issues from LLM responses.
        
        Args:
            json_str: JSON string to clean
            
        Returns:
            Cleaned JSON string
        """
        # Remove trailing commas before closing brackets/braces
        # This is the most common LLM JSON error
        json_str = re.sub(r',\s*}', '}', json_str)  # trailing comma before }
        json_str = re.sub(r',\s*]', ']', json_str)  # trailing comma before ]
        
        # Remove comments (sometimes LLMs add // comments)
        json_str = re.sub(r'//.*?(\n|$)', '', json_str)
        
        # Fix single quotes to double quotes (valid JSON requires double quotes)
        # This is tricky - only do it for keys and string values, not in strings
        # For now, skip this as it's complex and may break things
        
        return json_str
    
    def build_repair_prompt(self, original_input: str, error_message: str) -> str:
        """
        Build a repair prompt when validation fails.
        
        Args:
            original_input: Original user input
            error_message: Validation error details
            
        Returns:
            Repair prompt string
        """
        return f"""{original_input}

---

The previous output was invalid.

Validation errors:
{error_message}

Fix and regenerate valid JSON matching the required schema."""
    
    def generate(self, user_prompt: str) -> T:
        """
        Generate agent output with automatic retry on validation failure.
        
        Args:
            user_prompt: Input prompt for this agent
            
        Returns:
            Validated output matching the agent's schema
            
        Raises:
            ValueError: If generation fails after all retry attempts
        """
        logger.info(f"{self._agent_name} starting generation")
        
        last_error: Optional[str] = None
        last_response: Optional[str] = None
        
        for attempt in range(1, self._max_retries + 1):
            logger.debug(f"{self._agent_name} attempt {attempt}/{self._max_retries}")
            
            try:
                # Build prompt (add repair instructions if retrying)
                if last_error:
                    prompt = self.build_repair_prompt(user_prompt, last_error)
                else:
                    prompt = user_prompt
                
                # Call LLM
                response = self._llm_client.generate(
                    system_prompt=self.system_prompt,
                    user_prompt=prompt,
                    temperature=self._temperature
                )
                
                last_response = response
                logger.debug(f"{self._agent_name} received response: {response[:200]}...")
                
                # Extract JSON
                json_str = self.extract_json(response)
                logger.debug(f"{self._agent_name} extracted JSON: {json_str[:200]}...")
                
                # Parse JSON
                data = json.loads(json_str)
                logger.debug(f"{self._agent_name} JSON parsing successful")
                
                # Validate with schema
                output = self.output_schema.model_validate(data)
                logger.info(f"{self._agent_name} validation successful")
                
                return output
                
            except json.JSONDecodeError as e:
                error_msg = f"JSON parsing error: {str(e)}"
                logger.warning(f"{self._agent_name} attempt {attempt} failed: {error_msg}")
                last_error = error_msg
                
            except ValidationError as e:
                error_msg = f"Schema validation error: {str(e)}"
                logger.warning(f"{self._agent_name} attempt {attempt} failed: {error_msg}")
                last_error = error_msg
                
            except Exception as e:
                error_msg = f"Unexpected error: {str(e)}"
                logger.error(f"{self._agent_name} attempt {attempt} failed: {error_msg}")
                last_error = error_msg
        
        # All retries exhausted
        error_details = (
            f"{self._agent_name} failed after {self._max_retries} attempts. "
            f"Last error: {last_error}"
        )
        
        if last_response:
            error_details += f"\n\nLast LLM response:\n{last_response[:500]}"
        
        logger.error(error_details)
        raise ValueError(error_details)
    
    @abstractmethod
    def process(self, *args, **kwargs) -> T:
        """
        Process input and generate output.
        
        Must be implemented by subclasses to define agent-specific logic.
        """
        pass
