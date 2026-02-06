"""
Export utilities for simulation results.

Provides functions to save simulation data to JSON and CSV formats.
"""

import json
import csv
from pathlib import Path
from typing import Optional, List
from .simulation import SimulationResult


def export_to_json(
    result: SimulationResult,
    filepath: str,
    include_metadata: bool = True
) -> None:
    """
    Export simulation results to JSON file.
    
    Args:
        result: SimulationResult to export
        filepath: Output file path
        include_metadata: Whether to include simulation metadata
    """
    data = {
        "time_points": result.time_points,
        "history": result.history,
        "final_state": result.final_state,
    }
    
    if include_metadata:
        data["metadata"] = result.metadata
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def export_to_csv(
    result: SimulationResult,
    filepath: str,
    variables: Optional[List[str]] = None
) -> None:
    """
    Export simulation results to CSV file.
    
    Args:
        result: SimulationResult to export
        filepath: Output file path
        variables: List of variables to include (all if None)
    """
    if variables is None:
        variables = list(result.history[0].keys())
    
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Header
        header = ['time'] + variables
        writer.writerow(header)
        
        # Data rows
        for i, state in enumerate(result.history):
            row = [result.time_points[i]]
            for var in variables:
                row.append(state.get(var, 0.0))
            writer.writerow(row)


def load_from_json(filepath: str) -> SimulationResult:
    """
    Load simulation results from JSON file.
    
    Args:
        filepath: Input file path
    
    Returns:
        SimulationResult instance
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return SimulationResult(
        history=data["history"],
        time_points=data["time_points"],
        final_state=data["final_state"],
        metadata=data.get("metadata", {})
    )
