"""
Pydantic models for the V5 Hybrid System Architecture.

This module defines the data models for representing dynamic systems
with entities, components, influences, and simulation parameters.
"""

from typing import List, Dict, Literal, Optional
from pydantic import BaseModel, Field


class InfluenceModel(BaseModel):
    """
    Represents an atomic influence relationship between components.
    
    Attributes:
        from_: Source variable (aliased as 'from' in JSON)
        coef: Influence coefficient
        kind: Type of influence (positive, negative, decay, ratio)
        function: Mathematical function used (linear, sigmoid, threshold, division)
        enabled: Whether this influence is active
    """
    model_config = {"populate_by_name": True}
    
    from_: str = Field(..., alias="from")
    coef: float
    kind: Literal["positive", "negative", "decay", "ratio"]
    function: Literal["linear", "sigmoid", "threshold", "division"] = "linear"
    enabled: bool = True


class ComponentModel(BaseModel):
    """
    Represents a measurable variable within an entity.
    
    Attributes:
        type: Variable type (state=integrated, computed=algebraic, constant=fixed)
        initial: Initial value
        min: Optional minimum bound
        max: Optional maximum bound
        influences: List of incoming influences affecting this component
    """
    type: Literal["state", "computed", "constant"]
    initial: float
    min: Optional[float] = None
    max: Optional[float] = None
    influences: List[InfluenceModel] = []


class EntityModel(BaseModel):
    """
    Represents a macro-level actor in the system (e.g., Élèves, Enseignants).
    
    Attributes:
        components: Dictionary of component names to their definitions
    """
    components: Dict[str, ComponentModel]


class SimulationModel(BaseModel):
    """
    Configuration for the simulation engine.
    
    Attributes:
        dt: Time step for Euler integration
        steps: Number of simulation steps to execute
    """
    dt: float = 0.1
    steps: int = 300


class SystemModel(BaseModel):
    """
    Root model representing the complete hybrid system.
    
    This is the top-level schema for the V5 architecture, containing
    all entities and simulation parameters.
    
    Attributes:
        entities: Dictionary of entity names to their definitions
        simulation: Simulation configuration
    """
    entities: Dict[str, EntityModel]
    simulation: SimulationModel
