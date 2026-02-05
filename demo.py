"""
Complete demo: Generate, Simulate, and Visualize.
"""

import os
from dotenv import load_dotenv
load_dotenv()

from generator import generate_system_model
from llm_client import LLMConfig
from simulation import SimulationEngine, simulate
from visualization import plot_simulation, plot_comparison
import matplotlib.pyplot as plt


def main():
    # Configure Mistral
    llm_config = None
    if os.environ.get("MISTRAL_API_KEY"):
        llm_config = LLMConfig(
            api_key=os.environ.get("MISTRAL_API_KEY"),
            base_url="https://api.mistral.ai/v1",
            model="mistral-large-latest",
            temperature=0.0,
        )
    
    # Generate model
    print("Generating model...")
    model = generate_system_model(
        "Un écosystème avec des Proies et des Prédateurs. "
        "La population de proies croît naturellement mais diminue avec les prédateurs. "
        "Les prédateurs dépendent des proies pour survivre.",
        llm_config=llm_config
    )
    
    print(f"Entities: {list(model.entities.keys())}")
    
    # Run simulations with different parameters
    print("\nRunning simulations...")
    
    baseline = simulate(model, steps=100)
    
    # Find first variable
    var = list(baseline.final_state.keys())[0]
    
    high_initial = simulate(
        model,
        parameter_changes={var: 0.9},
        steps=100
    )
    
    # Compare
    results = {
        "Baseline": baseline,
        "High Initial": high_initial,
    }
    
    # Plot
    plot_comparison(results, var, title=f"Comparison: {var}")
    plt.savefig("comparison.png", dpi=150)
    print("\nSaved: comparison.png")
    
    plot_simulation(baseline, title="Baseline Simulation")
    plt.savefig("simulation.png", dpi=150)
    print("Saved: simulation.png")
    
    print("\nDone!")


if __name__ == "__main__":
    main()
