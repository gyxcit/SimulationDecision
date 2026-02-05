import React from 'react';
import { useStore } from '../store/useStore';

export const SimulationConfig: React.FC = () => {
    const { model, updateSimulationConfig } = useStore();

    if (!model) return null;

    const dtUnits = [
        { value: 1, label: 'Secondes' },
        { value: 60, label: 'Minutes' },
        { value: 3600, label: 'Heures' },
        { value: 86400, label: 'Jours' },
        { value: 604800, label: 'Semaines' },
        { value: 2592000, label: 'Mois (30j)' },
        { value: 31536000, label: 'Années' },
        { value: 0.001, label: 'Millisecondes' },
        { value: 0.000001, label: 'Microsecondes' },
    ];

    return (
        <div className="px-4 py-3 space-y-4">
            {/* Time Step Configuration */}
            <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pas de Simulation (dt)
                </h3>

                {/* Numeric Input */}
                <div className="space-y-1">
                    <label className="text-xs font-medium">Valeur</label>
                    <input
                        type="number"
                        step="0.001"
                        value={model.simulation.dt}
                        onChange={(e) => updateSimulationConfig({ dt: parseFloat(e.target.value) || 0.01 })}
                        className="w-full text-sm px-3 py-2 border rounded bg-background"
                    />
                </div>

                {/* Predefined Units Dropdown */}
                <div className="space-y-1">
                    <label className="text-xs font-medium">Unités prédéfinies</label>
                    <select
                        onChange={(e) => {
                            const multiplier = parseFloat(e.target.value);
                            if (multiplier > 0) {
                                updateSimulationConfig({ dt: multiplier });
                            }
                        }}
                        className="w-full text-sm px-3 py-2 border rounded bg-background"
                        defaultValue=""
                    >
                        <option value="" disabled>Choisir une unité...</option>
                        {dtUnits.map(unit => (
                            <option key={unit.value} value={unit.value}>
                                {unit.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Custom Unit Field */}
                <div className="space-y-1">
                    <label className="text-xs font-medium">Unité personnalisée</label>
                    <input
                        type="text"
                        placeholder="ex: €, unités, points..."
                        className="w-full text-sm px-3 py-2 border rounded bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                        Le pas peut représenter du temps, de l'argent, ou toute autre unité
                    </p>
                </div>
            </div>

            {/* Steps Configuration */}
            <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nombre d'Itérations
                </h3>

                <div className="space-y-1">
                    <label className="text-xs font-medium flex justify-between">
                        <span>Itérations</span>
                        <span className="font-mono text-muted-foreground">{model.simulation.steps}</span>
                    </label>
                    <input
                        type="number"
                        min="1"
                        step="1"
                        value={model.simulation.steps}
                        onChange={(e) => updateSimulationConfig({ steps: parseInt(e.target.value) || 100 })}
                        className="w-full text-sm px-3 py-2 border rounded bg-background"
                    />
                    <input
                        type="range"
                        min="10"
                        max="1000"
                        step="10"
                        value={model.simulation.steps}
                        onChange={(e) => updateSimulationConfig({ steps: parseInt(e.target.value) })}
                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>10</span>
                        <span>1000</span>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="text-xs bg-accent/20 p-3 rounded border">
                <div className="flex justify-between mb-1">
                    <span className="font-medium">Durée totale:</span>
                    <span className="font-mono">{(model.simulation.dt * model.simulation.steps).toFixed(3)}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                    {model.simulation.steps} itérations × {model.simulation.dt} = résultat final
                </div>
            </div>
        </div>
    );
};
