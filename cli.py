"""
Interactive CLI for running simulations.
"""

import os
import json
from dotenv import load_dotenv
load_dotenv()

from generator import generate_system_model
from llm_client import LLMConfig
from simulation import SimulationEngine
from export import export_to_json, export_to_csv


def get_llm_config():
    if os.environ.get("MISTRAL_API_KEY"):
        return LLMConfig(
            api_key=os.environ.get("MISTRAL_API_KEY"),
            base_url="https://api.mistral.ai/v1",
            model="mistral-large-latest",
            temperature=0.0,
        )
    return None


def main():
    print("=" * 60)
    print("INDUSTRIAL AI - SIMULATION INTERACTIVE")
    print("=" * 60)
    
    # Get user description
    print("\nDécrivez votre système (terminez par une ligne vide):")
    lines = []
    while True:
        line = input()
        if line == "":
            break
        lines.append(line)
    
    user_text = "\n".join(lines)
    
    if not user_text.strip():
        print("Aucune description fournie. Sortie.")
        return
    
    # Generate model
    print("\nGénération du modèle...")
    model = generate_system_model(user_text, llm_config=get_llm_config())
    
    print(f"\nEntités: {list(model.entities.keys())}")
    engine = SimulationEngine(model)
    
    # Interactive loop
    while True:
        print("\n" + "-" * 40)
        print("Commandes: run, set, get, export, quit")
        cmd = input("> ").strip().lower()
        
        if cmd == "quit" or cmd == "q":
            break
        elif cmd == "run":
            steps = input("Steps (100): ").strip()
            steps = int(steps) if steps else 100
            result = engine.run(steps=steps)
            print(f"\nSimulation terminée. État final:")
            for var, val in result.final_state.items():
                print(f"  {var}: {val:.4f}")
        elif cmd == "set":
            var = input("Variable: ").strip()
            val = float(input("Valeur: ").strip())
            try:
                engine.set_parameter(var, val)
                print(f"OK: {var} = {val}")
            except ValueError as e:
                print(f"Erreur: {e}")
        elif cmd == "get":
            state = engine.get_state()
            for var, val in state.items():
                print(f"  {var}: {val:.4f}")
        elif cmd == "export":
            result = engine.run(steps=100)
            export_to_json(result, "results.json")
            export_to_csv(result, "results.csv")
            print("Exporté: results.json, results.csv")
        elif cmd == "reset":
            engine.reset()
            print("Simulation réinitialisée.")
        else:
            print("Commande inconnue.")
    
    print("\nAu revoir!")


if __name__ == "__main__":
    main()
