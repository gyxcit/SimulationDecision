"""
Agent 5: Refiner/Synthesizer - Model Fusion Expert

Merges all previous analyses into coherent structure:
- Merges information from Agents 1-4
- Removes redundancies
- Resolves conflicts
- Optimizes structure
- Normalizes terminology
"""

import json
from typing import Type
from .base import BaseAgent
from .schemas import (
    RefinedStructureOutput,
    AnalysisOutput,
    EntityMapOutput,
    ScenarioOutput,
    ImpactAssessmentOutput
)
from .prompts import REFINER_PROMPT


class RefinerAgent(BaseAgent[RefinedStructureOutput]):
    """Agent 5: Synthesizes all previous outputs into refined structure."""
    
    @property
    def system_prompt(self) -> str:
        return REFINER_PROMPT
    
    @property
    def output_schema(self) -> Type[RefinedStructureOutput]:
        return RefinedStructureOutput
    
    def process(
        self,
        analysis: AnalysisOutput,
        entity_map: EntityMapOutput,
        scenarios: ScenarioOutput,
        impacts: ImpactAssessmentOutput
    ) -> RefinedStructureOutput:
        """
        Synthesize all previous outputs into refined structure.
        
        Args:
            analysis: Output from Agent 1
            entity_map: Output from Agent 2
            scenarios: Output from Agent 3
            impacts: Output from Agent 4
            
        Returns:
            RefinedStructureOutput with synthesized model structure
        """
        prompt = f"""Synthesize the following analyses into a coherent, optimized model structure:

=== CONCEPTUAL ANALYSIS (Agent 1) ===
{json.dumps(analysis.model_dump(), indent=2)}

=== ENTITY & CAUSAL MAP (Agent 2) ===
{json.dumps(entity_map.model_dump(), indent=2)}

=== STRESS TEST SCENARIOS (Agent 3) ===
{json.dumps(scenarios.model_dump(), indent=2)}

=== IMPACT ASSESSMENT (Agent 4) ===
{json.dumps(impacts.model_dump(), indent=2)}

Merge this information, resolve conflicts, remove redundancies, and create an optimized structure."""
        
        return self.generate(prompt)
