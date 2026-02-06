"""
Agent 3: Extreme Generator - Stress Testing Expert

Generates extreme scenarios to test system boundaries:
- Worst/best cases
- Crises and breakdowns
- Unusual situations
- Missing variables identification
"""

from typing import Type
from .base import BaseAgent
from .schemas import ScenarioOutput, EntityMapOutput
from .prompts import EXTREME_GENERATOR_PROMPT


class ExtremeGeneratorAgent(BaseAgent[ScenarioOutput]):
    """Agent 3: Generates stress test scenarios."""
    
    @property
    def system_prompt(self) -> str:
        return EXTREME_GENERATOR_PROMPT
    
    @property
    def output_schema(self) -> Type[ScenarioOutput]:
        return ScenarioOutput
    
    def process(self, user_text: str, entity_map: EntityMapOutput) -> ScenarioOutput:
        """
        Generate stress test scenarios.
        
        Args:
            user_text: Original system description
            entity_map: Output from Agent 2
            
        Returns:
            ScenarioOutput with stress test scenarios
        """
        entities_str = ', '.join(entity_map.entities)
        components_str = '\n'.join([
            f"  {entity}: {', '.join(comps)}"
            for entity, comps in entity_map.components.items()
        ])
        
        prompt = f"""Generate stress test scenarios for this system:

SYSTEM DESCRIPTION:
{user_text}

IDENTIFIED ENTITIES:
{entities_str}

COMPONENTS:
{components_str}

Generate worst cases, best cases, crises, breakdowns, and unusual scenarios.
Identify any missing variables or entities."""
        
        return self.generate(prompt)
