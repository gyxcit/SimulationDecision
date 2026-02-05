"""
Agent 1: Analyzer - System Understanding Expert

Extracts key information from system descriptions including:
- Main topic, domain, goals
- Context and time horizon
- Hidden assumptions
"""

from typing import Type
from .base import BaseAgent
from .schemas import AnalysisOutput
from .prompts import ANALYZER_PROMPT


class AnalyzerAgent(BaseAgent[AnalysisOutput]):
    """Agent 1: Analyzes and understands system descriptions."""
    
    @property
    def system_prompt(self) -> str:
        return ANALYZER_PROMPT
    
    @property
    def output_schema(self) -> Type[AnalysisOutput]:
        return AnalysisOutput
    
    def process(self, user_text: str) -> AnalysisOutput:
        """
        Analyze system description and extract key information.
        
        Args:
            user_text: Natural language system description
            
        Returns:
            AnalysisOutput with extracted information
        """
        prompt = f"""Analyze this system description:

{user_text}

Extract the main topic, domain, goals, context, time horizon, and hidden assumptions."""
        
        return self.generate(prompt)
