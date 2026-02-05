"""
Example usage of Multi-Agent System V7.

Demonstrates the V7 pipeline with a sample system description
and compares with V5 output.
"""

import logging
import json
from dotenv import load_dotenv

load_dotenv()

# Configure logging to see agent progress
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

from orchestrator import build_system_model
from generator import generate_system_model
from llm_client import LLMConfig
import os


def main():
    """Run example V7 pipeline."""
    
    # Check if API key is configured
    if not os.getenv("MISTRAL_API_KEY") and not os.getenv("OPENAI_API_KEY"):
        print("ERROR: No API key configured!")
        print("Set MISTRAL_API_KEY or OPENAI_API_KEY in .env")
        return
    
    # Sample system description
    user_input = """
    A school system with students and teachers.
    Student satisfaction depends on teaching quality and class size.
    Teacher motivation depends on student engagement and administrative support.
    The system should model how changes in resources affect overall outcomes.
    """
    
    print("=" * 80)
    print("MULTI-AGENT SYSTEM V7 - EXAMPLE")
    print("=" * 80)
    print(f"\nInput:\n{user_input}\n")
    
    # Get LLM config
    if os.getenv("MISTRAL_API_KEY"):
        llm_config = LLMConfig(
            api_key=os.getenv("MISTRAL_API_KEY"),
            base_url="https://api.mistral.ai/v1",
            model="mistral-large-latest",
            temperature=0.0
        )
    else:
        llm_config = None  # Use default OpenAI
    
    print("\n" + "=" * 80)
    print("Running V7 Pipeline (Multi-Agent)")
    print("=" * 80 + "\n")
    
    try:
        # Generate using V7
        model_v7 = build_system_model(user_input, llm_config=llm_config)
        
        print("\n" + "=" * 80)
        print("V7 RESULT")
        print("=" * 80)
        print(json.dumps(model_v7.model_dump(by_alias=True), indent=2))
        
        print("\n" + "=" * 80)
        print("V7 SUCCESS - Model generated and validated!")
        print("=" * 80)
        
    except Exception as e:
        print(f"\nV7 FAILED: {str(e)}")
        return
    
    print("\n" + "=" * 80)
    print("Running V5 Pipeline (Single-LLM) for comparison")
    print("=" * 80 + "\n")
    
    try:
        # Generate using V5
        model_v5 = generate_system_model(user_input, llm_config=llm_config)
        
        print("\n" + "=" * 80)
        print("V5 RESULT")
        print("=" * 80)
        print(json.dumps(model_v5.model_dump(by_alias=True), indent=2))
        
    except Exception as e:
        print(f"\nV5 FAILED: {str(e)}")
    
    print("\n" + "=" * 80)
    print("COMPARISON")
    print("=" * 80)
    print(f"V7 Entities: {len(model_v7.entities)}")
    print(f"V5 Entities: {len(model_v5.entities)}")
    print(f"\nV7 Total Components: {sum(len(e.components) for e in model_v7.entities.values())}")
    print(f"V5 Total Components: {sum(len(e.components) for e in model_v5.entities.values())}")
    
    # Count influences
    v7_influences = sum(
        sum(len(c.influences) for c in e.components.values())
        for e in model_v7.entities.values()
    )
    v5_influences = sum(
        sum(len(c.influences) for c in e.components.values())
        for e in model_v5.entities.values()
    )
    
    print(f"\nV7 Total Influences: {v7_influences}")
    print(f"V5 Total Influences: {v5_influences}")


if __name__ == "__main__":
    main()
