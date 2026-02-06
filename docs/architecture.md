# Architecture du Système Industrial AI

## Vue d'ensemble

Le système Industrial AI est une application de modélisation et simulation de systèmes dynamiques. Elle permet de générer des modèles à partir de descriptions en langage naturel et de les simuler.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React/TypeScript)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   Canvas    │  │  Inspector  │  │ Simulation  │  │   AI Chat       │ │
│  │  (ReactFlow)│  │  (Params)   │  │   Results   │  │   Panel         │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │
│                              │ Zustand Store │                           │
└──────────────────────────────┼───────────────┼───────────────────────────┘
                               │               │
                         HTTP/REST API (axios)
                               │               │
┌──────────────────────────────┼───────────────┼───────────────────────────┐
│                           BACKEND (FastAPI/Python)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Generator  │  │ Orchestrator│  │  Simulation │  │   AI Edit       │ │
│  │    (V5)     │  │    (V7)     │  │   Engine    │  │   Endpoints     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │
│                              │ LLM Client │                              │
└──────────────────────────────┼─────────────┼─────────────────────────────┘
                               │             │
                    ┌──────────┴─────────────┴──────────┐
                    │      External LLM APIs            │
                    │  (Mistral AI / OpenAI / Ollama)   │
                    └───────────────────────────────────┘
```

## Stack Technologique

### Frontend
| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 18.x | Framework UI |
| TypeScript | 5.x | Typage statique |
| Zustand | - | Gestion d'état |
| ReactFlow/xyflow | - | Canvas interactif |
| Recharts | - | Graphiques |
| Tailwind CSS | - | Styles |
| Axios | - | Client HTTP |
| Lucide React | - | Icônes |

### Backend
| Technologie | Version | Usage |
|-------------|---------|-------|
| Python | 3.10+ | Langage |
| FastAPI | - | Framework API |
| Pydantic | 2.x | Validation données |
| httpx | - | Client HTTP async |

## Modules Backend

### Core Modules

| Module | Fichier | Description |
|--------|---------|-------------|
| **Models** | `models.py` | Schémas Pydantic V5 (SystemModel, EntityModel, etc.) |
| **Generator** | `generator.py` | Pipeline LLM → SystemModel (V5 single-shot) |
| **Orchestrator** | `orchestrator.py` | Pipeline Multi-Agent V7 (8 agents) |
| **Simulation** | `simulation.py` | Moteur Euler explicite |
| **API** | `api.py` | Endpoints REST FastAPI |
| **LLM Client** | `llm_client.py` | Abstraction LLM (Mistral/OpenAI) |

### Agents V7

| Agent | Fichier | Rôle |
|-------|---------|------|
| Agent 1 | `agent1_analyzer.py` | Analyseur - Compréhension du texte |
| Agent 2 | `agent2_explorer.py` | Explorateur d'entités - Cartographie causale |
| Agent 3 | `agent3_extremes.py` | Générateur d'extrêmes - Stress testing |
| Agent 4 | `agent4_impact.py` | Analyste d'impact - Évaluation socio-éco |
| Agent 5 | `agent5_refiner.py` | Affineur - Synthèse et fusion |
| Agent 6 | `agent6_generator.py` | Générateur - Construction JSON V5 |
| Agent 7 | `agent7_critic.py` | Critique technique - Validation |
| Agent 8 | `agent8_reviewer.py` | Réviseur - Approbation finale |

## Composants Frontend

### Composants Principaux

| Composant | Fichier | Description |
|-----------|---------|-------------|
| **App** | `App.tsx` | Layout principal, routage vues |
| **TopBar** | `TopBar.tsx` | Barre supérieure, contrôles simulation |
| **Navigator** | `Navigator.tsx` | Navigation entre vues |
| **Flow** | `canvas/Flow.tsx` | Canvas ReactFlow |
| **Inspector** | `Inspector.tsx` | Panneau de configuration droite |
| **SimulationResults** | `SimulationResults.tsx` | Graphiques résultats |
| **AIChatPanel** | `AIChatPanel.tsx` | Chat IA avec actions |
| **DataInspectorPanel** | `DataInspectorPanel.tsx` | Inspecteur données temps réel |

### Canvas

| Composant | Description |
|-----------|-------------|
| `ComponentNode.tsx` | Nœud représentant un composant |
| `GroupNode.tsx` | Groupe représentant une entité |
| `AddInfluenceModal.tsx` | Modal ajout d'influence |

### Store Zustand

```typescript
interface AppState {
  // Données
  model: SystemModel | null;
  simulationResult: SimulationResult | null;
  storedSimulations: StoredSimulation[];
  
  // UI State
  isLoading: boolean;
  selectedNode: string | null;
  viewMode: ViewMode;
  showEntityBoxes: boolean;
  
  // Actions
  generateModel: (description: string) => Promise<void>;
  runSimulation: () => Promise<void>;
  updateParameter: (path: string, value: number) => void;
  addEntity: (name: string) => void;
  addComponent: (entityName: string, componentName: string, component: ComponentData) => void;
  addInfluence: (componentPath: string, influence: Influence) => void;
  // ...
}
```

## Endpoints API

### Génération

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/generate` | POST | Génère un modèle (V5 par défaut) |
| `/generate?use_v7=true` | POST | Génère un modèle avec pipeline V7 |

### Simulation

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/simulate` | POST | Lance une simulation |
| `/simulate-batch` | POST | Lance plusieurs simulations en batch |
| `/compare` | POST | Compare plusieurs scénarios |

### AI Chat & Edit

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/chat` | POST | Chat IA avec actions sur le modèle |
| `/ai-edit/analyze` | POST | Analyse l'impact d'une modification |
| `/ai-edit/entity` | POST | Édition IA d'une entité entière |

## Flux de Données

### Génération de Modèle

```
User Input (texte)
      │
      ▼
┌─────────────────┐
│  POST /generate │
└────────┬────────┘
         │
    ┌────┴────┐
    │ use_v7? │
    └────┬────┘
    No   │   Yes
    │    │    │
    ▼    │    ▼
┌────────┐  ┌────────────┐
│ V5     │  │ V7         │
│Pipeline│  │Orchestrator│
│(1 LLM) │  │(8 Agents)  │
└────┬───┘  └─────┬──────┘
     │            │
     └─────┬──────┘
           ▼
    ┌─────────────┐
    │ SystemModel │
    │  (Pydantic) │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Response  │
    │    JSON     │
    └─────────────┘
```

### Simulation

```
Model + Parameters
        │
        ▼
┌───────────────────┐
│  SimulationEngine │
│                   │
│  ┌─────────────┐  │
│  │ Init State  │  │
│  └──────┬──────┘  │
│         │         │
│  ┌──────▼──────┐  │
│  │ For step=0  │  │
│  │   to N:     │  │
│  │ ┌─────────┐ │  │
│  │ │Compute  │ │  │
│  │ │Derivati-│ │  │
│  │ │ves      │ │  │
│  │ └────┬────┘ │  │
│  │      │      │  │
│  │ ┌────▼────┐ │  │
│  │ │ Euler   │ │  │
│  │ │ Update  │ │  │
│  │ └─────────┘ │  │
│  └─────────────┘  │
└─────────┬─────────┘
          │
          ▼
┌─────────────────────┐
│  SimulationResult   │
│  - history[]        │
│  - time_points[]    │
│  - final_state      │
└─────────────────────┘
```

## Persistence

### LocalStorage (Frontend)

| Clé | Contenu |
|-----|---------|
| `industriel_ai_model` | Modèle courant (JSON) |
| `industriel_ai_simulation_result` | Dernier résultat simulation |
| `industriel_ai_simulations` | Liste des simulations sauvegardées |

### Fichiers (Backend)

- Pas de base de données
- Export possible en JSON/CSV via `export.py`

## Sécurité

- CORS activé pour toutes origines (développement)
- Clés API LLM via variables d'environnement
- Pas d'authentification utilisateur (outil local)

## Scalabilité

- Single-threaded (Python asyncio)
- Simulations batch séquentielles
- Pas de queue de tâches
- Adapté pour usage local/développement
