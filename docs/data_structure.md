# Structures de Données

## Vue d'Ensemble

Le système utilise une hiérarchie de modèles pour représenter les systèmes dynamiques.

```
SystemModel
├── entities: Dict[str, EntityModel]
│   └── EntityModel
│       └── components: Dict[str, ComponentModel]
│           └── ComponentModel
│               ├── type: "state" | "computed" | "constant"
│               ├── initial: float
│               ├── min: float | null
│               ├── max: float | null
│               └── influences: List[InfluenceModel]
│                   └── InfluenceModel
│                       ├── from: str
│                       ├── coef: float
│                       ├── kind: "positive" | "negative" | "decay" | "ratio"
│                       ├── function: "linear" | "sigmoid" | "threshold" | "division"
│                       └── enabled: bool
└── simulation: SimulationModel
    ├── dt: float
    └── steps: int
```

---

## 1. SystemModel (Modèle Racine)

```python
class SystemModel(BaseModel):
    """
    Modèle racine représentant le système complet.
    """
    entities: Dict[str, EntityModel]  # Nom → Définition
    simulation: SimulationModel        # Config simulation
```

### Exemple JSON

```json
{
  "entities": {
    "Entreprise": { ... },
    "Marche": { ... }
  },
  "simulation": {
    "dt": 0.1,
    "steps": 300
  }
}
```

---

## 2. EntityModel (Entité/Acteur)

```python
class EntityModel(BaseModel):
    """
    Représente un acteur macro dans le système.
    Ex: Entreprise, Client, Marché, Gouvernement
    """
    components: Dict[str, ComponentModel]  # Nom composant → Définition
```

### Exemple JSON

```json
{
  "Entreprise": {
    "components": {
      "budget": { ... },
      "effectif": { ... },
      "satisfaction_employes": { ... }
    }
  }
}
```

### Conventions de Nommage

| Type | Convention | Exemples |
|------|------------|----------|
| Entité | PascalCase, singulier | `Entreprise`, `Client`, `Marche` |
| Composant | snake_case | `budget`, `satisfaction_client`, `taux_croissance` |

---

## 3. ComponentModel (Composant/Variable)

```python
class ComponentModel(BaseModel):
    """
    Variable mesurable au sein d'une entité.
    """
    type: Literal["state", "computed", "constant"]
    initial: float
    min: Optional[float] = None
    max: Optional[float] = None
    influences: List[InfluenceModel] = []
```

### Types de Composants

| Type | Description | Comportement |
|------|-------------|--------------|
| `state` | Variable d'état | Intégrée dans le temps (Euler) |
| `computed` | Variable calculée | Évaluée algébriquement à chaque pas |
| `constant` | Constante | Valeur fixe, non modifiée par simulation |

### Exemple JSON

```json
{
  "budget": {
    "type": "state",
    "initial": 100000,
    "min": 0,
    "max": 1000000,
    "influences": [
      {
        "from": "Entreprise.revenus",
        "coef": 0.3,
        "kind": "positive",
        "function": "linear",
        "enabled": true
      }
    ]
  }
}
```

### Plages de Valeurs Recommandées

| Domaine | Min | Max | Exemples |
|---------|-----|-----|----------|
| Financier | 0 | 10M+ | budget, revenus, coûts |
| Population | 0 | 100M | employés, clients |
| Ratio/Taux | 0.0 | 1.0 | satisfaction, efficacité |
| Pourcentage | 0 | 100 | taux_croissance |
| Quantité | 0 | ∞ | stock, production |

---

## 4. InfluenceModel (Relation Causale)

```python
class InfluenceModel(BaseModel):
    """
    Relation d'influence entre deux composants.
    """
    from_: str = Field(..., alias="from")  # Source "Entity.component"
    coef: float                             # Coefficient multiplicateur
    kind: Literal["positive", "negative", "decay", "ratio"]
    function: Literal["linear", "sigmoid", "threshold", "division"]
    enabled: bool = True
```

### Types d'Influence (kind)

| Kind | Description | Effet |
|------|-------------|-------|
| `positive` | Influence positive | Source élevée → Cible augmente |
| `negative` | Influence négative | Source élevée → Cible diminue |
| `decay` | Décroissance | Auto-influence réductrice (mort naturelle) |
| `ratio` | Ratio/Division | Utilisé avec fonction `division` |

### Fonctions Mathématiques

| Function | Formule | Usage |
|----------|---------|-------|
| `linear` | `coef × x` | Relations proportionnelles |
| `sigmoid` | `coef × σ(x)` | Saturation, seuils doux |
| `threshold` | `coef if x > 0.5 else 0` | Effet à seuil |
| `division` | `coef / (1 + x)` | Ratios, rendements décroissants |

### Exemple JSON

```json
{
  "from": "Marche.demande",
  "coef": 0.15,
  "kind": "positive",
  "function": "linear",
  "enabled": true
}
```

### Conventions pour `from`

| Format | Signification |
|--------|---------------|
| `Entity.component` | Composant d'une autre entité |
| `self` | Le composant lui-même (decay) |
| `component_name` | Composant dans la même entité |

---

## 5. SimulationModel (Configuration)

```python
class SimulationModel(BaseModel):
    """
    Paramètres de simulation Euler.
    """
    dt: float = 0.1    # Pas de temps
    steps: int = 300   # Nombre d'itérations
```

### Choix du dt

| Unité représentée | dt suggéré | Exemple |
|-------------------|------------|---------|
| Seconde | 0.001-0.01 | Systèmes physiques rapides |
| Minute | 0.1-1 | Processus industriels |
| Heure | 1-10 | Flux logistiques |
| Jour | 1-100 | Économie quotidienne |
| Mois | 1 (= 1 mois) | Business trimestriel |
| Année | 1 | Planification long terme |

---

## 6. SimulationResult (Résultat)

```python
@dataclass
class SimulationResult:
    """
    Résultats d'une simulation.
    """
    history: List[Dict[str, float]]  # [{"Entity.comp": value}, ...]
    time_points: List[float]          # [0, dt, 2*dt, ...]
    final_state: Dict[str, float]     # État à t=final
    metadata: Dict[str, Any] = {}     # Info additionnelle
```

### Structure history

```json
[
  // t = 0
  {
    "Entreprise.budget": 100000,
    "Entreprise.effectif": 50,
    "Marche.demande": 1000
  },
  // t = dt
  {
    "Entreprise.budget": 101500,
    "Entreprise.effectif": 51,
    "Marche.demande": 1020
  },
  // ...
]
```

---

## 7. Types Frontend (TypeScript)

### Fichier: `types/index.ts`

```typescript
export type InfluenceKind = "positive" | "negative" | "decay" | "ratio";
export type InfluenceFunction = "linear" | "sigmoid" | "threshold" | "division";
export type ComponentType = "state" | "computed" | "constant";

export interface Influence {
    from: string;
    coef: number;
    kind: InfluenceKind;
    function: InfluenceFunction;
    enabled: boolean;
}

export interface Component {
    type: ComponentType;
    initial: number;
    min?: number | null;
    max?: number | null;
    influences: Influence[];
    value?: number; // Runtime value
}

export interface Entity {
    components: Record<string, Component>;
}

export interface SimulationConfig {
    dt: number;
    steps: number;
}

export interface SystemModel {
    entities: Record<string, Entity>;
    simulation: SimulationConfig;
}

export interface SimulationResult {
    time_points: number[];
    history: Record<string, number>[];
    final_state: Record<string, number>;
}
```

---

## 8. Exemple Complet

### Système: Entreprise-Marché

```json
{
  "entities": {
    "Entreprise": {
      "components": {
        "budget": {
          "type": "state",
          "initial": 500000,
          "min": 0,
          "max": 10000000,
          "influences": [
            {
              "from": "Entreprise.revenus",
              "coef": 0.8,
              "kind": "positive",
              "function": "linear",
              "enabled": true
            },
            {
              "from": "Entreprise.couts",
              "coef": -1.0,
              "kind": "negative",
              "function": "linear",
              "enabled": true
            }
          ]
        },
        "revenus": {
          "type": "state",
          "initial": 100000,
          "min": 0,
          "max": null,
          "influences": [
            {
              "from": "Marche.demande",
              "coef": 0.05,
              "kind": "positive",
              "function": "linear",
              "enabled": true
            },
            {
              "from": "Entreprise.qualite_produit",
              "coef": 0.3,
              "kind": "positive",
              "function": "sigmoid",
              "enabled": true
            }
          ]
        },
        "couts": {
          "type": "computed",
          "initial": 80000,
          "min": 0,
          "max": null,
          "influences": [
            {
              "from": "Entreprise.effectif",
              "coef": 3000,
              "kind": "positive",
              "function": "linear",
              "enabled": true
            }
          ]
        },
        "effectif": {
          "type": "state",
          "initial": 25,
          "min": 1,
          "max": 1000,
          "influences": []
        },
        "qualite_produit": {
          "type": "state",
          "initial": 0.7,
          "min": 0,
          "max": 1,
          "influences": [
            {
              "from": "Entreprise.budget",
              "coef": 0.000001,
              "kind": "positive",
              "function": "sigmoid",
              "enabled": true
            }
          ]
        }
      }
    },
    "Marche": {
      "components": {
        "demande": {
          "type": "state",
          "initial": 5000,
          "min": 0,
          "max": 100000,
          "influences": [
            {
              "from": "self",
              "coef": 0.02,
              "kind": "positive",
              "function": "linear",
              "enabled": true
            },
            {
              "from": "Marche.prix_moyen",
              "coef": -0.1,
              "kind": "negative",
              "function": "linear",
              "enabled": true
            }
          ]
        },
        "prix_moyen": {
          "type": "constant",
          "initial": 50,
          "min": 10,
          "max": 500,
          "influences": []
        }
      }
    }
  },
  "simulation": {
    "dt": 1,
    "steps": 365
  }
}
```

---

## 9. Validation et Contraintes

### Pydantic Validation

```python
# Automatique via Pydantic BaseModel
model = SystemModel.model_validate(json_data)
```

### Contraintes Métier

| Règle | Description |
|-------|-------------|
| Noms uniques | Pas deux entités/composants avec même nom |
| From valide | `from` doit référencer un composant existant ou `self` |
| Bornes cohérentes | `min < max` si les deux définis |
| Initial dans bornes | `min <= initial <= max` |
| Coef raisonnable | Éviter valeurs extrêmes (>1000 ou <0.0001) |
