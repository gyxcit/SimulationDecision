# Industrial AI - Simulation System V5

Pipeline complet pour convertir du texte naturel en modèles dynamiques simulables.

## Installation

```bash
pip install pydantic openai python-dotenv matplotlib
```

## Configuration

Créez un fichier `.env` :
```
MISTRAL_API_KEY=votre-clé-mistral
```

## Usage

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

## Modules

| Module | Description |
|--------|-------------|
| `models.py` | Schémas Pydantic V5 |
| `generator.py` | Pipeline LLM → SystemModel |
| `simulation.py` | Moteur Euler explicite |
| `visualization.py` | Graphiques matplotlib |
| `export.py` | Export JSON/CSV |

## Tests

```bash
python -m pytest test_generator.py -v
```

## Architecture V5

- **Entités** : acteurs macro (Élèves, Enseignants...)
- **Composants** : variables mesurables (satisfaction, motivation...)
- **Influences** : relations atomiques avec coefficients

## Licence

MIT
