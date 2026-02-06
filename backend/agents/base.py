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

from ..llm_client import LLMClient, LLMConfig

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
    
    def _try_repair_json(self, json_str: str, error: json.JSONDecodeError) -> str:
        """
        Try to repair JSON based on the specific error.
        
        Args:
            json_str: The broken JSON string
            error: The JSONDecodeError with position info
            
        Returns:
            Possibly repaired JSON string
        """
        pos = error.pos
        
        # Get context around the error
        start = max(0, pos - 50)
        end = min(len(json_str), pos + 50)
        context = json_str[start:end]
        logger.debug(f"JSON error context: ...{context}...")
        
        # Common fixes based on error message
        if "Expecting ',' delimiter" in str(error):
            # Often caused by missing comma between array/object elements
            # Try inserting a comma at the error position
            # Look backwards for the last complete value
            before_error = json_str[:pos]
            after_error = json_str[pos:]
            
            # Check if we need to add a comma
            # Look for pattern like "value"\n"key" or "value"\n{ or }{ etc.
            repair_patterns = [
                (r'"\s*\n\s*"', '",\n"'),  # "value" "key" -> "value", "key"
                (r'"\s*\n\s*{', '",\n{'),   # "value" { -> "value", {
                (r'}\s*\n\s*{', '},\n{'),   # } { -> }, {
                (r'}\s*\n\s*"', '},\n"'),   # } "key" -> }, "key"
                (r']\s*\n\s*"', '],\n"'),   # ] "key" -> ], "key"
                (r']\s*\n\s*{', '],\n{'),   # ] { -> ], {
                (r'(\d)\s*\n\s*"', r'\1,\n"'),  # number "key" -> number, "key"
                (r'(true|false|null)\s*\n\s*"', r'\1,\n"'),  # bool "key" -> bool, "key"
            ]
            
            for pattern, replacement in repair_patterns:
                json_str = re.sub(pattern, replacement, json_str)
        
        elif "Expecting ':' delimiter" in str(error):
            # Missing colon after key
            json_str = re.sub(r'"(\w+)"\s*{', r'"\1": {', json_str)
            json_str = re.sub(r'"(\w+)"\s*\[', r'"\1": [', json_str)
            json_str = re.sub(r'"(\w+)"\s*"', r'"\1": "', json_str)
        
        elif "Unterminated string" in str(error):
            # Try to close unclosed strings
            lines = json_str.split('\n')
            for i, line in enumerate(lines):
                # Count quotes
                quote_count = line.count('"') - line.count('\\"')
                if quote_count % 2 == 1:
                    # Odd number of quotes - try to close
                    lines[i] = line.rstrip() + '"'
            json_str = '\n'.join(lines)
        
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
        json_str = re.sub(r'//.*?(\n|$)', '\n', json_str)
        
        # Fix unescaped newlines in strings - replace literal newlines with \n in string values
        # This handles cases where LLM puts actual newlines in JSON strings
        def fix_string_newlines(match):
            content = match.group(1)
            # Replace actual newlines with escaped newlines
            content = content.replace('\n', '\\n').replace('\r', '\\r')
            # Also escape any unescaped quotes inside the string
            return '"' + content + '"'
        
        # Fix strings that span multiple lines (common LLM error)
        # Be careful to only fix strings, not the structure
        try:
            # Try to fix multiline strings by escaping newlines within quoted strings
            in_string = False
            escape_next = False
            result = []
            i = 0
            while i < len(json_str):
                char = json_str[i]
                
                if escape_next:
                    result.append(char)
                    escape_next = False
                elif char == '\\':
                    result.append(char)
                    escape_next = True
                elif char == '"' and not escape_next:
                    result.append(char)
                    in_string = not in_string
                elif in_string and char == '\n':
                    result.append('\\n')
                elif in_string and char == '\r':
                    result.append('\\r')
                elif in_string and char == '\t':
                    result.append('\\t')
                else:
                    result.append(char)
                i += 1
            
            json_str = ''.join(result)
        except Exception:
            # If the fix fails, return original
            pass
        
        # Remove any BOM or special characters at the start
        json_str = json_str.lstrip('\ufeff\u200b\u200c\u200d')
        
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
        print(f"      📤 {self._agent_name} starting generation...", flush=True)
        logger.info(f"{self._agent_name} starting generation")
        
        last_error: Optional[str] = None
        last_response: Optional[str] = None
        
        for attempt in range(1, self._max_retries + 1):
            if attempt > 1:
                print(f"      🔄 {self._agent_name} retry attempt {attempt}/{self._max_retries}", flush=True)
            logger.debug(f"{self._agent_name} attempt {attempt}/{self._max_retries}")
            
            try:
                # Build prompt (add repair instructions if retrying)
                if last_error:
                    prompt = self.build_repair_prompt(user_prompt, last_error)
                else:
                    prompt = user_prompt
                
                # Call LLM
                print(f"      💬 Calling LLM...", flush=True)
                response = self._llm_client.generate(
                    system_prompt=self.system_prompt,
                    user_prompt=prompt,
                    temperature=self._temperature
                )
                
                last_response = response
                print(f"      📥 Response received ({len(response)} chars)", flush=True)
                logger.debug(f"{self._agent_name} received response: {response[:200]}...")
                
                # Extract JSON
                print(f"      🔍 Extracting JSON...", flush=True)
                json_str = self.extract_json(response)
                print(f"      📋 JSON extracted ({len(json_str)} chars)", flush=True)
                logger.debug(f"{self._agent_name} extracted JSON: {json_str[:200]}...")
                
                # Parse JSON with repair attempts
                print(f"      🛠️  Parsing JSON...", flush=True)
                try:
                    data = json.loads(json_str)
                    print(f"      ✅ JSON parsed successfully", flush=True)
                except json.JSONDecodeError as e:
                    # Try to repair the JSON
                    print(f"      ⚠️  JSON parse error: {str(e)[:80]}...", flush=True)
                    print(f"      🔧 Attempting JSON repair...", flush=True)
                    logger.debug(f"{self._agent_name} attempting JSON repair for error: {e}")
                    repaired_json = self._try_repair_json(json_str, e)
                    
                    # Try parsing the repaired JSON
                    try:
                        data = json.loads(repaired_json)
                        print(f"      ✅ JSON repair successful!", flush=True)
                        logger.info(f"{self._agent_name} JSON repair successful")
                    except json.JSONDecodeError:
                        # Repair failed, re-raise original error
                        print(f"      ❌ JSON repair failed, will retry with LLM", flush=True)
                        raise e
                
                logger.debug(f"{self._agent_name} JSON parsing successful")
                
                # Validate with schema
                print(f"      📋 Validating against schema...", flush=True)
                output = self.output_schema.model_validate(data)
                print(f"      ✅ Schema validation successful", flush=True)
                logger.info(f"{self._agent_name} validation successful")
                
                return output
                
            except json.JSONDecodeError as e:
                error_msg = f"JSON parsing error: {str(e)}"
                print(f"      ❌ {self._agent_name} attempt {attempt} failed: JSON error", flush=True)
                print(f"         Error: {str(e)[:100]}...", flush=True)
                logger.warning(f"{self._agent_name} attempt {attempt} failed: {error_msg}")
                last_error = error_msg
                
            except ValidationError as e:
                error_msg = f"Schema validation error: {str(e)}"
                print(f"      ❌ {self._agent_name} attempt {attempt} failed: Validation error", flush=True)
                print(f"         Error: {str(e)[:100]}...", flush=True)
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
