"""
System Model Generator using LLM and Pydantic validation.

This module implements the core pipeline for converting natural language
descriptions into validated SystemModel instances following the V5 architecture.
"""

import json
import logging
import re
from typing import Optional

from pydantic import ValidationError

from models import SystemModel
from llm_client import LLMClient, LLMConfig

logger = logging.getLogger(__name__)


# =============================================================================
# PROMPTS
# =============================================================================

SYSTEM_PROMPT = """You are an expert in system dynamics modeling.

Convert the following description into a valid JSON
that strictly follows the schema.

Rules:
- Output ONLY JSON.
- No markdown.
- No explanations.
- No comments.
- All fields must exist.
- Use default bounds min=0, max=1 when relevant.
- Add a decay influence to each state component.
- Use linear influences by default.
- Limit to 3–5 components per entity.
- Validate before answering.

Before answering, check that the JSON matches the schema.
Fix all errors silently.

SCHEMA:

SystemModel:
{
  entities: {
    <entity_name>: {
      components: {
        <component_name>: {
          type: "state" | "computed" | "constant",
          initial: number,
          min: number | null,
          max: number | null,
          influences: [
            {
              from: string,
              coef: number,
              kind: "positive" | "negative" | "decay" | "ratio",
              function: "linear" | "sigmoid" | "threshold" | "division",
              enabled: boolean
            }
          ]
        }
      }
    }
  },
  simulation: {
    dt: number,
    steps: integer
  }
}"""


REPAIR_PROMPT_TEMPLATE = """The previous output was invalid.

Validation errors:
{error_message}

Fix and regenerate valid JSON."""


# =============================================================================
# JSON EXTRACTION
# =============================================================================

def extract_json_from_response(response: str) -> str:
    """
    Extract JSON from LLM response, handling potential markdown wrappers.
    
    Args:
        response: Raw LLM response text
    
    Returns:
        Cleaned JSON string
    """
    # Try to extract JSON from markdown code blocks
    json_pattern = r"```(?:json)?\s*([\s\S]*?)```"
    matches = re.findall(json_pattern, response)
    
    if matches:
        return matches[0].strip()
    
    # Try to find JSON object directly (starts with { ends with })
    response = response.strip()
    
    # Find the first { and last }
    start_idx = response.find("{")
    end_idx = response.rfind("}")
    
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        return response[start_idx:end_idx + 1]
    
    # Return as-is if no extraction needed
    return response


# =============================================================================
# MAIN GENERATOR
# =============================================================================

class SystemModelGenerator:
    """
    Generator for converting natural language to validated SystemModel.
    
    Uses an LLM to interpret user descriptions and produces a validated
    Pydantic model, with automatic retry and repair on validation failures.
    """
    
    def __init__(
        self,
        llm_client: Optional[LLMClient] = None,
        max_retries: int = 3
    ):
        """
        Initialize the generator.
        
        Args:
            llm_client: LLM client instance. If None, creates default client.
            max_retries: Maximum number of retry attempts on validation failure.
        """
        self._llm_client = llm_client or LLMClient()
        self._max_retries = max_retries
        
        logger.info(f"SystemModelGenerator initialized with max_retries={max_retries}")
    
    def generate(self, user_text: str) -> SystemModel:
        """
        Generate a validated SystemModel from natural language description.
        
        Args:
            user_text: Natural language description of the system to model
        
        Returns:
            Validated SystemModel instance
        
        Raises:
            ValueError: If generation fails after all retry attempts
            json.JSONDecodeError: If JSON parsing fails on final attempt
            ValidationError: If Pydantic validation fails on final attempt
        """
        logger.info(f"Starting model generation for input length={len(user_text)}")
        
        last_error: Optional[str] = None
        last_response: Optional[str] = None
        
        for attempt in range(1, self._max_retries + 1):
            logger.info(f"Generation attempt {attempt}/{self._max_retries}")
            
            try:
                # Build the prompt
                if last_error is None:
                    # First attempt: use original user text
                    user_prompt = user_text
                else:
                    # Retry attempt: include repair instructions
                    repair_message = REPAIR_PROMPT_TEMPLATE.format(
                        error_message=last_error
                    )
                    user_prompt = f"{user_text}\n\n{repair_message}"
                
                # Call LLM
                response = self._llm_client.generate(
                    system_prompt=SYSTEM_PROMPT,
                    user_prompt=user_prompt
                )
                
                last_response = response
                logger.debug(f"Received LLM response: {response[:200]}...")
                
                # Extract JSON from response
                json_str = extract_json_from_response(response)
                logger.debug(f"Extracted JSON: {json_str[:200]}...")
                
                # Parse JSON
                data = json.loads(json_str)
                logger.debug("JSON parsing successful")
                
                # Validate with Pydantic
                model = SystemModel.model_validate(data)
                logger.info("Validation successful - returning SystemModel")
                
                return model
                
            except json.JSONDecodeError as e:
                error_msg = f"JSON parsing error: {str(e)}"
                logger.warning(f"Attempt {attempt} failed: {error_msg}")
                last_error = error_msg
                
            except ValidationError as e:
                error_msg = f"Pydantic validation error: {str(e)}"
                logger.warning(f"Attempt {attempt} failed: {error_msg}")
                last_error = error_msg
                
            except Exception as e:
                error_msg = f"Unexpected error: {str(e)}"
                logger.error(f"Attempt {attempt} failed with unexpected error: {error_msg}")
                last_error = error_msg
        
        # All retries exhausted
        error_details = (
            f"Failed to generate valid SystemModel after {self._max_retries} attempts. "
            f"Last error: {last_error}"
        )
        
        if last_response:
            error_details += f"\n\nLast LLM response:\n{last_response}"
        
        logger.error(error_details)
        raise ValueError(error_details)


# =============================================================================
# CONVENIENCE FUNCTION
# =============================================================================

def generate_system_model(
    user_text: str,
    llm_config: Optional[LLMConfig] = None,
    max_retries: int = 3
) -> SystemModel:
    """
    Generate a validated SystemModel from natural language description.
    
    This is the main entry point for the generation pipeline. It:
    1. Sends user_text to an LLM with a strict modeling prompt
    2. Receives structured JSON
    3. Parses JSON safely
    4. Validates with Pydantic
    5. Auto-repairs on failure (retry loop)
    6. Returns a valid SystemModel instance
    
    Args:
        user_text: Natural language description of the system to model.
                   Example: "A school system with students who have satisfaction
                   influenced by teacher quality"
        llm_config: Optional LLM configuration. If None, uses environment variables.
        max_retries: Maximum retry attempts on validation failure (default: 3)
    
    Returns:
        Validated SystemModel instance ready for simulation
    
    Raises:
        ValueError: If generation fails after all retry attempts
    
    Example:
        >>> model = generate_system_model(
        ...     "Model a factory with workers who have productivity influenced by morale"
        ... )
        >>> print(model.entities.keys())
        dict_keys(['Factory', 'Workers'])
    """
    llm_client = LLMClient(config=llm_config) if llm_config else LLMClient()
    generator = SystemModelGenerator(llm_client=llm_client, max_retries=max_retries)
    
    return generator.generate(user_text)
