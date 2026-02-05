"""
Visualization utilities for simulation results.

Provides matplotlib-based plotting for simulation analysis.
"""

import matplotlib.pyplot as plt
from typing import List, Optional, Dict, Any
from simulation import SimulationResult


def plot_simulation(
    result: SimulationResult,
    variables: Optional[List[str]] = None,
    title: str = "Simulation Results",
    figsize: tuple = (12, 6),
    save_path: Optional[str] = None
) -> plt.Figure:
    """
    Plot simulation results over time.
    
    Args:
        result: SimulationResult from simulation run
        variables: List of variables to plot (all if None)
        title: Plot title
        figsize: Figure size
        save_path: Optional path to save figure
    
    Returns:
        matplotlib Figure
    """
    if variables is None:
        variables = list(result.history[0].keys())
    
    fig, ax = plt.subplots(figsize=figsize)
    
    for var in variables:
        history = result.get_variable_history(var)
        ax.plot(result.time_points, history, label=var, linewidth=2)
    
    ax.set_xlabel("Time", fontsize=12)
    ax.set_ylabel("Value", fontsize=12)
    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.legend(loc='best', fontsize=10)
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    
    return fig


def plot_comparison(
    results: Dict[str, SimulationResult],
    variable: str,
    title: Optional[str] = None,
    figsize: tuple = (12, 6),
    save_path: Optional[str] = None
) -> plt.Figure:
    """
    Compare a variable across multiple simulation scenarios.
    
    Args:
        results: Dict mapping scenario names to SimulationResults
        variable: Variable to compare
        title: Plot title
        figsize: Figure size
        save_path: Optional path to save figure
    
    Returns:
        matplotlib Figure
    """
    fig, ax = plt.subplots(figsize=figsize)
    
    for name, result in results.items():
        history = result.get_variable_history(variable)
        ax.plot(result.time_points, history, label=name, linewidth=2)
    
    ax.set_xlabel("Time", fontsize=12)
    ax.set_ylabel(variable, fontsize=12)
    ax.set_title(title or f"Comparison: {variable}", fontsize=14, fontweight='bold')
    ax.legend(loc='best', fontsize=10)
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    
    return fig


def plot_entity_dashboard(
    result: SimulationResult,
    entity: str,
    figsize: tuple = (14, 8),
    save_path: Optional[str] = None
) -> plt.Figure:
    """
    Create a dashboard for all components of an entity.
    
    Args:
        result: SimulationResult from simulation
        entity: Entity name to visualize
        figsize: Figure size
        save_path: Optional path to save figure
    
    Returns:
        matplotlib Figure
    """
    entity_data = result.get_entity_history(entity)
    n_components = len(entity_data)
    
    if n_components == 0:
        raise ValueError(f"No components found for entity: {entity}")
    
    cols = min(3, n_components)
    rows = (n_components + cols - 1) // cols
    
    fig, axes = plt.subplots(rows, cols, figsize=figsize)
    if n_components == 1:
        axes = [[axes]]
    elif rows == 1:
        axes = [axes]
    
    fig.suptitle(f"Entity Dashboard: {entity}", fontsize=16, fontweight='bold')
    
    for idx, (comp_name, history) in enumerate(entity_data.items()):
        row = idx // cols
        col = idx % cols
        ax = axes[row][col] if rows > 1 else axes[0][col]
        
        ax.plot(result.time_points, history, linewidth=2, color='steelblue')
        ax.fill_between(result.time_points, history, alpha=0.3, color='steelblue')
        ax.set_title(comp_name, fontsize=12)
        ax.set_xlabel("Time", fontsize=10)
        ax.grid(True, alpha=0.3)
        
        # Show final value
        final = history[-1]
        ax.axhline(y=final, color='red', linestyle='--', alpha=0.5)
        ax.text(result.time_points[-1], final, f' {final:.2f}', 
                va='center', fontsize=9, color='red')
    
    # Hide unused axes
    for idx in range(n_components, rows * cols):
        row = idx // cols
        col = idx % cols
        axes[row][col].set_visible(False)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    
    return fig
