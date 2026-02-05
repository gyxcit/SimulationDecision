"""
Orchestrator for Multi-Agent System V7.

Coordinates the execution of all 8 agents in sequence to build
validated SystemModel instances from natural language.
"""

import logging
from typing import Optional
from dataclasses import dataclass

from llm_client import LLMClient, LLMConfig
from models import SystemModel

from agents.agent1_analyzer import AnalyzerAgent
from agents.agent2_explorer import EntityExplorerAgent
from agents.agent3_extremes import ExtremeGeneratorAgent
from agents.agent4_impact import ImpactAnalystAgent
from agents.agent5_refiner import RefinerAgent
from agents.agent6_generator import SystemGeneratorAgent
from agents.agent7_critic import TechnicalCriticAgent
from agents.agent8_reviewer import ImpactReviewerAgent

from agents.schemas import (
    AnalysisOutput,
    EntityMapOutput,
    ScenarioOutput,
    ImpactAssessmentOutput,
    RefinedStructureOutput,
    CritiqueOutput,
    ReviewOutput
)

logger = logging.getLogger(__name__)


@dataclass
class PipelineOutputs:
    """Container for all intermediate agent outputs."""
    analysis: Optional[AnalysisOutput] = None
    entity_map: Optional[EntityMapOutput] = None
    scenarios: Optional[ScenarioOutput] = None
    impacts: Optional[ImpactAssessmentOutput] = None
    refined: Optional[RefinedStructureOutput] = None
    model: Optional[SystemModel] = None
    critique: Optional[CritiqueOutput] = None
    review: Optional[ReviewOutput] = None


class Orchestrator:
    """
    Central controller for the Multi-Agent System V7 pipeline.
    
    Executes all 8 agents in sequence:
    1. Analyzer - Understanding
    2. Entity Explorer - Causal Mapping
    3. Extreme Generator - Stress Testing
    4. Socio-Eco-Policy Analyst - Impact Assessment
    5. Refiner/Synthesizer - Fusion
    6. System Generator - JSON V5 Builder
    7. Technical Critic - Validation
    8. Impact Reviewer - Final Approval
    """
    
    def __init__(
        self,
        llm_config: Optional[LLMConfig] = None,
        max_iterations: int = 2,
        agent_max_retries: int = 3,
        agent_temperature: float = 0.0
    ):
        """
        Initialize the orchestrator with all agents.
        
        Args:
            llm_config: LLM configuration. If None, uses defaults.
            max_iterations: Maximum repair iterations if approval fails
            agent_max_retries: Maximum retries per agent on validation failure
            agent_temperature: Temperature for all agents
        """
        self._max_iterations = max_iterations
        
        # Create LLM client
        llm_client = LLMClient(config=llm_config) if llm_config else LLMClient()
        
        # Initialize all agents
        logger.info("Initializing 8 agents...")
        
        self.agent1 = AnalyzerAgent(
            llm_client=llm_client,
            max_retries=agent_max_retries,
            temperature=agent_temperature
        )
        
        self.agent2 = EntityExplorerAgent(
            llm_client=llm_client,
            max_retries=agent_max_retries,
            temperature=agent_temperature
        )
        
        self.agent3 = ExtremeGeneratorAgent(
            llm_client=llm_client,
            max_retries=agent_max_retries,
            temperature=agent_temperature
        )
        
        self.agent4 = ImpactAnalystAgent(
            llm_client=llm_client,
            max_retries=agent_max_retries,
            temperature=agent_temperature
        )
        
        self.agent5 = RefinerAgent(
            llm_client=llm_client,
            max_retries=agent_max_retries,
            temperature=agent_temperature
        )
        
        self.agent6 = SystemGeneratorAgent(
            llm_client=llm_client,
            max_retries=agent_max_retries,
            temperature=agent_temperature
        )
        
        self.agent7 = TechnicalCriticAgent(
            llm_client=llm_client,
            max_retries=agent_max_retries,
            temperature=agent_temperature
        )
        
        self.agent8 = ImpactReviewerAgent(
            llm_client=llm_client,
            max_retries=agent_max_retries,
            temperature=agent_temperature
        )
        
        logger.info("Orchestrator initialized with 8 agents")
    
    def run(self, text: str) -> SystemModel:
        """
        Execute the full V7 pipeline.
        
        Args:
            text: Natural language system description
            
        Returns:
            Validated SystemModel instance
            
        Raises:
            ValueError: If pipeline fails after all iterations
        """
        logger.info("=" * 80)
        logger.info("STARTING MULTI-AGENT SYSTEM V7 PIPELINE")
        logger.info("=" * 80)
        
        for iteration in range(1, self._max_iterations + 1):
            logger.info(f"\n{'=' * 80}")
            logger.info(f"ITERATION {iteration}/{self._max_iterations}")
            logger.info(f"{'=' * 80}\n")
            
            try:
                outputs = self._execute_pipeline(text)
                
                # Check if approved
                if outputs.review.approved:
                    logger.info(f"\n{'=' * 80}")
                    logger.info("✓ MODEL APPROVED - Pipeline complete!")
                    logger.info(f"{'=' * 80}\n")
                    return outputs.model
                else:
                    logger.warning(f"\n{'=' * 80}")
                    logger.warning(f"✗ MODEL NOT APPROVED (iteration {iteration})")
                    logger.warning(f"Warnings: {outputs.review.warnings}")
                    logger.warning(f"{'=' * 80}\n")
                    
                    if iteration < self._max_iterations:
                        logger.info("Attempting repair...")
                        # For now, we'll just retry the full pipeline
                        # In a more sophisticated version, we could feedback to specific agents
                        continue
                    else:
                        logger.error("Max iterations reached without approval")
                        raise ValueError(
                            f"Model not approved after {self._max_iterations} iterations. "
                            f"Last review: {outputs.review.model_dump()}"
                        )
                        
            except Exception as e:
                logger.error(f"Pipeline failed in iteration {iteration}: {str(e)}")
                if iteration >= self._max_iterations:
                    raise
                logger.info("Retrying...")
                continue
        
        raise ValueError(f"Pipeline failed after {self._max_iterations} iterations")
    
    def _execute_pipeline(self, text: str) -> PipelineOutputs:
        """
        Execute all agents in sequence.
        
        Args:
            text: User input text
            
        Returns:
            PipelineOutputs with all intermediate results
        """
        outputs = PipelineOutputs()
        
        # Agent 1: Analyzer
        logger.info("[1/8] Running Analyzer...")
        outputs.analysis = self.agent1.process(text)
        logger.info(f"  ✓ Analysis complete: {outputs.analysis.main_topic}")
        
        # Agent 2: Entity Explorer
        logger.info("[2/8] Running Entity Explorer...")
        outputs.entity_map = self.agent2.process(text, outputs.analysis)
        logger.info(f"  ✓ Entity map complete: {len(outputs.entity_map.entities)} entities")
        
        # Agent 3: Extreme Generator
        logger.info("[3/8] Running Extreme Generator...")
        outputs.scenarios = self.agent3.process(text, outputs.entity_map)
        logger.info(f"  ✓ Scenarios complete: {len(outputs.scenarios.scenarios)} scenarios")
        
        # Agent 4: Impact Analyst
        logger.info("[4/8] Running Impact Analyst...")
        outputs.impacts = self.agent4.process(text, outputs.entity_map, outputs.scenarios)
        logger.info(f"  ✓ Impact assessment complete")
        
        # Agent 5: Refiner
        logger.info("[5/8] Running Refiner/Synthesizer...")
        outputs.refined = self.agent5.process(
            outputs.analysis,
            outputs.entity_map,
            outputs.scenarios,
            outputs.impacts
        )
        logger.info(f"  ✓ Refinement complete: {len(outputs.refined.entities)} refined entities")
        
        # Agent 6: System Generator
        logger.info("[6/8] Running System Generator...")
        outputs.model = self.agent6.process(outputs.refined)
        logger.info(f"  ✓ SystemModel generated: {len(outputs.model.entities)} entities")
        
        # Agent 7: Technical Critic
        logger.info("[7/8] Running Technical Critic...")
        outputs.critique = self.agent7.process(outputs.model)
        logger.info(
            f"  ✓ Critique complete: {outputs.critique.overall_quality} quality, "
            f"{len(outputs.critique.issues)} issues"
        )
        
        # Agent 8: Impact Reviewer
        logger.info("[8/8] Running Impact Reviewer...")
        outputs.review = self.agent8.process(outputs.model, outputs.impacts, outputs.critique)
        logger.info(
            f"  ✓ Review complete: {'APPROVED' if outputs.review.approved else 'NOT APPROVED'}"
        )
        
        return outputs


# =============================================================================
# CONVENIENCE FUNCTION
# =============================================================================

def build_system_model(
    user_text: str,
    llm_config: Optional[LLMConfig] = None,
    max_iterations: int = 2
) -> SystemModel:
    """
    Build and validate a dynamic system model from user input using V7 pipeline.
    
    This is the main entry point for the Multi-Agent System V7.
    
    Args:
        user_text: Natural language description of the system
        llm_config: Optional LLM configuration
        max_iterations: Maximum repair iterations if approval fails
        
    Returns:
        Validated SystemModel instance
        
    Example:
        >>> model = build_system_model(
        ...     "A school system with students and teachers where "
        ...     "satisfaction depends on teaching quality"
        ... )
        >>> print(model.entities.keys())
        dict_keys(['Students', 'Teachers'])
    """
    orchestrator = Orchestrator(llm_config=llm_config, max_iterations=max_iterations)
    return orchestrator.run(user_text)
