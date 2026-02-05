"""
Example usage of the System Model Generator.

This script demonstrates how to use the generate_system_model function
to convert natural language descriptions into validated SystemModel instances.
"""

import json
import logging
import os
import sys

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


def main():
    """Run example system model generation."""
    from generator import generate_system_model
    from llm_client import LLMConfig
    
    # Example user input - a school system description (French)
    user_text = """
    Modélise un système scolaire avec les entités suivantes:
    
    1. Les Élèves:
       - Leur satisfaction dépend de la qualité de l'enseignement
       - Leur motivation influence leurs résultats
       - Ils ont un niveau de stress qui affecte leur bien-être
    
    2. Les Enseignants:
       - Leur qualité d'enseignement dépend de leur motivation
       - Leur charge de travail influence négativement leur bien-être
       - Leur expérience est un facteur constant
    
    3. L'Administration:
       - Elle gère le budget qui influence les ressources
       - Les ressources affectent la qualité de l'environnement
    
    Les interactions principales:
    - La qualité des enseignants influence positivement la satisfaction des élèves
    - Le stress des élèves réduit leur motivation
    - Le budget affecte les conditions de travail des enseignants
    """
    
    # Check for Mistral API key first, then OpenAI
    api_key = os.environ.get("MISTRAL_API_KEY") or os.environ.get("OPENAI_API_KEY")
    
    # Configure for Mistral AI
    llm_config = None
    if os.environ.get("MISTRAL_API_KEY"):
        llm_config = LLMConfig(
            api_key=os.environ.get("MISTRAL_API_KEY"),
            base_url="https://api.mistral.ai/v1",
            model="mistral-large-latest",  # or "mistral-small-latest", "open-mixtral-8x22b"
            temperature=0.0,
            max_tokens=4096
        )
        logger.info("Using Mistral AI API")
    
    if not api_key:
        logger.warning(
            "OPENAI_API_KEY not found in environment. "
            "Please set it to use the generator."
        )
        print("\n" + "="*60)
        print("DEMO MODE - No API key configured")
        print("="*60)
        print("\nTo use with Mistral AI:")
        print("  set MISTRAL_API_KEY=your-mistral-key")
        print("\nOr for OpenAI:")
        print("  set OPENAI_API_KEY=your-openai-key")
        print("\n" + "="*60)
        
        # Show a sample output instead
        print("\nSample SystemModel structure:")
        from models import SystemModel, EntityModel, ComponentModel, InfluenceModel, SimulationModel
        
        sample = SystemModel(
            entities={
                "Eleves": EntityModel(
                    components={
                        "satisfaction": ComponentModel(
                            type="state",
                            initial=0.6,
                            min=0.0,
                            max=1.0,
                            influences=[
                                InfluenceModel(**{
                                    "from": "Enseignants.qualite",
                                    "coef": 0.4,
                                    "kind": "positive",
                                    "function": "linear",
                                    "enabled": True
                                }),
                                InfluenceModel(**{
                                    "from": "satisfaction",
                                    "coef": -0.1,
                                    "kind": "decay",
                                    "function": "linear",
                                    "enabled": True
                                })
                            ]
                        )
                    }
                )
            },
            simulation=SimulationModel(dt=0.1, steps=300)
        )
        
        print(json.dumps(sample.model_dump(by_alias=True), indent=2))
        return
    
    # Run the generator
    print("\n" + "="*60)
    print("GENERATING SYSTEM MODEL FROM NATURAL LANGUAGE")
    print("="*60)
    print(f"\nInput text:\n{user_text[:200]}...")
    
    try:
        model = generate_system_model(user_text, llm_config=llm_config)
        
        print("\n" + "="*60)
        print("SUCCESS - Generated SystemModel")
        print("="*60)
        
        # Display the result
        output = model.model_dump(by_alias=True)
        print(json.dumps(output, indent=2, ensure_ascii=False))
        
        # Summary
        print("\n" + "-"*40)
        print("Model Summary:")
        print(f"  Entities: {list(model.entities.keys())}")
        
        total_components = 0
        total_influences = 0
        for entity_name, entity in model.entities.items():
            n_components = len(entity.components)
            n_influences = sum(
                len(comp.influences) 
                for comp in entity.components.values()
            )
            total_components += n_components
            total_influences += n_influences
            print(f"  - {entity_name}: {n_components} components, {n_influences} influences")
        
        print(f"  Total: {total_components} components, {total_influences} influences")
        print(f"  Simulation: dt={model.simulation.dt}, steps={model.simulation.steps}")
        
    except ValueError as e:
        logger.error(f"Generation failed: {e}")
        sys.exit(1)
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
