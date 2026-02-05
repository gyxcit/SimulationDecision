"""
Agent 7: Technical Critic - Quality Control Expert

Validates SystemModel for technical issues:
- Instability detection
- Missing feedback loops
- Over-simplification
- Numerical risks
"""

import json
from typing import Type
from .base import BaseAgent
from .schemas import CritiqueOutput
from .prompts import TECHNICAL_CRITIC_PROMPT
from models import SystemModel


class TechnicalCriticAgent(BaseAgent[CritiqueOutput]):
    """Agent 7: Critiques SystemModel for technical issues."""
    
    @property
    def system_prompt(self) -> str:
        return TECHNICAL_CRITIC_PROMPT
    
    @property
    def output_schema(self) -> Type[CritiqueOutput]:
        return CritiqueOutput
    
    def process(self, model: SystemModel) -> CritiqueOutput:
        """
        Critically evaluate SystemModel for technical issues.
        
        Args:
            model: SystemModel from Agent 6
            
        Returns:
            CritiqueOutput with identified issues and recommendations
        """
        model_json = json.dumps(model.model_dump(by_alias=True), indent=2)
        
        prompt = f"""Critically evaluate this SystemModel for technical issues:

=== SYSTEM MODEL ===
{model_json}

Identify:
- Instability risks
- Missing feedback loops
- Over-simplifications
- Numerical risks
- Other technical issues

Provide severity levels, suggestions, quality assessment, and stability score."""
        
        return self.generate(prompt)
