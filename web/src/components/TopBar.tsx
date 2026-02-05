import React from 'react';
import { Play, RotateCcw, Download, Upload, Activity } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

export const TopBar: React.FC = () => {
    const { model, runSimulation, isLoading } = useStore();

    return (
        <div className="h-14 border-b bg-card flex items-center px-4 justify-between shadow-sm">
            <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-2 rounded-lg">
                    <Activity className="w-5 h-5 text-primary" />
                </div>
                <h1 className="font-bold text-lg">HybridSystem V5</h1>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 border-r pr-4">
                    {/* Simulation Controls */}
                    <button
                        onClick={runSimulation}
                        disabled={!model || isLoading}
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
