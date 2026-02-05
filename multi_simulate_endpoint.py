"""
Multi-simulation batch execution endpoint.
"""

from typing import List
from fastapi import HTTPException

class MultiSimulateRequest(BaseModel):
    """Request to run multiple simulations with different configurations."""
    configs: List[Dict[str, Any]]  # List of simulation configurations
    base_model: Dict[str, Any]  # Base system model

class MultiSimulateResponse(BaseModel):
    """Response containing multiple simulation results."""
    success: bool
    results: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None

@app.post("/simulate-batch", response_model=MultiSimulateResponse)
async def simulate_batch(request: MultiSimulateRequest):
    """
    Run multiple simulations sequentially with different configurations.
    Each config can override:
    - dt, steps (simulation settings)
    - parameter values (component initial values)
    - influences (coefficients, kinds, etc.)
    """
    try:
        results = []
        
        for idx, config in enumerate(request.configs):
            # Create a copy of the base model
            model_dict = request.base_model.copy()
            
            # Apply simulation settings overrides
            if 'dt' in config:
                model_dict['simulation']['dt'] = config['dt']
            if 'steps' in config:
                model_dict['simulation']['steps'] = config['steps']
            
            # Apply parameter overrides
            if 'parameter_overrides' in config:
                for path, value in config['parameter_overrides'].items():
                    entity_name, comp_name = path.split('.')
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
        raise HTTPException(status_code=500, detail=str(e))
