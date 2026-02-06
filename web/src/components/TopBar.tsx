import React from 'react';
import { Play, RotateCcw, Download, Upload, Activity, Home, Box, Layers, Database } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { ViewModeSelector } from './ViewModeSelector';

interface TopBarProps {
    currentView?: 'canvas' | 'simulations' | 'visualization';
    onNavigateHome?: () => void;
    showDataInspector?: boolean;
    onToggleDataInspector?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ currentView = 'canvas', onNavigateHome, showDataInspector, onToggleDataInspector }) => {
    const { model, runSimulation, isLoading, showEntityBoxes, toggleEntityBoxes } = useStore();

    return (
        <div className="h-14 border-b bg-card flex items-center px-4 justify-between shadow-sm">
            <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                    <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h1 className="font-bold text-lg">HybridSystem V5</h1>
                    <p className="text-xs text-muted-foreground">
                        {currentView === 'canvas' ? 'System Canvas' : 'Multi-Simulations'}
                    </p>
                </div>

                {/* Navigation Breadcrumb */}
                {currentView === 'simulations' && onNavigateHome && (
                    <button
                        onClick={onNavigateHome}
                        className="ml-2 flex items-center gap-1 px-3 py-1 text-sm hover:bg-accent rounded-md transition-colors"
                    >
                        <Home className="w-3.5 h-3.5" />
                        Return to Canvas
                    </button>
                )}
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 border-r pr-4">
                    {/* Simulation Controls */}
                    <button
                        onClick={runSimulation}
                        disabled={!model || isLoading || currentView === 'simulations'}
                        className={cn(
                            "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                            "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        )}
                    >
                        <Play className="w-4 h-4 fill-current" />
                        Run
                    </button>

                    <button
                        className="p-1.5 hover:bg-accent rounded-md text-muted-foreground"
                        title="Reset"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Entity Boxes Toggle - Only show on canvas view */}
                    {currentView === 'canvas' && (
                        <button
                            onClick={toggleEntityBoxes}
                            className={cn(
                                "p-1.5 rounded-md transition-colors",
                                showEntityBoxes 
                                    ? "bg-primary/10 text-primary hover:bg-primary/20" 
                                    : "hover:bg-accent text-muted-foreground"
                            )}
                            title={showEntityBoxes ? "Masquer les boîtes d'entités" : "Afficher les boîtes d'entités"}
                        >
                            {showEntityBoxes ? <Box className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                        </button>
                    )}

                    {/* Data Inspector Toggle - Only show on canvas view */}
                    {currentView === 'canvas' && onToggleDataInspector && (
                        <button
                            onClick={onToggleDataInspector}
                            className={cn(
                                "p-1.5 rounded-md transition-colors",
                                showDataInspector 
                                    ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20" 
                                    : "hover:bg-accent text-muted-foreground"
                            )}
                            title={showDataInspector ? "Fermer le Data Inspector" : "Ouvrir le Data Inspector"}
                        >
                            <Database className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Steps:</span>
                        <input
                            type="number"
                            className="w-16 px-2 py-1 border rounded-md bg-transparent"
                            value={model?.simulation.steps || 100}
                            readOnly
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">dt:</span>
                        <input
                            type="number"
                            className="w-16 px-2 py-1 border rounded-md bg-transparent"
                            value={model?.simulation.dt || 0.1}
                            readOnly
                        />
                    </div>
                </div>

                {/* View Mode Selector */}
                <div className="border-l pl-4">
                    <ViewModeSelector />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-accent rounded-md text-muted-foreground">
                    <Upload className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-accent rounded-md text-muted-foreground">
                    <Download className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
