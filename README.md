# Industrial AI - Simulation System V5/V7

Pipeline complet pour convertir du texte naturel en modèles dynamiques simulables.

**NEW:** Multi-Agent System V7 with 8 specialized agents for enhanced model generation!

## Installation

```bash
pip install pydantic openai python-dotenv matplotlib fastapi uvicorn
```

## Configuration

Créez un fichier `.env` :
```
MISTRAL_API_KEY=votre-clé-mistral
```

## Usage

### V5 Pipeline (Single-LLM, Fast)

```python
from generator import generate_system_model
from simulation import simulate
from visualization import plot_simulation

# 1. Générer un modèle depuis du texte
model = generate_system_model("""
    Un système avec des Élèves et des Enseignants.
    La satisfaction des élèves dépend de la qualité des enseignants.
""")

# 2. Simuler avec modifications de paramètres
result = simulate(
    model,
    parameter_changes={"Eleves.satisfaction": 0.8},
    steps=100
)

# 3. Visualiser
plot_simulation(result)
```

### V7 Pipeline (Multi-Agent, Thorough)

```python
from orchestrator import build_system_model

# Generate using 8-agent pipeline with validation
model = build_system_model("""
    A school system with students and teachers where
    satisfaction depends on teaching quality and class size.
    Consider social, economic, and policy impacts.
""")
```

#### V7 Architecture

The V7 pipeline uses 8 specialized agents:

1. **Analyzer** - Extracts concepts, goals, assumptions
2. **Entity Explorer** - Maps causal relationships
3. **Extreme Generator** - Generates stress test scenarios
4. **Impact Analyst** - Assesses social/economic/policy impacts
5. **Refiner** - Synthesizes and optimizes structure
6. **System Generator** - Converts to V5 JSON schema
7. **Technical Critic** - Validates for technical issues
8. **Impact Reviewer** - Final approval decision

### API Usage

```bash
# Start the API server
uvicorn api:app --reload --host 0.0.0.0 --port 8000

# V5 generation (default, fast)
curl -X POST "http://localhost:8000/generate" \
  -H "Content-Type: application/json" \
  -d '{"description": "A factory with workers..."}'

# V7 generation (multi-agent, thorough)
curl -X POST "http://localhost:8000/generate?use_v7=true" \
  -H "Content-Type: application/json" \
  -d '{"description": "A factory with workers..."}'
```

## Modules

| Module | Description |
|--------|-------------|
| `models.py` | Schémas Pydantic V5 |
| `generator.py` | Pipeline LLM → SystemModel (V5) |
| `orchestrator.py` | Multi-Agent Pipeline (V7) |
| `agents/` | 8 specialized agents for V7 |
| `simulation.py` | Moteur Euler explicite |
| `visualization.py` | Graphiques matplotlib |
| `export.py` | Export JSON/CSV |
| `api.py` | REST API with V5/V7 support |

## Tests

```bash
# Test V5 pipeline
python -m pytest test_generator.py -v

# Test V7 pipeline
python -m pytest test_orchestrator.py -v

# Run example
python example_v7.py
```

## Architecture V5

- **Entités** : acteurs macro (Élèves, Enseignants...)
- **Composants** : variables mesurables (satisfaction, motivation...)
- **Influences** : relations atomiques avec coefficients

## Licence

MIT

