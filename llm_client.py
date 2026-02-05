"""
LLM Client wrapper for OpenAI-compatible API calls.

This module provides a clean abstraction for interacting with LLMs,
supporting both OpenAI and compatible APIs (Ollama, Azure, etc.).
"""

import os
import logging
from typing import Optional
from dataclasses import dataclass

from openai import OpenAI

logger = logging.getLogger(__name__)


@dataclass
class LLMConfig:
    """
    Configuration for the LLM client.
    
    Attributes:
        api_key: API key for authentication
        base_url: Base URL for the API endpoint (for OpenAI-compatible APIs)
        model: Model identifier to use
        temperature: Sampling temperature (0.0 for deterministic output)
        max_tokens: Maximum tokens in response
    """
    api_key: str
    base_url: Optional[str] = None
    model: str = "gpt-4o"
    temperature: float = 0.0
    max_tokens: int = 4096


class LLMClient:
    """
    Wrapper for OpenAI-compatible LLM API calls.
    
    Provides a simple interface for sending prompts and receiving
    structured responses from language models.
    """
    
    def __init__(self, config: Optional[LLMConfig] = None):
        """
        Initialize the LLM client.
        
        Args:
            config: LLM configuration. If None, reads from environment variables.
        """
        if config is None:
            config = LLMConfig(
                api_key=os.environ.get("OPENAI_API_KEY", ""),
                base_url=os.environ.get("OPENAI_BASE_URL"),
                model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
                temperature=float(os.environ.get("OPENAI_TEMPERATURE", "0.0")),
                max_tokens=int(os.environ.get("OPENAI_MAX_TOKENS", "4096"))
            )
        
        self.config = config
        
        client_kwargs = {"api_key": config.api_key}
        if config.base_url:
            client_kwargs["base_url"] = config.base_url
        
        self._client = OpenAI(**client_kwargs)
        
        logger.info(
            f"LLMClient initialized with model={config.model}, "
            f"temperature={config.temperature}"
        )
    
    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Generate a response from the LLM.
        
        Args:
            system_prompt: System-level instructions for the model
            user_prompt: User input to process
            temperature: Override default temperature (optional)
            max_tokens: Override default max_tokens (optional)
        
        Returns:
            The generated text response from the model
        
        Raises:
            Exception: If the API call fails
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        logger.debug(f"Sending request to LLM with system prompt length={len(system_prompt)}")
        
        response = self._client.chat.completions.create(
            model=self.config.model,
            messages=messages,
            temperature=temperature if temperature is not None else self.config.temperature,
            max_tokens=max_tokens if max_tokens is not None else self.config.max_tokens
        )
        
        content = response.choices[0].message.content
        
        logger.debug(f"Received response with length={len(content)}")
        
        return content
