"""
Agent 4: Socio-Eco-Policy Analyst - Impact Assessment Expert

Assesses broader impacts:
- Social impact
- Economic impact
- Policy and governance
- Environmental effects
- Ethical risks
"""

from typing import Type
from .base import BaseAgent
from .schemas import ImpactAssessmentOutput, EntityMapOutput, ScenarioOutput
from .prompts import IMPACT_ANALYST_PROMPT


class ImpactAnalystAgent(BaseAgent[ImpactAssessmentOutput]):
    """Agent 4: Analyzes socio-economic and policy impacts."""
    
    @property
    def system_prompt(self) -> str:
        return IMPACT_ANALYST_PROMPT
    
    @property
    def output_schema(self) -> Type[ImpactAssessmentOutput]:
        return ImpactAssessmentOutput
    
    def process(
        self,
        user_text: str,
        entity_map: EntityMapOutput,
        scenarios: ScenarioOutput
    ) -> ImpactAssessmentOutput:
        """
        Analyze broader impacts of the system.
        
        Args:
            user_text: Original system description
            entity_map: Output from Agent 2
            scenarios: Output from Agent 3
            
        Returns:
            ImpactAssessmentOutput with impact analysis
        """
        entities_str = ', '.join(entity_map.entities)
        scenario_summary = '\n'.join([
            f"  - {s.name} ({s.type}): {s.description}"
            for s in scenarios.scenarios[:3]  # Include first 3 scenarios
        ])
        
        prompt = f"""Assess the broader impacts of this system:

SYSTEM DESCRIPTION:
{user_text}

ENTITIES:
{entities_str}

KEY SCENARIOS:
{scenario_summary}

Analyze social, economic, policy, environmental, and ethical impacts."""
        
        return self.generate(prompt)
