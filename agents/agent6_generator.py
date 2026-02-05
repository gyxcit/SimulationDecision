"""
Agent 6: System Generator - V5 JSON Builder

Converts refined structure into valid SystemModel JSON:
- Follows V5 schema strictly
- Enforces all validation rules
- Generates complete SystemModel
"""

import json
from typing import Type
from pydantic import BaseModel
from .base import BaseAgent
from .schemas import RefinedStructureOutput
from .prompts import SYSTEM_GENERATOR_PROMPT
from models import SystemModel


class SystemModelOutput(BaseModel):
    """Wrapper for SystemModel to use as agent output schema."""
    model: dict  # Will contain the SystemModel dict


class SystemGeneratorAgent(BaseAgent[SystemModel]):
    """Agent 6: Generates final SystemModel from refined structure."""
    
    @property
    def system_prompt(self) -> str:
        return SYSTEM_GENERATOR_PROMPT
    
    @property
    def output_schema(self) -> Type[SystemModel]:
        return SystemModel
    
    def process(self, refined: RefinedStructureOutput) -> SystemModel:
        """
        Generate SystemModel from refined structure.
        
        Args:
            refined: Output from Agent 5
            
        Returns:
            Valid SystemModel instance
        """
        prompt = f"""Convert this refined structure into a valid SystemModel JSON:

=== REFINED STRUCTURE ===
{json.dumps(refined.model_dump(), indent=2)}

Generate a complete SystemModel following the V5 schema exactly.
Include all entities, components, and influences.
Add simulation parameters (dt=0.1, steps=300)."""
        
        return self.generate(prompt)
