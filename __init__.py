"""
Industrial AI - System Model Generator

A pipeline for converting natural language descriptions into validated
SystemModel instances using LLM and Pydantic validation.

Architecture V5 compliant.
"""

from models import (
    SystemModel,
    EntityModel,
    ComponentModel,
    InfluenceModel,
    SimulationModel
)
from llm_client import LLMClient, LLMConfig
from generator import generate_system_model, SystemModelGenerator
from simulation import SimulationEngine, SimulationResult, SimulationState, simulate
from visualization import plot_simulation, plot_comparison, plot_entity_dashboard

__all__ = [
    # Models
    "SystemModel",
    "EntityModel",
    "ComponentModel",
    "InfluenceModel",
    "SimulationModel",
    # LLM
    "LLMClient",
    "LLMConfig",
    # Generator
    "generate_system_model",
    "SystemModelGenerator",
    # Simulation
    "SimulationEngine",
    "SimulationResult",
    "SimulationState",
    "simulate",
    # Visualization
    "plot_simulation",
    "plot_comparison",
    "plot_entity_dashboard",
]

__version__ = "1.0.0"
