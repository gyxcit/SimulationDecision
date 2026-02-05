import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useStore } from '../store/useStore';

const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--destructive))',
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
];

export const ResultsPanel: React.FC = () => {
    const { model, simulationResult, selectedNode } = useStore();

    if (!simulationResult) return (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Run a simulation to see results.
        </div>
    );

    // Prepare data for Recharts
    // simulationResult.history is [{ varA: 1, varB: 2 }, ...]
    // simulationResult.time_points is [0, 0.1, ...]
    const data = simulationResult.time_points.map((t, i) => ({
        time: t.toFixed(2),
        ...simulationResult.history[i]
    }));

    // Determine which keys to display
    // If a node is selected, show it (and maybe its influences?). 
    // For now, if nothing selected, show all states. If entity selected, show all its comps. If comp selected, show it.

    let keys: string[] = [];

    if (selectedNode) {
        if (selectedNode.includes('.')) {
            // Component selected
            keys = [selectedNode.split('.')[1]]; // Assuming variable names are unique globally or we need full path matching
            // Actually the history keys are "EntityName.ComponentName" likely, let's verify backend format.
            // Backend simulation history keys: `variable_name`. 
            // In the flattened simulation state, keys are strings. 
            // The User might name things "Rabbit.Population".
            // Let's assume the keys in history match whatever `selectedNode` is or are relative.

            // Wait, Python `simulate` returns dict where keys are whatever was in `system_model`.
            // The `generate_system_model` creates entities with components.
            // The simulation engine flattens them as `EntityName.ComponentName`.

            keys = [selectedNode];
        } else {
            // Entity selected - show all components of this entity
            if (model?.entities[selectedNode]) {
                keys = Object.keys(model.entities[selectedNode].components).map(c => `${selectedNode}.${c}`);
            }
        }
    } else {
        // Show all if nothing selected (might be too busy, let's limit to first 5)
        if (data.length > 0) {
            const allKeys = Object.keys(data[0]).filter(k => k !== 'time');
            keys = allKeys.slice(0, 5);
        }
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 p-4 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            {keys.map((key, index) => (
                                <linearGradient key={key} id={`color-${key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.1} />
                                    <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <XAxis dataKey="time" minTickGap={50} tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--popover))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: 'var(--radius)',
                                fontSize: '12px'
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        {keys.map((key, index) => (
                            <Area
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={COLORS[index % COLORS.length]}
                                fillOpacity={1}
                                fill={`url(#color-${key})`}
                                strokeWidth={2}
                                isAnimationActive={false}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
