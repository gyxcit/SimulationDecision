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
        )
    elif os.environ.get("OPENAI_API_KEY"):
        return LLMConfig(
            api_key=os.environ.get("OPENAI_API_KEY"),
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
async def generate_model(request: GenerateRequest):
    """
    Generate a SystemModel from natural language description.
    
    Uses Mistral AI or OpenAI to interpret the description.
    """
    try:
        config = get_llm_config()
        if not config:
            raise HTTPException(
                status_code=500, 
                detail="No LLM API key configured (MISTRAL_API_KEY or OPENAI_API_KEY)"
            )
        
        model = generate_system_model(request.description, llm_config=config)
        
        return GenerateResponse(
            success=True,
            model=model.model_dump(by_alias=True)
        )
    except Exception as e:
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


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
