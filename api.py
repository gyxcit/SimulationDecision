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


@app.post("/ai-edit/analyze", response_model=AIEditResponse)
async def ai_edit_analyze(request: AIEditRequest):
    """
    Analyze an AI edit request and return proposed changes with impact analysis.
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
        
        # Find related influences
        related_influences = []
        for ent_name, entity in request.model['entities'].items():
            for comp_name, comp in entity.get('components', {}).items():
                for inf in comp.get('influences', []):
                    if request.target in inf.get('from', '') or request.target in f"{ent_name}.{comp_name}":
                        related_influences.append({
                            'from': inf.get('from'),
                            'to': f"{ent_name}.{comp_name}",
                            'coef': inf.get('coef'),
                            'kind': inf.get('kind')
                        })
        
        system_prompt = """You are a system modeling expert. Analyze the requested modification and determine:
1. What changes are needed to the target component/entity
2. Whether other parts of the system need to be modified to maintain consistency
3. Why each change is necessary

Output ONLY valid JSON in this format:
{
  "changes": [
    {
      "target": "Entity.Component",
      "field": "initial|min|max|type",
      "oldValue": <current value>,
      "newValue": <proposed value>,
      "reason": "explanation"
    }
  ],
  "requiresOtherChanges": true/false,
  "otherChanges": [
    {
      "target": "OtherEntity.Component",
      "description": "what needs to change",
      "reason": "why it's needed to maintain consistency"
    }
  ]
}"""

        user_prompt = f"""System Model Context:
{target_context}

Related Influences:
{json.dumps(related_influences, indent=2)}

User Request: {request.instruction}

Analyze the impact and propose changes. Be specific about values."""

        response = client.generate(system_prompt, user_prompt)
        
        # Parse response
        try:
            # Clean response
            response_text = response.strip()
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
            response_text = response_text.strip()
            
            proposal_data = json.loads(response_text)
            
            return AIEditResponse(
                success=True,
                proposal=AIEditProposal(
                    changes=proposal_data.get('changes', []),
                    requiresOtherChanges=proposal_data.get('requiresOtherChanges', False),
                    otherChanges=proposal_data.get('otherChanges', [])
                )
            )
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response: {e}")
            print(f"Response was: {response}")
            # Return a simple fallback proposal
            return AIEditResponse(
                success=True,
                proposal=AIEditProposal(
                    changes=[{
                        "target": request.target,
                        "field": "initial",
                        "oldValue": 0,
                        "newValue": 0,
                        "reason": request.instruction
                    }],
                    requiresOtherChanges=False
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
    Process a chat message and potentially modify the model.
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
        
        # Build context
        model_summary = "No model loaded"
        if request.model:
            entities = list(request.model.get('entities', {}).keys())
            components = []
            for ent_name, entity in request.model.get('entities', {}).items():
                for comp_name in entity.get('components', {}).keys():
                    components.append(f"{ent_name}.{comp_name}")
            model_summary = f"Entities: {entities}\nComponents: {components}"
        
        mentions = request.context.get('mentions', []) if request.context else []
        selected_node = request.context.get('selectedNode') if request.context else None
        
        system_prompt = f"""You are an AI assistant for a dynamic systems modeling application.
The user can ask you to:
- Add new entities
- Add new components to entities
- Add influences/relationships between components
- Modify existing components (change parameters, coefficients)
- Delete entities or components
- Explain the model

Current Model:
{model_summary}

User's selected context: {selected_node or 'None'}
Mentioned elements: {mentions}

Respond with a JSON object containing:
{{
    "message": "Your response message to the user",
    "actions": [
        {{
            "type": "add_entity|add_component|add_influence|modify|delete|explain",
            "target": "Entity or Entity.Component",
            "description": "What this action does",
            "details": {{ ... action-specific data ... }}
        }}
    ],
    "modelUpdates": {{ ... updated model if changes were made, or null ... }}
}}

For add_entity, details should include: {{ "name": "EntityName", "components": {{ "CompName": {{ "type": "state", "initial": 0.5, "min": 0, "max": 1, "influences": [] }} }} }}
For add_component, details should include: {{ "entity": "EntityName", "name": "ComponentName", "component": {{ "type": "state", "initial": 0.5, "min": 0, "max": 1, "influences": [] }} }}
For add_influence, details should include: {{ "to": "Entity.Component", "influence": {{ "from": "Entity.Component", "kind": "positive", "coef": 0.1, "function": "linear", "enabled": true }} }}
For modify, details should include the specific field changes.
For delete, details should include {{ "target": "Entity or Entity.Component" }}.

If changes are made, include the complete updated model in modelUpdates.
Always respond in JSON format only."""

        user_prompt = f"User message: {request.message}"
        
        response = client.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=4000,
            temperature=0.7
        )
        
        # Parse response
        try:
            # Clean the response
            response_text = response.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            result = json.loads(response_text.strip())
            
            actions = []
            for action in result.get('actions', []):
                actions.append(ChatAction(
                    type=action.get('type', 'explain'),
                    target=action.get('target', ''),
                    description=action.get('description', ''),
                    details=action.get('details')
                ))
            
            return ChatResponse(
                success=True,
                message=result.get('message', 'Done'),
                actions=actions,
                modelUpdates=result.get('modelUpdates')
            )
            
        except json.JSONDecodeError:
            # If parsing fails, return the raw response
            return ChatResponse(
                success=True,
                message=response,
                actions=[]
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
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
