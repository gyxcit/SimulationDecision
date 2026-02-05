"""
Agent 2: Entity Explorer - Causal Mapping Expert

Maps entities, components, and causal relationships including:
- Entity and component identification
- Influence relationships (who/why/how/when/where)
- Missing stakeholders
"""

from typing import Type
from .base import BaseAgent
from .schemas import EntityMapOutput, AnalysisOutput
from .prompts import ENTITY_EXPLORER_PROMPT


class EntityExplorerAgent(BaseAgent[EntityMapOutput]):
    """Agent 2: Explores entities and maps causal relationships."""
    
    @property
    def system_prompt(self) -> str:
        return ENTITY_EXPLORER_PROMPT
    
    @property
    def output_schema(self) -> Type[EntityMapOutput]:
        return EntityMapOutput
    
    def process(self, user_text: str, analysis: AnalysisOutput) -> EntityMapOutput:
        """
        Map causal relationships between entities.
        
        Args:
            user_text: Original system description
            analysis: Output from Agent 1
            
        Returns:
            EntityMapOutput with causal maps
        """
        prompt = f"""Map the causal relationships for this system:

SYSTEM DESCRIPTION:
{user_text}

ANALYSIS:
Topic: {analysis.main_topic}
Domain: {analysis.domain}
Goals: {', '.join(analysis.goals)}
Context: {analysis.context}

Identify all entities, their components, and influence relationships."""
        
        return self.generate(prompt)
