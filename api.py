"""
REST API for Industrial AI Simulation System.

Provides HTTP endpoints for model generation, simulation, and analysis.
"""

import os
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from dotenv import load_dotenv
load_dotenv()

from models import SystemModel
from generator import generate_system_model
from llm_client import LLMConfig
from simulation import SimulationEngine, simulate, SimulationResult


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class GenerateRequest(BaseModel):
    """Request to generate a system model from text."""
    description: str
    
class GenerateResponse(BaseModel):
    """Response containing generated model."""
    success: bool
    model: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class SimulateRequest(BaseModel):
    """Request to run a simulation."""
    model: Dict[str, Any]
    steps: int = 100
    dt: float = 0.1
    parameter_changes: Optional[Dict[str, float]] = None

class SimulateResponse(BaseModel):
    """Response containing simulation results."""
    success: bool
    time_points: Optional[List[float]] = None
    history: Optional[List[Dict[str, float]]] = None
    final_state: Optional[Dict[str, float]] = None
    error: Optional[str] = None

class MultiSimulateRequest(BaseModel):
    """Request to run multiple simulations with different configurations."""
    configs: List[Dict[str, Any]]  # List of simulation configurations
    base_model: Dict[str, Any]  # Base system model

class MultiSimulateResponse(BaseModel):
    """Response containing multiple simulation results."""
    success: bool
    results: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None

class CompareRequest(BaseModel):
    """Request to compare multiple scenarios."""
    model: Dict[str, Any]
    scenarios: Dict[str, Dict[str, float]]  # name -> parameter_changes
    steps: int = 100

class CompareResponse(BaseModel):
    """Response containing comparison results."""
    success: bool
    results: Optional[Dict[str, Dict[str, float]]] = None  # scenario -> final_state
    error: Optional[str] = None


# =============================================================================
# LLM CONFIG
# =============================================================================

def get_llm_config() -> Optional[LLMConfig]:
    """Get LLM configuration from environment."""
    if os.environ.get("MISTRAL_API_KEY"):
        return LLMConfig(
            api_key=os.environ.get("MISTRAL_API_KEY"),
            base_url="https://api.mistral.ai/v1",
            model="mistral-large-latest",
            temperature=0.0,
            max_tokens=16384,  # Increased for complex agent outputs
        )
    elif os.environ.get("OPENAI_API_KEY"):
        return LLMConfig(
            api_key=os.environ.get("OPENAI_API_KEY"),
            max_tokens=16384,  # Increased for complex agent outputs
        )
    return None


# =============================================================================
# API APP
# =============================================================================

app = FastAPI(
    title="Industrial AI Simulation API",
    description="API pour la génération et simulation de systèmes dynamiques via LLM",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "Industrial AI Simulation API",
        "version": "1.0.0"
    }


@app.post("/generate", response_model=GenerateResponse)
async def generate_model(request: GenerateRequest, use_v7: bool = False):
    """
    Generate a SystemModel from natural language description.
    
    Uses Mistral AI or OpenAI to interpret the description.
    
    Query Parameters:
    - use_v7: If True, uses the Multi-Agent System V7 pipeline (slower but more thorough)
              If False, uses the legacy V5 single-LLM pipeline (default, faster)
    """
    import sys
    try:
        config = get_llm_config()
        if not config:
            raise HTTPException(
                status_code=500, 
                detail="No LLM API key configured (MISTRAL_API_KEY or OPENAI_API_KEY)"
            )
        
        if use_v7:
            # Use Multi-Agent System V7
            print(f"\n🚀 API: Starting V7 pipeline for: {request.description[:50]}...", flush=True)
            sys.stdout.flush()
            from orchestrator import build_system_model
            model = build_system_model(request.description, llm_config=config)
            generation_mode = "v7"
            print(f"✅ API: V7 pipeline completed successfully", flush=True)
            sys.stdout.flush()
        else:
            # Use legacy V5 single-LLM pipeline
            print(f"\n🚀 API: Starting V5 pipeline for: {request.description[:50]}...", flush=True)
            sys.stdout.flush()
            model = generate_system_model(request.description, llm_config=config)
            generation_mode = "v5"
            print(f"✅ API: V5 pipeline completed successfully", flush=True)
            sys.stdout.flush()
        
        result = model.model_dump(by_alias=True)
        result["generation_mode"] = generation_mode  # Add mode indicator
        
        return GenerateResponse(
            success=True,
            model=result
        )
    except Exception as e:
        print(f"❌ API: Pipeline failed with error: {str(e)}", flush=True)
        sys.stdout.flush()
        return GenerateResponse(
            success=False,
            error=str(e)
        )


@app.post("/simulate", response_model=SimulateResponse)
async def run_simulation(request: SimulateRequest):
    """
    Run a simulation with the provided model.
    
    Optionally modify parameters before simulation.
    """
    try:
        # Parse model
        model = SystemModel.model_validate(request.model)
        
        # Run simulation
        result = simulate(
            model,
            parameter_changes=request.parameter_changes,
            steps=request.steps,
            dt=request.dt
        )
        
        return SimulateResponse(
            success=True,
            time_points=result.time_points,
            history=result.history,
            final_state=result.final_state
        )
    except Exception as e:
        return SimulateResponse(
            success=False,
            error=str(e)
        )


@app.post("/compare", response_model=CompareResponse)
async def compare_scenarios(request: CompareRequest):
    """
    Compare multiple simulation scenarios.
    
    Each scenario has different parameter modifications.
    """
    try:
        model = SystemModel.model_validate(request.model)
        results = {}
        
        for name, params in request.scenarios.items():
            result = simulate(
                model,
                parameter_changes=params,
                steps=request.steps
            )
            results[name] = result.final_state
        
        return CompareResponse(
            success=True,
            results=results
        )
    except Exception as e:
        return CompareResponse(
            success=False,
            error=str(e)
        )


@app.get("/variables/{entity}")
async def get_entity_variables(entity: str, model: str):
    """
    Get all variables for an entity in a model.
    """
    import json
    try:
        model_data = json.loads(model)
        system = SystemModel.model_validate(model_data)
        
        if entity not in system.entities:
            raise HTTPException(status_code=404, detail=f"Entity '{entity}' not found")
        
        return {
            "entity": entity,
            "components": list(system.entities[entity].components.keys())
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON model")


@app.post("/simulate-batch", response_model=MultiSimulateResponse)
async def simulate_batch(request: MultiSimulateRequest):
    """
    Run multiple simulations sequentially with different configurations.
    Each config can override:
    - dt, steps (simulation settings)
    - parameter values (component initial values)
    """
    try:
        results = []
        
        for idx, config in enumerate(request.configs):
            # Create a copy of the base model
            model_dict = request.base_model.copy()
            
            # Deep copy entities to avoid mutation
            import copy
            model_dict['entities'] = copy.deepcopy(request.base_model['entities'])
            model_dict['simulation'] = copy.deepcopy(request.base_model['simulation'])
            
            # Apply simulation settings overrides
            if 'dt' in config:
                model_dict['simulation']['dt'] = config['dt']
            if 'steps' in config:
                model_dict['simulation']['steps'] = config['steps']
            
            # Apply parameter overrides
            if 'parameter_overrides' in config:
                for path, value in config['parameter_overrides'].items():
                    parts = path.split('.')
                    if len(parts) == 2:
                        entity_name, comp_name = parts
                        if entity_name in model_dict['entities']:
                            if comp_name in model_dict['entities'][entity_name]['components']:
                                model_dict['entities'][entity_name]['components'][comp_name]['initial'] = value
            
            # Parse and run simulation
            model = SystemModel.model_validate(model_dict)
            result = simulate(
                model,
                steps=model_dict['simulation']['steps'],
                dt=model_dict['simulation']['dt']
            )
            
            # Add config metadata to result
            results.append({
                'config_id': config.get('id', f'config_{idx}'),
                'config_name': config.get('name', f'Configuration {idx + 1}'),
                'time_points': result.time_points,
                'history': result.history,
                'final_state': result.final_state
            })
        
        return MultiSimulateResponse(
            success=True,
            results=results
        )
    
    except Exception as e:
        print(f"Multi-simulation failed: {e}")
        import traceback
        traceback.print_exc()
        return MultiSimulateResponse(
            success=False,
            error=str(e)
        )


# =============================================================================
# AI EDIT ENDPOINTS
# =============================================================================

class AIEditRequest(BaseModel):
    """Request to analyze AI edit impact."""
    model: Dict[str, Any]
    target: str  # "Entity.Component" or "Entity"
    instruction: str

class AIEditProposal(BaseModel):
    """AI edit proposal with impact analysis."""
    changes: List[Dict[str, Any]]
    requiresOtherChanges: bool
    otherChanges: Optional[List[Dict[str, Any]]] = None

class AIEditResponse(BaseModel):
    """Response containing AI edit proposal."""
    success: bool
    proposal: Optional[AIEditProposal] = None
    error: Optional[str] = None


def build_model_context(model: Dict[str, Any]) -> str:
    """Build a comprehensive context string from the model for LLM prompts."""
    context_parts = []
    
    entities = model.get('entities', {})
    
    # Handle both list and dict formats for entities
    if isinstance(entities, list):
        if not entities:
            return "Modèle vide - aucune entité définie"
        entities_iter = [(e.get('name', e.get('id', f'Entity_{i}')), e) for i, e in enumerate(entities)]
    elif isinstance(entities, dict):
        if not entities:
            return "Modèle vide - aucune entité définie"
        entities_iter = entities.items()
    else:
        return "Modèle vide - format d'entités non reconnu"
    
    for ent_name, entity in entities_iter:
        components = entity.get('components', {})
        
        # Handle components as list or dict
        if isinstance(components, list):
            components_iter = [(c.get('name', c.get('id', f'Comp_{i}')), c) for i, c in enumerate(components)]
        elif isinstance(components, dict):
            components_iter = components.items()
        else:
            components_iter = []
        
        comp_list = []
        for comp_name, comp in components_iter:
            influences_list = []
            influences = comp.get('influences', [])
            if isinstance(influences, list):
                for inf in influences:
                    influences_list.append(f"    ← {inf.get('from')} ({inf.get('kind', 'positive')}, coef={inf.get('coef', 0.1)})")
            
            comp_info = f"  - {comp_name} [{comp.get('type', 'state')}]: initial={comp.get('initial', 0)}"
            if influences_list:
                comp_info += "\n" + "\n".join(influences_list)
            comp_list.append(comp_info)
        
        entity_context = f"Entity: {ent_name}\n" + "\n".join(comp_list)
        context_parts.append(entity_context)
    
    return "\n\n".join(context_parts) if context_parts else "Empty model"


def clean_json_response(response: str) -> str:
    """Clean LLM response to extract valid JSON."""
    response_text = response.strip()
    
    # Handle markdown code blocks
    if response_text.startswith('```json'):
        response_text = response_text[7:]
    if response_text.startswith('```'):
        response_text = response_text[3:]
    if response_text.endswith('```'):
        response_text = response_text[:-3]
    
    # Handle cases where there's text before/after JSON
    start_idx = response_text.find('{')
    end_idx = response_text.rfind('}')
    if start_idx != -1 and end_idx != -1:
        response_text = response_text[start_idx:end_idx+1]
    
    return response_text.strip()


@app.post("/ai-edit/analyze", response_model=AIEditResponse)
async def ai_edit_analyze(request: AIEditRequest):
    """
    Analyze an AI edit request using a dual-agent approach:
    - Agent 1: Structure Analyst - determines entities/components placement
    - Agent 2: Relationship Analyst - determines influences/connections
    """
    import json
    from llm_client import LLMClient
    
    try:
        config = get_llm_config()
        if not config:
            raise HTTPException(
                status_code=500,
                detail="No LLM API key configured"
            )
        
        client = LLMClient(config)
        
        # Build complete model context
        model_context = build_model_context(request.model)
        
        # Build context about the target
        target_parts = request.target.split('.')
        is_component = len(target_parts) == 2
        
        if is_component:
            entity_name, comp_name = target_parts
            component = request.model['entities'].get(entity_name, {}).get('components', {}).get(comp_name, {})
            target_context = f"Component: {request.target}\nCurrent state: {json.dumps(component, indent=2)}"
        else:
            entity = request.model['entities'].get(request.target, {})
            target_context = f"Entity: {request.target}\nComponents: {list(entity.get('components', {}).keys())}"
        
        # =================================================================
        # AGENT 1: Structure Analyst - Determine entities/components needed
        # =================================================================
        agent1_system = """You are a STRUCTURE ANALYST for system modeling, analyzing requests to determine the correct placement of components.

Your ONLY job is to determine:
1. What new components are needed
2. Which EXISTING entity they should belong to (based on semantic meaning)
3. OR if a NEW entity should be created (only if semantically different from existing entities)

Rules for entity assignment:
- Components should be grouped by semantic domain (e.g., "Production" for production-related metrics)
- Prefer adding to existing entities if they are semantically related
- Only create new entities if the component represents a clearly different domain
- Consider the naming conventions already used in the model

Output ONLY valid JSON:
{
  "analysis": {
    "userIntent": "brief description of what the user wants",
    "componentsNeeded": [
      {
        "name": "ComponentName",
        "type": "state|computed|constant",
        "initial": 100,
        "belongsTo": "ExistingEntityName OR new:NewEntityName",
        "reason": "why this entity"
      }
    ],
    "newEntitiesNeeded": [
      {
        "name": "EntityName",
        "description": "what this entity represents",
        "reason": "why a new entity is needed"
      }
    ]
  }
}"""

        agent1_prompt = f"""Current Model Structure:
{model_context}

Target being edited: {request.target}
Target details: {target_context}

User Request: "{request.instruction}"

Analyze what components are needed and where they should be placed. 
Consider the existing entity structure and component naming patterns."""

        print("=== AGENT 1: Structure Analysis ===")
        agent1_response = client.generate(agent1_system, agent1_prompt, temperature=0.3)
        
        # Parse Agent 1 response
        try:
            agent1_text = clean_json_response(agent1_response)
            agent1_data = json.loads(agent1_text)
            structure_analysis = agent1_data.get('analysis', {})
            print(f"Agent 1 result: {json.dumps(structure_analysis, indent=2)}")
        except json.JSONDecodeError as e:
            print(f"Agent 1 JSON parse error: {e}")
            structure_analysis = {"componentsNeeded": [], "newEntitiesNeeded": []}
        
        # =================================================================
        # AGENT 2: Relationship Analyst - Determine influences/connections
        # =================================================================
        agent2_system = """You are a RELATIONSHIP ANALYST for system modeling, determining the connections between components.

Your ONLY job is to determine:
1. What INFLUENCES (causal relationships) should exist
2. The DIRECTION of each influence (from → to)
3. The STRENGTH and TYPE of each influence

Rules for relationships:
- Influences go FROM a cause TO an effect
- "positive" means: when source increases, target increases
- "negative" means: when source increases, target decreases
- Coefficient (coef) indicates strength: 0.01-0.1 (weak), 0.1-0.3 (moderate), 0.3-0.5 (strong), >0.5 (very strong)
- Function types: "linear" (proportional), "exponential" (accelerating), "logarithmic" (diminishing)

Current model influences for reference:
{existing_influences}

Output ONLY valid JSON:
{
  "relationships": {
    "newInfluences": [
      {
        "from": "Entity.Component",
        "to": "Entity.Component",
        "kind": "positive|negative",
        "coef": 0.1,
        "function": "linear|exponential|logarithmic",
        "reason": "why this relationship exists"
      }
    ],
    "modifiedInfluences": [
      {
        "from": "Entity.Component",
        "to": "Entity.Component",
        "newCoef": 0.2,
        "reason": "why the change"
      }
    ]
  }
}"""

        # Get existing influences for context
        existing_influences = []
        for ent_name, entity in request.model['entities'].items():
            for comp_name, comp in entity.get('components', {}).items():
                for inf in comp.get('influences', []):
                    existing_influences.append({
                        'from': inf.get('from'),
                        'to': f"{ent_name}.{comp_name}",
                        'coef': inf.get('coef'),
                        'kind': inf.get('kind'),
                        'function': inf.get('function', 'linear')
                    })

        # Include Agent 1's findings for Agent 2
        new_components_context = ""
        if structure_analysis.get('componentsNeeded'):
            new_components_context = f"""
New components being added (from structure analysis):
{json.dumps(structure_analysis['componentsNeeded'], indent=2)}
"""

        agent2_prompt = f"""Current Model Structure:
{model_context}

Existing Influences:
{json.dumps(existing_influences, indent=2)}
{new_components_context}
Target being edited: {request.target}

User Request: "{request.instruction}"

Determine what relationships/influences should be created or modified.
Consider both connections TO and FROM any new components."""

        print("=== AGENT 2: Relationship Analysis ===")
        agent2_response = client.generate(agent2_system.format(existing_influences=json.dumps(existing_influences, indent=2)), agent2_prompt, temperature=0.3)
        
        # Parse Agent 2 response
        try:
            agent2_text = clean_json_response(agent2_response)
            agent2_data = json.loads(agent2_text)
            relationship_analysis = agent2_data.get('relationships', {})
            print(f"Agent 2 result: {json.dumps(relationship_analysis, indent=2)}")
        except json.JSONDecodeError as e:
            print(f"Agent 2 JSON parse error: {e}")
            relationship_analysis = {"newInfluences": [], "modifiedInfluences": []}
        
        # =================================================================
        # Combine both agents' outputs into final proposal
        # =================================================================
        changes = []
        other_changes = []
        
        # Process new entities from Agent 1
        for new_entity in structure_analysis.get('newEntitiesNeeded', []):
            other_changes.append({
                "target": new_entity['name'],
                "action": "create_entity",
                "description": f"Créer l'entité: {new_entity['name']}",
                "entityDescription": new_entity.get('description', ''),
                "reason": new_entity.get('reason', 'Structure analysis')
            })
        
        # Process new components from Agent 1
        for comp in structure_analysis.get('componentsNeeded', []):
            belongs_to = comp.get('belongsTo', '')
            entity_name = belongs_to.replace('new:', '') if belongs_to.startswith('new:') else belongs_to
            
            other_changes.append({
                "target": f"{entity_name}.{comp['name']}",
                "action": "create",
                "description": f"Créer le composant: {comp['name']} dans {entity_name}",
                "componentType": comp.get('type', 'state'),
                "initial": comp.get('initial', 100),
                "reason": comp.get('reason', 'Structure analysis')
            })
        
        # Process new influences from Agent 2
        for inf in relationship_analysis.get('newInfluences', []):
            other_changes.append({
                "target": inf['to'],
                "action": "add_influence",
                "description": f"Ajouter influence: {inf['from']} → {inf['to']}",
                "influence": {
                    "from": inf['from'],
                    "coef": inf.get('coef', 0.1),
                    "kind": inf.get('kind', 'positive'),
                    "function": inf.get('function', 'linear'),
                    "enabled": True
                },
                "reason": inf.get('reason', 'Relationship analysis')
            })
        
        # Process modified influences from Agent 2
        for mod in relationship_analysis.get('modifiedInfluences', []):
            changes.append({
                "target": mod['to'],
                "field": "influence_coef",
                "oldValue": None,
                "newValue": mod.get('newCoef', 0.1),
                "influenceFrom": mod['from'],
                "reason": mod.get('reason', 'Relationship adjustment')
            })
        
        return AIEditResponse(
            success=True,
            proposal=AIEditProposal(
                changes=changes,
                requiresOtherChanges=len(other_changes) > 0,
                otherChanges=other_changes
            )
        )
    
    except Exception as e:
        print(f"AI edit analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return AIEditResponse(
            success=False,
            error=str(e)
        )


@app.post("/ai-edit/entity", response_model=AIEditResponse)
async def ai_edit_entity(request: AIEditRequest):
    """
    Analyze an AI edit request for an entire entity.
    """
    import json
    from llm_client import LLMClient
    
    try:
        config = get_llm_config()
        if not config:
            raise HTTPException(
                status_code=500,
                detail="No LLM API key configured"
            )
        
        client = LLMClient(config)
        
        entity_name = request.target
        entity = request.model['entities'].get(entity_name, {})
        
        # Find all influences involving this entity
        influences_from = []
        influences_to = []
        for ent_name, ent in request.model['entities'].items():
            for comp_name, comp in ent.get('components', {}).items():
                for inf in comp.get('influences', []):
                    if inf.get('from', '').startswith(f"{entity_name}."):
                        influences_from.append({
                            'from': inf.get('from'),
                            'to': f"{ent_name}.{comp_name}",
                            'coef': inf.get('coef')
                        })
                    if ent_name == entity_name:
                        influences_to.append({
                            'from': inf.get('from'),
                            'to': f"{ent_name}.{comp_name}",
                            'coef': inf.get('coef')
                        })
        
        system_prompt = """You are a system modeling expert. Analyze the entity modification request and propose changes.

Output ONLY valid JSON:
{
  "changes": [
    {
      "type": "add_component|modify_component|delete_component|add_influence|modify_influence",
      "target": "Entity.Component",
      "description": "what to change",
      "reason": "why"
    }
  ],
  "affectsOtherEntities": true/false,
  "otherEntityChanges": [
    {
      "entity": "OtherEntity",
      "description": "what needs to change",
      "reason": "why"
    }
  ]
}"""

        user_prompt = f"""Entity: {entity_name}
Components: {json.dumps(entity.get('components', {}), indent=2)}

Influences from this entity: {json.dumps(influences_from, indent=2)}
Influences to this entity: {json.dumps(influences_to, indent=2)}

Other entities in system: {[e for e in request.model['entities'].keys() if e != entity_name]}

User Request: {request.instruction}"""

        response = client.generate(system_prompt, user_prompt)
        
        try:
            response_text = response.strip()
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
            response_text = response_text.strip()
            
            proposal_data = json.loads(response_text)
            
            # Convert entity format to component format
            changes = []
            for change in proposal_data.get('changes', []):
                changes.append({
                    "target": change.get('target', entity_name),
                    "field": change.get('type', 'modify'),
                    "oldValue": None,
                    "newValue": change.get('description'),
                    "reason": change.get('reason')
                })
            
            other_changes = []
            for change in proposal_data.get('otherEntityChanges', []):
                other_changes.append({
                    "target": change.get('entity'),
                    "description": change.get('description'),
                    "reason": change.get('reason')
                })
            
            return AIEditResponse(
                success=True,
                proposal=AIEditProposal(
                    changes=changes,
                    requiresOtherChanges=proposal_data.get('affectsOtherEntities', False),
                    otherChanges=other_changes
                )
            )
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response: {e}")
            return AIEditResponse(
                success=True,
                proposal=AIEditProposal(
                    changes=[{
                        "target": entity_name,
                        "field": "modify",
                        "oldValue": None,
                        "newValue": request.instruction,
                        "reason": "Based on user request"
                    }],
                    requiresOtherChanges=False
                )
            )
    
    except Exception as e:
        print(f"AI entity edit failed: {e}")
        import traceback
        traceback.print_exc()
        return AIEditResponse(
            success=False,
            error=str(e)
        )


# =============================================================================
# AI CHAT ENDPOINT
# =============================================================================

class ChatRequest(BaseModel):
    """Request for AI chat interaction."""
    message: str
    model: Optional[Dict[str, Any]] = None
    context: Optional[Dict[str, Any]] = None  # selectedNode, mentions, etc.

class ChatAction(BaseModel):
    """An action taken by the AI."""
    type: str  # 'add_entity', 'add_component', 'add_influence', 'modify', 'delete'
    target: str
    description: str
    details: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    """Response from AI chat."""
    success: bool
    message: Optional[str] = None
    actions: Optional[List[ChatAction]] = None
    modelUpdates: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@app.post("/chat", response_model=ChatResponse)
async def chat_with_model(request: ChatRequest):
    """
    Process a chat message using dual-agent approach:
    - Agent 1: Structure Analyst - determines where to place components
    - Agent 2: Relationship Analyst - determines influences to create
    """
    import json
    import copy
    from llm_client import LLMClient
    
    try:
        config = get_llm_config()
        if not config:
            raise HTTPException(
                status_code=500,
                detail="No LLM API key configured"
            )
        
        client = LLMClient(config)
        
        # Build comprehensive model context
        model_context = build_model_context(request.model) if request.model else "No model loaded"
        
        # Get existing influences
        existing_influences = []
        if request.model:
            for ent_name, entity in request.model.get('entities', {}).items():
                for comp_name, comp in entity.get('components', {}).items():
                    for inf in comp.get('influences', []):
                        existing_influences.append({
                            'from': inf.get('from'),
                            'to': f"{ent_name}.{comp_name}",
                            'coef': inf.get('coef'),
                            'kind': inf.get('kind')
                        })
        
        mentions = request.context.get('mentions', []) if request.context else []
        selected_node = request.context.get('selectedNode') if request.context else None
        
        # =================================================================
        # AGENT 1: Structure Analyst
        # =================================================================
        agent1_system = """You are a STRUCTURE ANALYST for system modeling. Analyze the user's request to determine:

1. What new entities need to be created (if any)
2. What new components need to be created
3. Which existing entity each new component should belong to (based on semantic meaning)
4. What modifications to existing components are needed

Rules:
- Group components by semantic domain (e.g., "Production" entity for production metrics)
- Prefer adding to existing entities if semantically related
- Only create new entities if clearly different domain
- Use descriptive component names in camelCase

Output ONLY valid JSON:
{
  "intent": "brief description of what user wants",
  "newEntities": [
    {"name": "EntityName", "description": "what it represents"}
  ],
  "newComponents": [
    {
      "entity": "ExistingOrNewEntityName",
      "name": "componentName",
      "type": "state|computed|constant",
      "initial": 100,
      "description": "what this component represents"
    }
  ],
  "modifications": [
    {
      "target": "Entity.Component",
      "changes": {"initial": 50, "min": 0, "max": 100}
    }
  ],
  "deletions": ["Entity.Component"]
}"""

        agent1_prompt = f"""Current Model Structure:
{model_context}

Selected element: {selected_node or 'None'}
Mentioned elements: {mentions}

User Request: "{request.message}"

Analyze what entities/components are needed and where they should be placed."""

        print("=== CHAT AGENT 1: Structure Analysis ===")
        agent1_response = client.generate(agent1_system, agent1_prompt, temperature=0.3)
        
        try:
            agent1_text = clean_json_response(agent1_response)
            agent1_data = json.loads(agent1_text)
            print(f"Chat Agent 1 result: {json.dumps(agent1_data, indent=2)}")
        except json.JSONDecodeError as e:
            print(f"Chat Agent 1 JSON parse error: {e}")
            agent1_data = {"newEntities": [], "newComponents": [], "modifications": [], "deletions": []}
        
        # =================================================================
        # AGENT 2: Relationship Analyst
        # =================================================================
        agent2_system = """You are a RELATIONSHIP ANALYST for system modeling. Determine the causal relationships (influences) between components.

Rules for influences:
- Influences go FROM a cause TO an effect
- "positive": when source ↑, target ↑
- "negative": when source ↑, target ↓  
- Coefficient strength: 0.01-0.1 (weak), 0.1-0.3 (moderate), 0.3-0.5 (strong)
- Functions: "linear" (proportional), "exponential" (accelerating), "logarithmic" (diminishing)

Existing influences in model:
{existing}

Output ONLY valid JSON:
{{
  "newInfluences": [
    {{
      "from": "Entity.Component",
      "to": "Entity.Component", 
      "kind": "positive|negative",
      "coef": 0.1,
      "function": "linear",
      "reason": "why this relationship"
    }}
  ],
  "removedInfluences": [
    {{"from": "Entity.Component", "to": "Entity.Component"}}
  ]
}}"""

        # Build context from Agent 1's findings
        new_components_for_agent2 = ""
        if agent1_data.get('newComponents'):
            new_components_for_agent2 = f"""
New components being added:
{json.dumps(agent1_data['newComponents'], indent=2)}
"""

        agent2_prompt = f"""Current Model Structure:
{model_context}
{new_components_for_agent2}
User Request: "{request.message}"

Determine what influences/relationships should be created between components.
Consider connections both TO and FROM new components."""

        print("=== CHAT AGENT 2: Relationship Analysis ===")
        agent2_response = client.generate(
            agent2_system.format(existing=json.dumps(existing_influences, indent=2)), 
            agent2_prompt, 
            temperature=0.3
        )
        
        try:
            agent2_text = clean_json_response(agent2_response)
            agent2_data = json.loads(agent2_text)
            print(f"Chat Agent 2 result: {json.dumps(agent2_data, indent=2)}")
        except json.JSONDecodeError as e:
            print(f"Chat Agent 2 JSON parse error: {e}")
            agent2_data = {"newInfluences": [], "removedInfluences": []}
        
        # =================================================================
        # Combine agents' outputs into actions
        # =================================================================
        actions = []
        user_intent = agent1_data.get('intent', request.message)
        
        # Create new entities
        for entity in agent1_data.get('newEntities', []):
            actions.append(ChatAction(
                type='add_entity',
                target=entity['name'],
                description=f"Créer l'entité {entity['name']}",
                details={
                    'name': entity['name'],
                    'description': entity.get('description', '')
                }
            ))
        
        # Create new components
        for comp in agent1_data.get('newComponents', []):
            entity_name = comp.get('entity', 'Default')
            comp_name = comp.get('name', 'component')
            actions.append(ChatAction(
                type='add_component',
                target=f"{entity_name}.{comp_name}",
                description=f"Créer {comp_name} dans {entity_name}",
                details={
                    'entity': entity_name,
                    'name': comp_name,
                    'component': {
                        'type': comp.get('type', 'state'),
                        'initial': comp.get('initial', 100),
                        'min': comp.get('min'),
                        'max': comp.get('max'),
                        'influences': []
                    }
                }
            ))
        
        # Modify existing components
        for mod in agent1_data.get('modifications', []):
            actions.append(ChatAction(
                type='modify',
                target=mod['target'],
                description=f"Modifier {mod['target']}",
                details=mod.get('changes', {})
            ))
        
        # Delete components
        for deletion in agent1_data.get('deletions', []):
            actions.append(ChatAction(
                type='remove_component' if '.' in deletion else 'remove_entity',
                target=deletion,
                description=f"Supprimer {deletion}",
                details={'target': deletion}
            ))
        
        # Add new influences
        for inf in agent2_data.get('newInfluences', []):
            actions.append(ChatAction(
                type='add_influence',
                target=inf['to'],
                description=f"Ajouter influence: {inf['from']} → {inf['to']} ({inf.get('kind', 'positive')})",
                details={
                    'source': inf['from'],
                    'target': inf['to'],
                    'coef': inf.get('coef', 0.1),
                    'kind': inf.get('kind', 'positive'),
                    'function': inf.get('function', 'linear')
                }
            ))
        
        # Build response message
        action_summary = []
        if agent1_data.get('newEntities'):
            action_summary.append(f"Créer {len(agent1_data['newEntities'])} entité(s)")
        if agent1_data.get('newComponents'):
            action_summary.append(f"Créer {len(agent1_data['newComponents'])} composant(s)")
        if agent2_data.get('newInfluences'):
            action_summary.append(f"Ajouter {len(agent2_data['newInfluences'])} influence(s)")
        if agent1_data.get('modifications'):
            action_summary.append(f"Modifier {len(agent1_data['modifications'])} composant(s)")
        
        message = f"Compris. Je vais: {', '.join(action_summary)}." if action_summary else f"J'ai analysé votre demande: {user_intent}"
        
        return ChatResponse(
            success=True,
            message=message,
            actions=actions,
            modelUpdates=None  # Let frontend apply actions
        )
            
    except Exception as e:
        print(f"Chat failed: {e}")
        import traceback
        traceback.print_exc()
        return ChatResponse(
            success=False,
            error=str(e)
        )


# =============================================================================
# AI EXPLANATION ENDPOINT
# =============================================================================

class ExplainRequest(BaseModel):
    """Request for AI explanation of model/simulation."""
    model: Dict[str, Any]
    simulationResult: Optional[Dict[str, Any]] = None
    storedSimulations: Optional[List[Dict[str, Any]]] = None
    question: str
    viewMode: str = 'executive'  # executive, levers, analyst, technical

class ExplainResponse(BaseModel):
    """Response containing AI explanation."""
    success: bool
    summary: Optional[str] = None
    keyPoints: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None
    metrics: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None


@app.post("/ai-explain", response_model=ExplainResponse)
async def ai_explain(request: ExplainRequest):
    """
    Generate AI explanations for model/simulation based on viewMode.
    Supports 4 perspectives: executive, levers, analyst, technical.
    """
    import json
    from llm_client import LLMClient
    
    try:
        config = get_llm_config()
        if not config:
            raise HTTPException(
                status_code=500,
                detail="No LLM API key configured"
            )
        
        client = LLMClient(config)
        
        # Build model context
        model_context = build_model_context(request.model)
        
        # Build simulation context
        simulation_context = "No simulation data available"
        if request.simulationResult:
            final_state = request.simulationResult.get('final_state', {})
            time_points = request.simulationResult.get('time_points', [])
            simulation_context = f"""
Simulation Results:
- Duration: {len(time_points)} time steps
- Final State:
{json.dumps(final_state, indent=2)}
"""
        
        # Historical simulations context
        history_context = ""
        if request.storedSimulations and len(request.storedSimulations) > 0:
            history_context = f"\nHistorical Simulations ({len(request.storedSimulations)} stored):\n"
            for i, sim in enumerate(request.storedSimulations[:3]):  # Limit to 3
                history_context += f"- Simulation {i+1}: {sim.get('name', 'Unnamed')}\n"
        
        # Perspective-specific prompts - Human-friendly, storytelling approach
        perspective_prompts = {
            'executive': """Tu es un conseiller stratégique présentant au PDG/Conseil d'administration.
RÈGLES IMPORTANTES:
- Utilise un langage simple et accessible, PAS de jargon technique
- Raconte une HISTOIRE, pas des données brutes
- N'affiche JAMAIS de valeurs numériques brutes (ex: "de 20 à 52.2")
- Utilise des expressions qualitatives: "forte hausse", "déclin significatif", "stabilité"
- Concentre-toi sur les CONSÉQUENCES BUSINESS, pas les mécanismes
- Parle comme à un humain qui veut comprendre, pas à une machine

Focus sur:
- Impact business en termes concrets (revenus, réputation, risques)
- Décisions stratégiques à prendre
- Opportunités et menaces pour l'organisation""",

            'levers': """Tu es un manager opérationnel identifiant les leviers d'action.
RÈGLES IMPORTANTES:
- Utilise un langage simple et concret
- PAS de pourcentages ou valeurs numériques brutes
- Décris les actions en termes de "faire plus/moins de X"
- Explique les compromis en langage courant
- Propose des actions concrètes et réalisables

Focus sur:
- Quels boutons tourner pour améliorer la situation
- Ce qu'on peut changer rapidement vs ce qui prend du temps
- Les effets secondaires de chaque action""",

            'analyst': """Tu es un analyste présentant des insights.
RÈGLES IMPORTANTES:
- Traduis les tendances en langage accessible
- Au lieu de "augmentation de 45%", dis "augmentation importante" ou "quasi doublé"
- Décris les relations de cause à effet simplement
- Utilise des métaphores si ça aide à comprendre

Focus sur:
- Les grandes tendances observées (hausse/baisse/stable)
- Ce qui cause quoi dans le système
- Les signaux d'alerte à surveiller""",

            'technical': """Tu es un ingénieur système expliquant le modèle.
RÈGLES IMPORTANTES:
- Reste technique mais COMPRÉHENSIBLE
- Explique les boucles de rétroaction en termes simples
- Décris comment les éléments s'influencent mutuellement
- Identifie les points de levier dans le système

Focus sur:
- La structure du modèle et ses connexions
- Les mécanismes d'amplification ou d'atténuation
- Les limites et hypothèses du modèle"""
        }
        
        perspective = perspective_prompts.get(request.viewMode, perspective_prompts['executive'])
        
        system_prompt = f"""{perspective}

Réponds en FRANÇAIS. Sois CONCIS (max 200 mots total).

Output ONLY valid JSON (pas de texte avant/après):
{{
  "summary": "2-3 phrases simples résumant la situation et son impact",
  "keyPoints": [
    "Point clé 1 en langage simple",
    "Point clé 2 en langage simple",
    "Point clé 3 en langage simple"
  ],
  "recommendations": [
    "Action concrète 1",
    "Action concrète 2"
  ],
  "metrics": [
    {{"label": "Indicateur", "value": "Description qualitative", "trend": "up|down|neutral"}}
  ]
}}"""

        user_prompt = f"""Contexte du Modèle:
{model_context}

{simulation_context}
{history_context}

Question: {request.question}

Explique la situation de manière simple et compréhensible. Pas de jargon, pas de chiffres bruts."""

        response = client.generate(system_prompt, user_prompt, temperature=0.5, max_tokens=1200)
        
        try:
            response_text = clean_json_response(response)
            data = json.loads(response_text)
            
            return ExplainResponse(
                success=True,
                summary=data.get('summary', ''),
                keyPoints=data.get('keyPoints', []),
                recommendations=data.get('recommendations', []),
                metrics=data.get('metrics', [])
            )
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI explanation response: {e}")
            print(f"Raw response (first 500 chars): {response[:500]}")
            
            # Try to extract partial content from truncated JSON
            summary = "Analyse générée avec succès"
            keyPoints = []
            
            # Try to find partial content
            if '"summary":' in response:
                try:
                    start = response.find('"summary":') + 11
                    end = response.find('",', start)
                    if end > start:
                        summary = response[start:end].strip().strip('"')
                except:
                    pass
            
            if '"keyPoints"' in response:
                try:
                    # Extract any complete strings from keyPoints array
                    import re
                    points = re.findall(r'"([^"]{20,200})"', response[response.find('"keyPoints"'):])
                    keyPoints = points[:3] if points else []
                except:
                    pass
            
            return ExplainResponse(
                success=True,
                summary=summary if summary else response[:300],
                keyPoints=keyPoints if keyPoints else ["L'analyse a été générée mais le format de réponse était incomplet"],
                recommendations=["Veuillez reformuler votre question pour plus de détails"],
                metrics=[]
            )
    
    except Exception as e:
        print(f"AI explanation failed: {e}")
        import traceback
        traceback.print_exc()
        return ExplainResponse(
            success=False,
            error=str(e)
        )


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
