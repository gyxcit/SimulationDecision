"""
Simulation Engine for V5 Hybrid System Architecture.

This module implements the numerical simulation of dynamic systems
using Euler explicit integration.

Mathematical model:
    x(t+1) = x(t) + dt * f(x)

Where f(x) is computed from the influences on each state variable.
"""

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Callable, Any
from copy import deepcopy

from models import SystemModel, ComponentModel, InfluenceModel


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class SimulationState:
    """
    Current state of all variables in the simulation.
    
    Provides dict-like access to variable values using "Entity.component" notation.
    """
    values: Dict[str, float] = field(default_factory=dict)
    
    def get(self, key: str, default: float = 0.0) -> float:
        """Get variable value by full path (Entity.component)."""
        return self.values.get(key, default)
    
    def set(self, key: str, value: float) -> None:
        """Set variable value by full path."""
        self.values[key] = value
    
    def __getitem__(self, key: str) -> float:
        return self.values[key]
    
    def __setitem__(self, key: str, value: float) -> None:
        self.values[key] = value
    
    def copy(self) -> "SimulationState":
        """Create a deep copy of the state."""
        return SimulationState(values=dict(self.values))


@dataclass
class SimulationResult:
    """
    Complete results of a simulation run.
    
    Attributes:
        history: List of states at each time step
        time_points: List of time values
        final_state: Final state of the simulation
        metadata: Additional information about the run
    """
    history: List[Dict[str, float]]
    time_points: List[float]
    final_state: Dict[str, float]
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def get_variable_history(self, variable: str) -> List[float]:
        """
        Get the time series for a specific variable.
        
        Args:
            variable: Full variable path (e.g., "Eleves.satisfaction")
        
        Returns:
            List of values at each time step
        """
        return [state.get(variable, 0.0) for state in self.history]
    
    def get_entity_history(self, entity: str) -> Dict[str, List[float]]:
        """
        Get time series for all components of an entity.
        
        Args:
            entity: Entity name (e.g., "Eleves")
        
        Returns:
            Dict mapping component names to their time series
        """
        result = {}
        prefix = f"{entity}."
        
        for key in self.history[0].keys():
            if key.startswith(prefix):
                component_name = key[len(prefix):]
                result[component_name] = self.get_variable_history(key)
        
        return result


# =============================================================================
# INFLUENCE FUNCTIONS
# =============================================================================

def linear(x: float, coef: float) -> float:
    """Linear influence: coef * x"""
    return coef * x


def sigmoid(x: float, coef: float) -> float:
    """Sigmoid influence: coef * (1 / (1 + exp(-x)))"""
    try:
        return coef * (1.0 / (1.0 + math.exp(-5 * (x - 0.5))))
    except OverflowError:
        return coef if x > 0.5 else 0.0


def threshold(x: float, coef: float, threshold_value: float = 0.5) -> float:
    """Threshold influence: coef if x > threshold else 0"""
    return coef if x > threshold_value else 0.0


def division(x: float, coef: float) -> float:
    """Division influence: coef / (1 + x)"""
    return coef / (1.0 + x)


INFLUENCE_FUNCTIONS: Dict[str, Callable[[float, float], float]] = {
    "linear": linear,
    "sigmoid": sigmoid,
    "threshold": threshold,
    "division": division,
}


# =============================================================================
# SIMULATION ENGINE
# =============================================================================

class SimulationEngine:
    """
    Euler explicit integration engine for dynamic system simulation.
    
    Supports:
    - State variables (integrated over time)
    - Computed variables (algebraic, instant)
    - Constant variables (fixed values)
    - Parameter modification during simulation
    """
    
    def __init__(self, model: SystemModel):
        """
        Initialize the simulation engine.
        
        Args:
            model: Validated SystemModel instance
        """
        self.model = deepcopy(model)
        self._state = SimulationState()
        self._variable_metadata: Dict[str, Dict[str, Any]] = {}
        
        self._initialize_state()
    
    def _initialize_state(self) -> None:
        """Initialize all variables from model definition."""
        for entity_name, entity in self.model.entities.items():
            for comp_name, component in entity.components.items():
                full_name = f"{entity_name}.{comp_name}"
                self._state[full_name] = component.initial
                self._variable_metadata[full_name] = {
                    "type": component.type,
                    "min": component.min,
                    "max": component.max,
                    "influences": component.influences,
                    "entity": entity_name,
                    "component": comp_name,
                }
    
    def get_state(self) -> Dict[str, float]:
        """Get current state of all variables."""
        return dict(self._state.values)
    
    def set_parameter(self, variable: str, value: float) -> None:
        """
        Set a parameter or variable value.
        
        Args:
            variable: Full variable path (e.g., "Eleves.satisfaction")
            value: New value to set
        """
        if variable not in self._state.values:
            raise ValueError(f"Unknown variable: {variable}")
        
        # Apply bounds if defined
        meta = self._variable_metadata[variable]
        if meta["min"] is not None:
            value = max(meta["min"], value)
        if meta["max"] is not None:
            value = min(meta["max"], value)
        
        self._state[variable] = value
    
    def set_influence_coef(
        self, 
        target: str, 
        source: str, 
        new_coef: float
    ) -> None:
        """
        Modify an influence coefficient.
        
        Args:
            target: Target variable (e.g., "Eleves.satisfaction")
            source: Source variable in the influence (e.g., "Enseignants.qualite")
            new_coef: New coefficient value
        """
        meta = self._variable_metadata.get(target)
        if not meta:
            raise ValueError(f"Unknown target variable: {target}")
        
        for influence in meta["influences"]:
            if influence.from_ == source:
                # Create a new influence with updated coef
                # (InfluenceModel is immutable, so we update in model)
                entity = self.model.entities[meta["entity"]]
                component = entity.components[meta["component"]]
                for i, inf in enumerate(component.influences):
                    if inf.from_ == source:
                        # Replace with updated influence
                        new_inf = InfluenceModel(
                            **{
                                "from": inf.from_,
                                "coef": new_coef,
                                "kind": inf.kind,
                                "function": inf.function,
                                "enabled": inf.enabled
                            }
                        )
                        component.influences[i] = new_inf
                        meta["influences"][i] = new_inf
                        return
        
        raise ValueError(f"No influence from {source} to {target}")
    
    def toggle_influence(self, target: str, source: str, enabled: bool) -> None:
        """
        Enable or disable an influence.
        
        Args:
            target: Target variable
            source: Source variable in the influence
            enabled: True to enable, False to disable
        """
        meta = self._variable_metadata.get(target)
        if not meta:
            raise ValueError(f"Unknown target variable: {target}")
        
        entity = self.model.entities[meta["entity"]]
        component = entity.components[meta["component"]]
        
        for i, inf in enumerate(component.influences):
            if inf.from_ == source:
                new_inf = InfluenceModel(
                    **{
                        "from": inf.from_,
                        "coef": inf.coef,
                        "kind": inf.kind,
                        "function": inf.function,
                        "enabled": enabled
                    }
                )
                component.influences[i] = new_inf
                meta["influences"][i] = new_inf
                return
        
        raise ValueError(f"No influence from {source} to {target}")
    
    def _compute_derivative(self, variable: str) -> float:
        """
        Compute the derivative (rate of change) for a state variable.
        
        Args:
            variable: Full variable path
        
        Returns:
            Rate of change based on all active influences
        """
        meta = self._variable_metadata[variable]
        derivative = 0.0
        
        for influence in meta["influences"]:
            if not influence.enabled:
                continue
            
            # Get source value
            source_var = influence.from_
            if source_var == "self" or source_var == variable.split(".")[-1]:
                source_value = self._state[variable]
            elif "." in source_var:
                source_value = self._state.get(source_var, 0.0)
            else:
                # Try to find in same entity
                entity = meta["entity"]
                full_source = f"{entity}.{source_var}"
                source_value = self._state.get(full_source, 0.0)
            
            # Apply influence function
            func = INFLUENCE_FUNCTIONS.get(influence.function, linear)
            contribution = func(source_value, influence.coef)
            
            # Apply kind modifier
            if influence.kind == "negative":
                contribution = -abs(contribution)
            elif influence.kind == "decay":
                # Decay is proportional to current value
                current = self._state[variable]
                contribution = influence.coef * current
            elif influence.kind == "ratio":
                # Ratio influence
                current = self._state[variable]
                if current != 0:
                    contribution = influence.coef * (source_value / current)
                else:
                    contribution = 0.0
            
            derivative += contribution
        
        return derivative
    
    def _apply_bounds(self, variable: str, value: float) -> float:
        """Apply min/max bounds to a value."""
        meta = self._variable_metadata[variable]
        
        if meta["min"] is not None:
            value = max(meta["min"], value)
        if meta["max"] is not None:
            value = min(meta["max"], value)
        
        return value
    
    def step(self, dt: Optional[float] = None) -> Dict[str, float]:
        """
        Execute one simulation step.
        
        Args:
            dt: Time step (uses model default if not specified)
        
        Returns:
            New state after the step
        """
        if dt is None:
            dt = self.model.simulation.dt
        
        # Phase 1: Compute all derivatives
        derivatives: Dict[str, float] = {}
        
        for variable, meta in self._variable_metadata.items():
            if meta["type"] == "state":
                derivatives[variable] = self._compute_derivative(variable)
            elif meta["type"] == "computed":
                # Computed variables are updated algebraically
                derivatives[variable] = self._compute_derivative(variable)
        
        # Phase 2: Update all state variables (synchronous)
        new_values: Dict[str, float] = {}
        
        for variable, meta in self._variable_metadata.items():
            if meta["type"] == "state":
                # Euler integration: x(t+1) = x(t) + dt * dx/dt
                new_value = self._state[variable] + dt * derivatives[variable]
                new_values[variable] = self._apply_bounds(variable, new_value)
            elif meta["type"] == "computed":
                # Computed: direct assignment from derivative
                new_value = self._state[variable] + derivatives[variable]
                new_values[variable] = self._apply_bounds(variable, new_value)
            # Constants don't change
        
        # Phase 3: Apply updates
        for variable, value in new_values.items():
            self._state[variable] = value
        
        return dict(self._state.values)
    
    def run(
        self,
        steps: Optional[int] = None,
        dt: Optional[float] = None,
        callback: Optional[Callable[[int, Dict[str, float]], None]] = None
    ) -> SimulationResult:
        """
        Run a complete simulation.
        
        Args:
            steps: Number of steps (uses model default if not specified)
            dt: Time step (uses model default if not specified)
            callback: Optional function called at each step(step_num, state)
        
        Returns:
            SimulationResult with full history
        """
        if steps is None:
            steps = self.model.simulation.steps
        if dt is None:
            dt = self.model.simulation.dt
        
        history: List[Dict[str, float]] = []
        time_points: List[float] = []
        
        # Record initial state
        history.append(dict(self._state.values))
        time_points.append(0.0)
        
        # Run simulation
        for i in range(steps):
            state = self.step(dt)
            history.append(dict(state))
            time_points.append((i + 1) * dt)
            
            if callback:
                callback(i + 1, state)
        
        return SimulationResult(
            history=history,
            time_points=time_points,
            final_state=dict(self._state.values),
            metadata={
                "steps": steps,
                "dt": dt,
                "total_time": steps * dt,
            }
        )
    
    def reset(self) -> None:
        """Reset simulation to initial state."""
        self._initialize_state()
    
    def get_variables(self) -> List[str]:
        """Get list of all variable names."""
        return list(self._state.values.keys())
    
    def get_influences_for(self, variable: str) -> List[Dict[str, Any]]:
        """
        Get all influences affecting a variable.
        
        Args:
            variable: Full variable path
        
        Returns:
            List of influence dictionaries
        """
        meta = self._variable_metadata.get(variable)
        if not meta:
            return []
        
        return [
            {
                "from": inf.from_,
                "coef": inf.coef,
                "kind": inf.kind,
                "function": inf.function,
                "enabled": inf.enabled,
            }
            for inf in meta["influences"]
        ]


# =============================================================================
# CONVENIENCE FUNCTION
# =============================================================================

def simulate(
    model: SystemModel,
    parameter_changes: Optional[Dict[str, float]] = None,
    influence_changes: Optional[List[Dict[str, Any]]] = None,
    steps: Optional[int] = None,
    dt: Optional[float] = None
) -> SimulationResult:
    """
    Run a simulation with optional parameter modifications.
    
    Args:
        model: Validated SystemModel instance
        parameter_changes: Dict mapping variable paths to new values
        influence_changes: List of dicts with {target, source, coef} or {target, source, enabled}
        steps: Number of simulation steps
        dt: Time step size
    
    Returns:
        SimulationResult with complete history
    
    Example:
        >>> result = simulate(
        ...     model,
        ...     parameter_changes={"Eleves.motivation": 0.9},
        ...     influence_changes=[
        ...         {"target": "Eleves.satisfaction", "source": "Enseignants.qualite", "coef": 0.8}
        ...     ]
        ... )
    """
    engine = SimulationEngine(model)
    
    # Apply parameter changes
    if parameter_changes:
        for variable, value in parameter_changes.items():
            engine.set_parameter(variable, value)
    
    # Apply influence modifications
    if influence_changes:
        for change in influence_changes:
            target = change["target"]
            source = change["source"]
            
            if "coef" in change:
                engine.set_influence_coef(target, source, change["coef"])
            if "enabled" in change:
                engine.toggle_influence(target, source, change["enabled"])
    
    return engine.run(steps=steps, dt=dt)
