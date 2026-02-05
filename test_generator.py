"""
Unit tests for the System Model Generator.

Tests cover:
- Pydantic model validation
- JSON extraction from LLM responses
- Generator retry logic
- Error handling
"""

import json
import pytest
from unittest.mock import Mock, patch

from models import (
    SystemModel,
    EntityModel,
    ComponentModel,
    InfluenceModel,
    SimulationModel
)
from generator import (
    extract_json_from_response,
    SystemModelGenerator,
    generate_system_model
)
from llm_client import LLMClient, LLMConfig


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def valid_system_json() -> str:
    """Return a valid SystemModel JSON string."""
    return json.dumps({
        "entities": {
            "Eleves": {
                "components": {
                    "satisfaction": {
                        "type": "state",
                        "initial": 0.6,
                        "min": 0.0,
                        "max": 1.0,
                        "influences": [
                            {
                                "from": "Enseignants.qualite",
                                "coef": 0.4,
                                "kind": "positive",
                                "function": "linear",
                                "enabled": True
                            },
                            {
                                "from": "satisfaction",
                                "coef": -0.1,
                                "kind": "decay",
                                "function": "linear",
                                "enabled": True
                            }
                        ]
                    },
                    "motivation": {
                        "type": "state",
                        "initial": 0.7,
                        "min": 0.0,
                        "max": 1.0,
                        "influences": [
                            {
                                "from": "satisfaction",
                                "coef": 0.3,
                                "kind": "positive",
                                "function": "linear",
                                "enabled": True
                            }
                        ]
                    }
                }
            },
            "Enseignants": {
                "components": {
                    "qualite": {
                        "type": "state",
                        "initial": 0.8,
                        "min": 0.0,
                        "max": 1.0,
                        "influences": [
                            {
                                "from": "qualite",
                                "coef": -0.05,
                                "kind": "decay",
                                "function": "linear",
                                "enabled": True
                            }
                        ]
                    }
                }
            }
        },
        "simulation": {
            "dt": 0.1,
            "steps": 300
        }
    })


@pytest.fixture
def mock_llm_client():
    """Create a mock LLM client."""
    return Mock(spec=LLMClient)


# =============================================================================
# MODEL TESTS
# =============================================================================

class TestInfluenceModel:
    """Tests for InfluenceModel."""
    
    def test_valid_influence(self):
        """Test creating a valid influence."""
        influence = InfluenceModel(
            **{"from": "Entity.component", "coef": 0.5, "kind": "positive"}
        )
        assert influence.from_ == "Entity.component"
        assert influence.coef == 0.5
        assert influence.kind == "positive"
        assert influence.function == "linear"  # default
        assert influence.enabled is True  # default
    
    def test_influence_with_alias(self):
        """Test that 'from' alias works correctly."""
        data = {"from": "source.var", "coef": 0.3, "kind": "negative"}
        influence = InfluenceModel.model_validate(data)
        assert influence.from_ == "source.var"
    
    def test_influence_serialization(self):
        """Test that serialization uses alias."""
        influence = InfluenceModel(
            **{"from": "x.y", "coef": 0.1, "kind": "decay"}
        )
        output = influence.model_dump(by_alias=True)
        assert "from" in output
        assert output["from"] == "x.y"


class TestComponentModel:
    """Tests for ComponentModel."""
    
    def test_state_component(self):
        """Test creating a state component."""
        component = ComponentModel(
            type="state",
            initial=0.5,
            min=0.0,
            max=1.0
        )
        assert component.type == "state"
        assert component.initial == 0.5
        assert component.influences == []
    
    def test_computed_component(self):
        """Test creating a computed component."""
        component = ComponentModel(
            type="computed",
            initial=0.0
        )
        assert component.type == "computed"
        assert component.min is None
        assert component.max is None
    
    def test_invalid_type(self):
        """Test that invalid type raises error."""
        with pytest.raises(Exception):
            ComponentModel(type="invalid", initial=0.0)


class TestSystemModel:
    """Tests for SystemModel."""
    
    def test_valid_system(self, valid_system_json):
        """Test parsing a valid system."""
        data = json.loads(valid_system_json)
        model = SystemModel.model_validate(data)
        
        assert "Eleves" in model.entities
        assert "Enseignants" in model.entities
        assert model.simulation.dt == 0.1
        assert model.simulation.steps == 300
    
    def test_empty_entities(self):
        """Test that empty entities dict is valid."""
        model = SystemModel(
            entities={},
            simulation=SimulationModel()
        )
        assert len(model.entities) == 0
    
    def test_default_simulation(self):
        """Test default simulation parameters."""
        model = SystemModel(
            entities={},
            simulation=SimulationModel()
        )
        assert model.simulation.dt == 0.1
        assert model.simulation.steps == 300


# =============================================================================
# JSON EXTRACTION TESTS
# =============================================================================

class TestJsonExtraction:
    """Tests for extract_json_from_response."""
    
    def test_clean_json(self):
        """Test extracting clean JSON."""
        response = '{"key": "value"}'
        result = extract_json_from_response(response)
        assert result == '{"key": "value"}'
    
    def test_json_in_markdown(self):
        """Test extracting JSON from markdown code block."""
        response = '''Here is the JSON:
```json
{"key": "value"}
```
'''
        result = extract_json_from_response(response)
        assert result == '{"key": "value"}'
    
    def test_json_with_text_before(self):
        """Test extracting JSON with leading text."""
        response = 'Here is your model: {"key": "value"}'
        result = extract_json_from_response(response)
        assert result == '{"key": "value"}'
    
    def test_json_with_text_after(self):
        """Test extracting JSON with trailing text."""
        response = '{"key": "value"} Hope this helps!'
        result = extract_json_from_response(response)
        assert result == '{"key": "value"}'
    
    def test_complex_nested_json(self):
        """Test extracting complex nested JSON."""
        response = '''```
{
  "entities": {
    "Test": {
      "components": {}
    }
  },
  "simulation": {"dt": 0.1, "steps": 100}
}
```'''
        result = extract_json_from_response(response)
        data = json.loads(result)
        assert "entities" in data


# =============================================================================
# GENERATOR TESTS
# =============================================================================

class TestSystemModelGenerator:
    """Tests for SystemModelGenerator."""
    
    def test_successful_generation(self, mock_llm_client, valid_system_json):
        """Test successful model generation."""
        mock_llm_client.generate.return_value = valid_system_json
        
        generator = SystemModelGenerator(llm_client=mock_llm_client)
        model = generator.generate("Test input")
        
        assert isinstance(model, SystemModel)
        assert "Eleves" in model.entities
        mock_llm_client.generate.assert_called_once()
    
    def test_retry_on_invalid_json(self, mock_llm_client, valid_system_json):
        """Test that generator retries on invalid JSON."""
        mock_llm_client.generate.side_effect = [
            "{ invalid json",
            valid_system_json
        ]
        
        generator = SystemModelGenerator(llm_client=mock_llm_client, max_retries=3)
        model = generator.generate("Test input")
        
        assert isinstance(model, SystemModel)
        assert mock_llm_client.generate.call_count == 2
    
    def test_retry_on_validation_error(self, mock_llm_client, valid_system_json):
        """Test that generator retries on validation error."""
        invalid_data = json.dumps({"entities": {}, "simulation": {"dt": "not_a_number"}})
        mock_llm_client.generate.side_effect = [
            invalid_data,
            valid_system_json
        ]
        
        generator = SystemModelGenerator(llm_client=mock_llm_client, max_retries=3)
        model = generator.generate("Test input")
        
        assert isinstance(model, SystemModel)
        assert mock_llm_client.generate.call_count == 2
    
    def test_max_retries_exhausted(self, mock_llm_client):
        """Test that error is raised when retries exhausted."""
        mock_llm_client.generate.return_value = "{ always invalid"
        
        generator = SystemModelGenerator(llm_client=mock_llm_client, max_retries=3)
        
        with pytest.raises(ValueError) as exc_info:
            generator.generate("Test input")
        
        assert "Failed to generate" in str(exc_info.value)
        assert mock_llm_client.generate.call_count == 3
    
    def test_repair_prompt_sent_on_retry(self, mock_llm_client, valid_system_json):
        """Test that repair prompt is sent on retry."""
        mock_llm_client.generate.side_effect = [
            "{ invalid",
            valid_system_json
        ]
        
        generator = SystemModelGenerator(llm_client=mock_llm_client, max_retries=3)
        generator.generate("Original input")
        
        # Second call should contain error message
        second_call_args = mock_llm_client.generate.call_args_list[1]
        user_prompt = second_call_args.kwargs.get("user_prompt", second_call_args.args[1] if len(second_call_args.args) > 1 else "")
        
        assert "previous output was invalid" in user_prompt.lower() or "validation error" in user_prompt.lower()


# =============================================================================
# INTEGRATION TESTS
# =============================================================================

class TestGenerateSystemModelFunction:
    """Integration tests for generate_system_model function."""
    
    @patch("generator.LLMClient")
    def test_function_creates_client(self, mock_client_class, valid_system_json):
        """Test that function creates LLM client."""
        mock_instance = Mock()
        mock_instance.generate.return_value = valid_system_json
        mock_client_class.return_value = mock_instance
        
        model = generate_system_model("Test")
        
        assert isinstance(model, SystemModel)
        mock_client_class.assert_called_once()
    
    @patch("generator.LLMClient")
    def test_function_with_custom_config(self, mock_client_class, valid_system_json):
        """Test function with custom LLM config."""
        mock_instance = Mock()
        mock_instance.generate.return_value = valid_system_json
        mock_client_class.return_value = mock_instance
        
        config = LLMConfig(api_key="test-key", model="gpt-4")
        model = generate_system_model("Test", llm_config=config)
        
        assert isinstance(model, SystemModel)
        mock_client_class.assert_called_once_with(config=config)


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
