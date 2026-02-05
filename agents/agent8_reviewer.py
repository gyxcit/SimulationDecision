"""
Agent 8: Impact Reviewer - Final Approval Expert

Reviews model from holistic perspective:
- Realism and safety
- Bias and fairness
- Social acceptability
- Long-term risks
- Final approval decision
"""

import json
from typing import Type
from .base import BaseAgent
from .schemas import ReviewOutput, ImpactAssessmentOutput, CritiqueOutput
from .prompts import IMPACT_REVIEWER_PROMPT
from models import SystemModel


class ImpactReviewerAgent(BaseAgent[ReviewOutput]):
    """Agent 8: Reviews and approves/rejects SystemModel."""
    
    @property
    def system_prompt(self) -> str:
        return IMPACT_REVIEWER_PROMPT
    
    @property
    def output_schema(self) -> Type[ReviewOutput]:
        return ReviewOutput
    
    def process(
        self,
        model: SystemModel,
        impacts: ImpactAssessmentOutput,
        critique: CritiqueOutput
    ) -> ReviewOutput:
        """
        Final review and approval decision.
        
        Args:
            model: SystemModel from Agent 6
            impacts: Impact assessment from Agent 4
            critique: Technical critique from Agent 7
            
        Returns:
            ReviewOutput with approval decision
        """
        model_json = json.dumps(model.model_dump(by_alias=True), indent=2)
        
        prompt = f"""Review this SystemModel and decide whether to approve it:

=== SYSTEM MODEL ===
{model_json}

=== IMPACT ASSESSMENT ===
{json.dumps(impacts.model_dump(), indent=2)}

=== TECHNICAL CRITIQUE ===
{json.dumps(critique.model_dump(), indent=2)}

Evaluate realism, safety, bias, social acceptability, and long-term risks.
Decide whether to approve or reject this model.
Provide scores, concerns, warnings, and recommendations."""
        
        return self.generate(prompt)
