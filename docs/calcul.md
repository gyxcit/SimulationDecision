# Calculs et Simulation

## Vue d'Ensemble

Le moteur de simulation utilise la **méthode d'Euler explicite** pour intégrer les systèmes d'équations différentielles ordinaires (ODE).

```
x(t + dt) = x(t) + dt × f(x(t))
```

Où `f(x)` représente la dérivée calculée à partir des influences.

---

## 1. Algorithme Principal

### Pseudo-code

```
INITIALISER état avec valeurs initiales
POUR step = 0 À steps-1:
    POUR chaque variable de type "state":
        dérivée = CALCULER_DERIVEE(variable)
        nouvelle_valeur = état[variable] + dt × dérivée
        nouvelle_valeur = APPLIQUER_BORNES(nouvelle_valeur, min, max)
        état[variable] = nouvelle_valeur
    
    POUR chaque variable de type "computed":
        état[variable] = CALCULER_COMPUTED(variable)
    
    SAUVEGARDER état dans history
    
RETOURNER history, time_points, final_state
```

### Code Python (simulation.py)

```python
def step(self, dt: float) -> None:
    """Execute one Euler integration step."""
    new_state = self._state.copy()
    
    # Update state variables
    for variable, meta in self._variable_metadata.items():
        if meta["type"] == "state":
            derivative = self._compute_derivative(variable)
            new_value = self._state[variable] + dt * derivative
            
            # Apply bounds
            if meta["min"] is not None:
                new_value = max(meta["min"], new_value)
            if meta["max"] is not None:
                new_value = min(meta["max"], new_value)
            
            new_state[variable] = new_value
    
    # Update computed variables
    for variable, meta in self._variable_metadata.items():
        if meta["type"] == "computed":
            new_state[variable] = self._compute_value(variable)
    
    self._state = new_state
```

---

## 2. Calcul des Dérivées

### Formule Générale

Pour une variable `y` avec des influences `I₁, I₂, ..., Iₙ`:

```
dy/dt = Σ f_i(source_i) × coef_i × sign_i
```

Où:
- `f_i` est la fonction de l'influence (linear, sigmoid, etc.)
- `source_i` est la valeur de la variable source
- `coef_i` est le coefficient
- `sign_i` dépend du `kind` (+1 pour positive, -1 pour negative)

### Code Python

```python
def _compute_derivative(self, variable: str) -> float:
    """Compute the derivative for a state variable."""
    meta = self._variable_metadata[variable]
    derivative = 0.0
    
    for influence in meta["influences"]:
        if not influence.enabled:
            continue
        
        # Get source value
        source_value = self._get_source_value(influence.from_, variable)
        
        # Apply influence function
        func = INFLUENCE_FUNCTIONS.get(influence.function, linear)
        contribution = func(source_value, influence.coef)
        
        # Apply kind modifier
        if influence.kind == "negative":
            contribution = -contribution
        elif influence.kind == "decay":
            contribution = -contribution  # Decay is negative by nature
        
        derivative += contribution
    
    return derivative
```

---

## 3. Fonctions d'Influence

### Linear (Défaut)

```python
def linear(x: float, coef: float) -> float:
    """f(x) = coef × x"""
    return coef * x
```

**Usage**: Relations proportionnelles directes

**Graphe**:
```
    y
    │    /
    │   /
    │  /
    │ /
    └────────── x
```

### Sigmoid

```python
def sigmoid(x: float, coef: float) -> float:
    """f(x) = coef × σ(5(x - 0.5))
    
    Sigmoid centré sur 0.5, pente raide.
    """
    try:
        return coef * (1.0 / (1.0 + math.exp(-5 * (x - 0.5))))
    except OverflowError:
        return coef if x > 0.5 else 0.0
```

**Usage**: Effets avec saturation, seuils progressifs

**Graphe**:
```
    y
    │        ────────
    │      /
    │     │
    │    /
    └────────── x
       0.5
```

### Threshold

```python
def threshold(x: float, coef: float, threshold_value: float = 0.5) -> float:
    """f(x) = coef if x > threshold else 0"""
    return coef if x > threshold_value else 0.0
```

**Usage**: Effets à seuil net (activation/désactivation)

**Graphe**:
```
    y
    │        ──────
    │        │
    │        │
    │________│
    └────────┴───── x
           0.5
```

### Division

```python
def division(x: float, coef: float) -> float:
    """f(x) = coef / (1 + x)"""
    return coef / (1.0 + x)
```

**Usage**: Rendements décroissants, ratios

**Graphe**:
```
    y
    │\
    │ \
    │  \_____
    │
    └────────── x
```

---

## 4. Types de Variables

### State (Variable d'État)

- **Intégration**: Euler explicite
- **Mise à jour**: À chaque pas de temps
- **Formule**: `x(t+dt) = x(t) + dt × dx/dt`

### Computed (Variable Calculée)

- **Intégration**: Aucune (algébrique)
- **Mise à jour**: Recalculée à chaque pas
- **Formule**: `y = f(autres_variables)`

```python
def _compute_value(self, variable: str) -> float:
    """Compute value for computed variables."""
    meta = self._variable_metadata[variable]
    value = 0.0
    
    for influence in meta["influences"]:
        if not influence.enabled:
            continue
        source_value = self._get_source_value(influence.from_, variable)
        func = INFLUENCE_FUNCTIONS.get(influence.function, linear)
        value += func(source_value, influence.coef)
    
    return value
```

### Constant

- **Intégration**: Aucune
- **Mise à jour**: Jamais (sauf modification manuelle)
- **Usage**: Paramètres du système

---

## 5. Résolution des Références

### Format des Références

| Format | Signification |
|--------|---------------|
| `Entity.component` | Composant spécifique |
| `self` | Le composant lui-même |
| `component_name` | Dans la même entité |

### Code de Résolution

```python
def _get_source_value(self, from_spec: str, current_var: str) -> float:
    """Resolve a 'from' reference to a value."""
    
    # Self reference
    if from_spec == "self":
        return self._state[current_var]
    
    # Full path (Entity.component)
    if "." in from_spec:
        return self._state.get(from_spec, 0.0)
    
    # Same entity reference
    entity_name = current_var.split(".")[0]
    full_path = f"{entity_name}.{from_spec}"
    return self._state.get(full_path, 0.0)
```

---

## 6. Application des Bornes

### Contraintes Min/Max

```python
if meta["min"] is not None:
    new_value = max(meta["min"], new_value)
if meta["max"] is not None:
    new_value = min(meta["max"], new_value)
```

### Comportement

| Situation | Résultat |
|-----------|----------|
| `value < min` | `value = min` |
| `value > max` | `value = max` |
| `min <= value <= max` | Inchangé |

---

## 7. Exemple de Calcul Détaillé

### Système Simple

```json
{
  "Predateur": {
    "population": {
      "type": "state",
      "initial": 10,
      "influences": [
        {"from": "Predateur.population", "coef": 0.1, "kind": "positive"},
        {"from": "Proie.population", "coef": 0.02, "kind": "positive"}
      ]
    }
  },
  "Proie": {
    "population": {
      "type": "state",
      "initial": 100,
      "influences": [
        {"from": "self", "coef": 0.05, "kind": "positive"},
        {"from": "Predateur.population", "coef": -0.5, "kind": "negative"}
      ]
    }
  }
}
```

### Calcul à t=0, dt=0.1

**État initial:**
- `Predateur.population = 10`
- `Proie.population = 100`

**Dérivée Predateur.population:**
```
dP/dt = 0.1 × 10 + 0.02 × 100
      = 1 + 2
      = 3
```

**Dérivée Proie.population:**
```
dpr/dt = 0.05 × 100 + (-1) × 0.5 × 10
       = 5 - 5
       = 0
```

**Nouvel état (t=0.1):**
```
Predateur.population = 10 + 0.1 × 3 = 10.3
Proie.population = 100 + 0.1 × 0 = 100
```

---

## 8. Stabilité Numérique

### Choix de dt

Le pas de temps `dt` doit être suffisamment petit pour garantir la stabilité:

```
dt < 1 / (max_eigenvalue)
```

En pratique:
- **Système rapide**: `dt = 0.001 - 0.01`
- **Système modéré**: `dt = 0.1 - 1`
- **Système lent**: `dt = 1 - 10`

### Problèmes Courants

| Symptôme | Cause Probable | Solution |
|----------|----------------|----------|
| Valeurs explosent | dt trop grand | Réduire dt |
| Oscillations | Coefficients trop élevés | Réduire coef |
| Valeurs négatives | Manque de borne min | Ajouter min: 0 |
| Saturation rapide | Coefficients mal calibrés | Ajuster échelles |

---

## 9. Modification de Paramètres en Cours

### API

```python
engine.set_parameter("Entity.component", new_value)
engine.set_influence_coef("target", "source", new_coef)
engine.toggle_influence("target", "source", enabled=False)
```

### Application

Les modifications prennent effet au prochain pas de simulation.

---

## 10. Format des Résultats

### Structure

```python
SimulationResult(
    history=[
        {"Pred.pop": 10, "Proie.pop": 100},     # t=0
        {"Pred.pop": 10.3, "Proie.pop": 100},   # t=0.1
        {"Pred.pop": 10.62, "Proie.pop": 99.8}, # t=0.2
        # ...
    ],
    time_points=[0, 0.1, 0.2, ...],
    final_state={"Pred.pop": 45.2, "Proie.pop": 23.1}
)
```

### Accès aux Données

```python
# Série temporelle d'une variable
values = result.get_variable_history("Predateur.population")

# Toutes les variables d'une entité
entity_data = result.get_entity_history("Predateur")
# => {"population": [10, 10.3, 10.62, ...]}
```

---

## 11. Comparaison Multi-Scénarios

### Endpoint /compare

```python
result = simulate(
    model,
    parameter_changes={"Entity.param": new_value},
    steps=100
)
```

### Batch Simulation

```python
configs = [
    {"id": "base", "parameter_overrides": {}},
    {"id": "high", "parameter_overrides": {"Ent.param": 200}},
    {"id": "low", "parameter_overrides": {"Ent.param": 50}}
]

results = run_batch(base_model, configs)
```
