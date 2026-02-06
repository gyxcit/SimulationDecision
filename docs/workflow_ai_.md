# Workflow IA - Génération et Interaction

## Vue d'ensemble

Le système utilise l'IA de deux manières principales :
1. **Génération de modèles** - Transformer du texte en SystemModel
2. **Édition interactive** - Modifier le modèle via chat

## 1. Pipeline de Génération V5 (Single-Shot)

### Principe

Un seul appel LLM avec un prompt structuré génère directement le JSON du modèle.

```
┌─────────────────────────────────────────────────────────────┐
│                    Pipeline V5                               │
│                                                              │
│  Description      ┌─────────────┐      SystemModel          │
│  Utilisateur  ──▶ │   LLM Call  │ ──▶   JSON               │
│  (texte libre)    │  (1 appel)  │      (validé Pydantic)   │
│                   └─────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

### Prompt System (generator.py)

```
Tu es un expert en modélisation de systèmes dynamiques.
Génère un JSON conforme au schéma SystemModel V5.

Règles:
- Valeurs réalistes selon le domaine
- Financial: 10000-1000000
- Population: 10-10000
- Coefficients ajustés selon échelles
...
```

### Temps d'exécution
- **Durée**: 5-15 secondes
- **Tokens**: ~2000-4000

---

## 2. Pipeline de Génération V7 (Multi-Agent)

### Principe

8 agents spécialisés travaillent en séquence, chacun enrichissant l'analyse.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Pipeline V7 Multi-Agent                          │
│                                                                          │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐                 │
│  │ Agent 1 │──▶│ Agent 2 │──▶│ Agent 3 │──▶│ Agent 4 │                 │
│  │Analyzer │   │Explorer │   │Extremes │   │ Impact  │                 │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘                 │
│       │             │             │             │                        │
│       ▼             ▼             ▼             ▼                        │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐                 │
│  │Analysis │   │EntityMap│   │Scenarios│   │ Impact  │                 │
│  │ Output  │   │ Output  │   │ Output  │   │Assessment│                 │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘                 │
│                                                                          │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐                 │
│  │ Agent 5 │──▶│ Agent 6 │──▶│ Agent 7 │──▶│ Agent 8 │                 │
│  │ Refiner │   │Generator│   │ Critic  │   │Reviewer │                 │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘                 │
│       │             │             │             │                        │
│       ▼             ▼             ▼             ▼                        │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐                 │
│  │Refined  │   │ System  │   │Critique │   │ Review  │                 │
│  │Structure│   │  Model  │   │ Output  │   │ Output  │                 │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘                 │
│                                    │                                     │
│                                    ▼                                     │
│                            Validated SystemModel                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Détail des Agents

| Agent | Nom | Input | Output | Rôle |
|-------|-----|-------|--------|------|
| 1 | **Analyzer** | Description texte | `AnalysisOutput` | Comprendre le contexte, identifier acteurs et dynamiques |
| 2 | **Entity Explorer** | Analysis | `EntityMapOutput` | Cartographier les entités et leurs relations causales |
| 3 | **Extreme Generator** | EntityMap | `ScenarioOutput` | Générer des scénarios extrêmes pour stress-test |
| 4 | **Impact Analyst** | Scenarios | `ImpactAssessmentOutput` | Évaluer impacts socio-économiques et politiques |
| 5 | **Refiner** | All previous | `RefinedStructureOutput` | Synthétiser et fusionner tous les inputs |
| 6 | **System Generator** | Refined | `SystemModel` | Construire le JSON V5 final |
| 7 | **Technical Critic** | SystemModel | `CritiqueOutput` | Valider cohérence technique |
| 8 | **Impact Reviewer** | Critique | `ReviewOutput` | Approbation finale ou demande de révision |

### Boucle de Révision

```
                    ┌─────────────────────────┐
                    │                         │
                    ▼                         │
Agent 7 (Critic) ──▶ Agent 8 (Reviewer)      │
                         │                    │
                    ┌────┴────┐               │
                    │Approved?│               │
                    └────┬────┘               │
                    Yes  │  No                │
                    │    │   └────────────────┘
                    ▼         (max 2 iterations)
              Return Model
```

### Temps d'exécution
- **Durée**: 30-90 secondes
- **Tokens**: ~15000-25000 (cumul 8 agents)

---

## 3. Chat IA Interactif

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     AIChatPanel                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Messages Display                      │ │
│  │  ┌─────────┐  ┌─────────────────────────────────────┐   │ │
│  │  │  User   │  │ "Ajoute une entité Marketing"       │   │ │
│  │  └─────────┘  └─────────────────────────────────────┘   │ │
│  │  ┌─────────┐  ┌─────────────────────────────────────┐   │ │
│  │  │   AI    │  │ ✓ Création entité Marketing         │   │ │
│  │  │ Actions │  │ ✓ Ajout composant budget            │   │ │
│  │  └─────────┘  └─────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Input: @Marketing.budget augmente le budget de 20%     │ │
│  │  [@ mentions autocomplete]                              │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Flux de Traitement

```
User Input
    │
    ├── Parse @mentions ──▶ Contexte additionnel
    │
    ▼
POST /chat
    │
    ▼
┌────────────────────────┐
│ AGENT 1: Structure     │
│ - Where to place comp? │
│ - New entity needed?   │
│ - Component types/vals │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│ AGENT 2: Relationships │
│ - What influences?     │
│ - Direction (from→to)  │
│ - Coefficients/kinds   │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│ Combined Actions       │
│ {                      │
│   message: "...",      │
│   actions: [           │
│     add_entity,        │
│     add_component,     │
│     add_influence      │
│   ]                    │
│ }                      │
└──────────┬─────────────┘
           │
           ▼
Frontend: executeAction()
    │
    ├── add_entity
    ├── add_component
    ├── add_influence
    ├── modify
    └── remove_*
```

### Actions Disponibles

| Action | Description | Détails requis |
|--------|-------------|----------------|
| `add_entity` | Ajouter une entité | `name`, `components` |
| `add_component` | Ajouter un composant | `entity`, `name`, `type`, `initial` |
| `add_influence` | Ajouter une influence | `to`, `from`, `coef`, `kind` |
| `modify` | Modifier un paramètre | `target`, `field`, `value` |
| `remove_entity` | Supprimer une entité | `name` |
| `remove_component` | Supprimer un composant | `entity`, `name` |
| `remove_influence` | Supprimer une influence | `target`, `source` |

---

## 4. Analyse d'Impact AI (Dual-Agent System)

### Architecture Dual-Agent

Pour les modifications de modèle (AI Edit et Chat), le système utilise maintenant une approche à **deux agents spécialisés**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Dual-Agent Architecture                              │
│                                                                          │
│  User Request: "Ajouter un composant coûts_énergie qui influence budget" │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    AGENT 1: Structure Analyst                     │   │
│  │                                                                   │   │
│  │  Détermine:                                                       │   │
│  │  - Quel entité existante convient (sémantique)                   │   │
│  │  - Si nouvelle entité nécessaire                                  │   │
│  │  - Nom et type du composant                                       │   │
│  │  - Valeurs initiales appropriées                                  │   │
│  │                                                                   │   │
│  │  Output: {                                                        │   │
│  │    "newComponents": [                                             │   │
│  │      { "entity": "Production", "name": "couts_energie", ... }    │   │
│  │    ]                                                              │   │
│  │  }                                                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                 AGENT 2: Relationship Analyst                     │   │
│  │                                                                   │   │
│  │  Détermine:                                                       │   │
│  │  - Quelles influences créer (from → to)                          │   │
│  │  - Direction causale (qui influence qui)                          │   │
│  │  - Coefficient et type (positive/negative)                        │   │
│  │  - Fonction (linear/exponential/logarithmic)                      │   │
│  │                                                                   │   │
│  │  Output: {                                                        │   │
│  │    "newInfluences": [                                             │   │
│  │      { "from": "Production.couts_energie",                        │   │
│  │        "to": "Enterprise.budget",                                 │   │
│  │        "kind": "negative", "coef": 0.2 }                         │   │
│  │    ]                                                              │   │
│  │  }                                                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│                    Combined Actions List                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Avantages du Dual-Agent

| Aspect | Simple Agent | Dual-Agent |
|--------|--------------|------------|
| Placement composants | Souvent incorrect | Sémantiquement adapté |
| Relations | Manque souvent | Bien définies |
| Direction influences | Souvent inversée | Causalement correcte |
| Coefficients | Génériques | Adaptés au contexte |

### Endpoint `/ai-edit/analyze`

Avant d'appliquer une modification, analyse son impact potentiel avec le dual-agent.

```
Request:
{
  model: {...},
  target: "Enterprise.budget",
  instruction: "Augmenter de 50%"
}

Response:
{
  success: true,
  proposal: {
    changes: [
      {
        target: "Enterprise.budget",
        field: "initial",
        oldValue: 100000,
        newValue: 150000,
        reason: "Augmentation demandée de 50%"
      }
    ],
    requiresOtherChanges: true,
    otherChanges: [
      {
        target: "Enterprise.expenses",
        action: "create",
        componentType: "state",
        initial: 75000,
        description: "Composant pour suivre les dépenses",
        reason: "Maintenir ratio budget/expenses"
      },
      {
        target: "Enterprise.budget",
        action: "add_influence",
        influence: {
          "from": "Production.output",
          "coef": 0.1,
          "kind": "positive"
        },
        reason: "La production influence le budget"
      }
    ]
  }
}
```

### Workflow d'Impact

```
User: "Augmente le budget de 50%"
            │
            ▼
    ┌───────────────────┐
    │ POST /ai-edit/    │
    │     analyze       │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │ LLM Analysis      │
    │ - Target context  │
    │ - Related items   │
    │ - Impact calc     │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │ Proposal          │
    │ - Direct changes  │
    │ - Side effects    │
    │ - Recommendations │
    └─────────┬─────────┘
              │
              ▼
    User Review & Confirm
              │
              ▼
    Apply Changes to Model
```

---

## 5. Configuration LLM

### Providers Supportés

| Provider | Variable Env | Base URL |
|----------|--------------|----------|
| Mistral AI | `MISTRAL_API_KEY` | `https://api.mistral.ai/v1` |
| OpenAI | `OPENAI_API_KEY` | `https://api.openai.com/v1` |
| Ollama | - | `http://localhost:11434/v1` |

### Paramètres

```python
LLMConfig(
    api_key: str,
    base_url: str,
    model: str = "mistral-large-latest",
    temperature: float = 0.0,  # Pour génération
    max_tokens: int = 4096
)
```

### Choix du Modèle

| Tâche | Temperature | Raison |
|-------|-------------|--------|
| Génération modèle | 0.0 | Cohérence, déterminisme |
| Chat interactif | 0.7 | Plus créatif, naturel |
| Analyse d'impact | 0.3 | Balance précision/créativité |

---

## 6. Gestion des Erreurs

### Retries sur Validation

```python
# Chaque agent a max_retries
for attempt in range(max_retries):
    try:
        output = agent.run(input)
        validate(output)  # Pydantic
        return output
    except ValidationError:
        if attempt == max_retries - 1:
            raise
        # Retry with error context
```

### Fallback sur Parse Error

Si le JSON du LLM est mal formé :
1. Essayer de nettoyer (```json, trailing commas)
2. Retry avec prompt corrigé
3. Retourner réponse par défaut

### Exemple de Fallback

```python
try:
    result = json.loads(response)
except JSONDecodeError:
    # Fallback simple
    return AIEditResponse(
        success=True,
        proposal=AIEditProposal(
            changes=[{"target": request.target, ...}],
            requiresOtherChanges=False
        )
    )
```
