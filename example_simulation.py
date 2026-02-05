"""
Example: Run simulation with parameter changes.

Demonstrates how to:
1. Generate a SystemModel from natural language
2. Run simulations with different parameters
3. Compare results
"""

import json
import os
from dotenv import load_dotenv

load_dotenv()

from generator import generate_system_model
from llm_client import LLMConfig
from simulation import SimulationEngine, simulate


def main():
    """Run simulation example with parameter variations."""
    
    # Simple system description
    user_text = """
    Modélise une usine avec:
    - Les Ouvriers: productivité (influencée par moral), moral (influencé par salaire)
    - La Direction: budget (constant), salaire (dépend du budget)
    
    La productivité des ouvriers influence le profit global.
    """
    
    # Configure Mistral if available
    llm_config = None
    if os.environ.get("MISTRAL_API_KEY"):
        llm_config = LLMConfig(
            api_key=os.environ.get("MISTRAL_API_KEY"),
            base_url="https://api.mistral.ai/v1",
            model="mistral-large-latest",
            temperature=0.0,
            max_tokens=4096
        )
    
    print("=" * 60)
    print("GENERATING SYSTEM MODEL")
    print("=" * 60)
    
    model = generate_system_model(user_text, llm_config=llm_config)
    
    print("\nEntities:", list(model.entities.keys()))
    for entity_name, entity in model.entities.items():
        print(f"\n{entity_name}:")
        for comp_name, comp in entity.components.items():
            print(f"  - {comp_name}: {comp.type}, initial={comp.initial}")
    
    # Create simulation engine
    engine = SimulationEngine(model)
    
    print("\n" + "=" * 60)
    print("SIMULATION 1: Baseline")
    print("=" * 60)
    
    # Run baseline simulation
    result1 = engine.run(steps=50)
    
    print(f"\nSimulation completed: {result1.metadata['steps']} steps")
    print("\nFinal state:")
    for var, val in result1.final_state.items():
        print(f"  {var}: {val:.4f}")
    
    # Reset and run with modified parameters
    engine.reset()
    
    print("\n" + "=" * 60)
    print("SIMULATION 2: With parameter changes")
    print("=" * 60)
    
    # Find a variable to modify
    variables = engine.get_variables()
    print(f"\nAvailable variables: {variables}")
    
    # Try to modify the first state variable
    for var in variables:
        influences = engine.get_influences_for(var)
        if influences:
            print(f"\nModifying {var}:")
            print(f"  Original influences: {influences}")
            
            # Boost the initial value
            original = engine.get_state()[var]
            engine.set_parameter(var, min(1.0, original + 0.2))
            print(f"  Changed initial: {original:.2f} -> {engine.get_state()[var]:.2f}")
            break
    
    result2 = engine.run(steps=50)
    
    print(f"\nSimulation completed: {result2.metadata['steps']} steps")
    print("\nFinal state (modified):")
    for var, val in result2.final_state.items():
        diff = val - result1.final_state.get(var, 0)
        sign = "+" if diff >= 0 else ""
        print(f"  {var}: {val:.4f} ({sign}{diff:.4f})")
    
    # Compare scenarios using convenience function
    print("\n" + "=" * 60)
    print("SIMULATION 3: Using simulate() convenience function")
    print("=" * 60)
    
    # Run with different initial conditions
    result3 = simulate(
        model,
        parameter_changes={variables[0]: 0.9} if variables else None,
        steps=50
    )
    
    print(f"\nSimulation with {variables[0] if variables else 'no'} = 0.9")
    print("Final state:")
    for var, val in result3.final_state.items():
        print(f"  {var}: {val:.4f}")
    
    print("\n" + "=" * 60)
    print("DONE")
    print("=" * 60)


if __name__ == "__main__":
    main()
