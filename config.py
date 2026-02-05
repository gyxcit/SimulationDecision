"""
Configuration management for Multi-Agent System V7.

Provides centralized configuration for the orchestrator and agents.
"""

import os
from dataclasses import dataclass
from typing import Optional

from dotenv import load_dotenv
load_dotenv()


@dataclass
class OrchestratorConfig:
    """
    Configuration for the V7 orchestrator.
    
    Attributes:
        max_iterations: Maximum repair iterations if approval fails
        agent_max_retries: Maximum retries per agent on validation failure
        agent_temperature: Temperature for all agents (0.0 = deterministic)
        enable_all_agents: If False, can disable individual agents for testing
    """
    max_iterations: int = 2
    agent_max_retries: int = 3
    agent_temperature: float = 0.0
    enable_all_agents: bool = True
    
    @classmethod
    def from_env(cls) -> "OrchestratorConfig":
        """Load configuration from environment variables."""
        return cls(
            max_iterations=int(os.getenv("V7_MAX_ITERATIONS", "2")),
            agent_max_retries=int(os.getenv("V7_AGENT_MAX_RETRIES", "3")),
            agent_temperature=float(os.getenv("V7_AGENT_TEMPERATURE", "0.0")),
            enable_all_agents=os.getenv("V7_ENABLE_ALL_AGENTS", "true").lower() == "true"
        )


def get_orchestrator_config() -> OrchestratorConfig:
    """
    Get orchestrator configuration.
    
    Returns:
        OrchestratorConfig instance
    """
    return OrchestratorConfig.from_env()
