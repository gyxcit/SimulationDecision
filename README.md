# Industrial AI - System Dynamics Simulation Platform

Full-stack platform converting natural language descriptions into dynamic system models with real-time simulation and visualization.

## Features

- **AI-Powered Model Generation** - Multi-Agent System V7 with 8 specialized agents
- **Real-Time Simulation** - Euler explicit engine with parameter tweaking
- **Interactive Visualization** - React frontend with flow diagrams and charts
- **Explainable AI** - Multiple perspectives (Executive, Analyst, Technical)
- **Docker Ready** - Production-ready containerization

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/industriel-ai.git
cd industriel-ai

# Backend setup
pip install -r requirements.txt

# Frontend setup
cd web && npm install
```

### Configuration

Copy `.env.example` to `.env` and add your API keys:

```env
MISTRAL_API_KEY=your_mistral_key
# or
OPENAI_API_KEY=your_openai_key
```

### Running Locally

```bash
# Start backend (from root)
python run_server.py

# Start frontend (from web/)
cd web && npm run dev
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173

### Docker Deployment

```bash
# Production
docker-compose up -d

# Development (with hot reload)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Project Structure

```
industriel_ai/
├── backend/                    # Python API & Core
│   ├── api.py                  # FastAPI REST endpoints
│   ├── models.py               # Pydantic data models
│   ├── simulation.py           # Euler simulation engine
│   ├── generator.py            # V5 LLM pipeline
│   ├── orchestrator.py         # V7 multi-agent pipeline
│   ├── llm_client.py           # LLM API client
│   └── agents/                 # V7 specialized agents
│       ├── agent1_analyzer.py
│       ├── agent2_explorer.py
│       ├── agent3_extremes.py
│       ├── agent4_impact.py
│       ├── agent5_refiner.py
│       ├── agent6_generator.py
│       ├── agent7_critic.py
│       └── agent8_reviewer.py
├── web/                        # React Frontend
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── store/              # Zustand state
│   │   └── lib/                # Utilities
│   ├── Dockerfile
│   └── nginx.conf
├── docs/                       # Documentation
├── Dockerfile                  # Backend container
├── docker-compose.yml          # Production config
└── docker-compose.dev.yml      # Development config
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/generate` | POST | Generate model from text |
| `/generate?use_v7=true` | POST | Generate with V7 pipeline |
| `/simulate` | POST | Run simulation |
| `/chat` | POST | AI chat interaction |
| `/ai-edit/analyze` | POST | Dual-agent edit analysis |
| `/ai-explain` | POST | Get AI explanations |

### Example: Generate a Model

```bash
curl -X POST "http://localhost:8000/generate?use_v7=true" \
  -H "Content-Type: application/json" \
  -d '{"description": "A factory with workers and machinery. Worker productivity depends on morale which depends on salary."}'
```

## V7 Multi-Agent Architecture

The V7 pipeline uses 8 specialized AI agents:

| Agent | Role |
|-------|------|
| **Analyzer** | Extracts concepts, goals, assumptions |
| **Entity Explorer** | Maps causal relationships |
| **Extreme Generator** | Creates stress test scenarios |
| **Impact Analyst** | Assesses social/economic impacts |
| **Refiner** | Synthesizes and optimizes structure |
| **System Generator** | Converts to simulation schema |
| **Technical Critic** | Validates for technical issues |
| **Impact Reviewer** | Final approval decision |

## Core Concepts

- **Entities** - Macro actors (Workers, Management, Market...)
- **Components** - Measurable variables (satisfaction, productivity...)
- **Influences** - Atomic relationships with coefficients

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MISTRAL_API_KEY` | Mistral AI API key | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `V7_MAX_ITERATIONS` | Max V7 repair iterations | 2 |
| `V7_AGENT_MAX_RETRIES` | Agent retry attempts | 3 |
| `V7_AGENT_TEMPERATURE` | LLM temperature | 0.0 |

## License

MIT


