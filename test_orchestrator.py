"""
Test suite for Multi-Agent System V7 Orchestrator.

Tests individual agents, pipeline flow, and integration.
"""

import pytest
import os
from unittest.mock import Mock, patch

from orchestrator import Orchestrator, build_system_model
from llm_client import LLMConfig
from models import SystemModel


# Skip tests if no API key configured
pytestmark = pytest.mark.skipif(
    not os.getenv("MISTRAL_API_KEY") and not os.getenv("OPENAI_API_KEY"),
    reason="No LLM API key configured"
)


@pytest.fixture
def llm_config():
    """Fixture for LLM configuration."""
    if os.getenv("MISTRAL_API_KEY"):
        return LLMConfig(
            api_key=os.getenv("MISTRAL_API_KEY"),
            base_url="https://api.mistral.ai/v1",
            model="mistral-large-latest",
            temperature=0.0
        )
    return None


@pytest.fixture
def simple_description():
    """Fixture for a simple system description."""
    return """
    A simple factory system with workers who have productivity.
    Productivity depends on morale and equipment quality.
    """


class TestOrchestrator:
    """Tests for the Orchestrator class."""
    
    def test_orchestrator_initialization(self, llm_config):
        """Test that orchestrator initializes all agents."""
        orchestrator = Orchestrator(llm_config=llm_config)
        
        assert orchestrator.agent1 is not None
        assert orchestrator.agent2 is not None
        assert orchestrator.agent3 is not None
        assert orchestrator.agent4 is not None
        assert orchestrator.agent5 is not None
        assert orchestrator.agent6 is not None
        assert orchestrator.agent7 is not None
        assert orchestrator.agent8 is not None
    
    @pytest.mark.slow
    def test_full_pipeline(self, llm_config, simple_description):
        """Test the full pipeline execution."""
        orchestrator = Orchestrator(llm_config=llm_config, max_iterations=1)
        
        model = orchestrator.run(simple_description)
        
        # Verify result is a valid SystemModel
        assert isinstance(model, SystemModel)
        assert len(model.entities) > 0
        
        # Verify simulation parameters exist
        assert model.simulation is not None
        assert model.simulation.dt > 0
        assert model.simulation.steps > 0
    
    @pytest.mark.slow
    def test_build_system_model(self, llm_config, simple_description):
        """Test the convenience function."""
        model = build_system_model(simple_description, llm_config=llm_config)
        
        assert isinstance(model, SystemModel)
        assert len(model.entities) > 0


class TestAgents:
    """Tests for individual agents."""
    
    @pytest.mark.slow
    def test_agent1_analyzer(self, llm_config, simple_description):
        """Test Agent 1: Analyzer."""
        from agents.agent1_analyzer import AnalyzerAgent
        from llm_client import LLMClient
        
        client = LLMClient(config=llm_config) if llm_config else LLMClient()
        agent = AnalyzerAgent(llm_client=client)
        
        result = agent.process(simple_description)
        
        assert result.main_topic
        assert result.domain
        assert len(result.goals) > 0
    
    @pytest.mark.slow
    def test_agent2_explorer(self, llm_config, simple_description):
        """Test Agent 2: Entity Explorer."""
        from agents.agent1_analyzer import AnalyzerAgent
        from agents.agent2_explorer import EntityExplorerAgent
        from llm_client import LLMClient
        
        client = LLMClient(config=llm_config) if llm_config else LLMClient()
        
        agent1 = AnalyzerAgent(llm_client=client)
        analysis = agent1.process(simple_description)
        
        agent2 = EntityExplorerAgent(llm_client=client)
        result = agent2.process(simple_description, analysis)
        
        assert len(result.entities) > 0
        assert len(result.components) > 0
        assert len(result.influences) > 0


class TestIntegration:
    """Integration tests."""
    
    @pytest.mark.slow
    def test_v7_vs_v5_comparison(self, llm_config, simple_description):
        """Compare V7 and V5 outputs."""
        from generator import generate_system_model
        
        # Generate with V7
        model_v7 = build_system_model(simple_description, llm_config=llm_config)
        
        # Generate with V5
        model_v5 = generate_system_model(simple_description, llm_config=llm_config)
        
        # Both should be valid
        assert isinstance(model_v7, SystemModel)
        assert isinstance(model_v5, SystemModel)
        
        # V7 might have more entities/components due to multi-agent reasoning
        # But both should have at least one entity
        assert len(model_v7.entities) >= 1
        assert len(model_v5.entities) >= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
