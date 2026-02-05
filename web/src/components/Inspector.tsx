import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Component, Influence } from '../types';

export const Inspector: React.FC = () => {
    const { model, selectedNode, updateParameter } = useStore();

    if (!model || !selectedNode) return (
        <div className="p-8 text-center text-muted-foreground text-sm">
            Select an entity or component to view details.
        </div>
    );

    const isComponent = selectedNode.includes('.');

    if (isComponent) {
        const [entityName, compName] = selectedNode.split('.');
        const component = model.entities[entityName]?.components[compName];

        if (!component) return <div>Component not found</div>;

        return (
            <ComponentInspector
                path={selectedNode}
                name={compName}
                component={component}
                onUpdate={(val) => updateParameter(selectedNode, val)}
            />
        );
    } else {
        return (
            <div className="p-4">
                <h2 className="text-lg font-bold mb-4">{selectedNode}</h2>
                <div className="text-sm text-muted-foreground">Entity View</div>
                {/* Entity stats could go here */}
            </div>
        )
    }
};

interface ComponentInspectorProps {
    path: string;
    name: string;
    component: Component;
    onUpdate: (value: number) => void;
}

const ComponentInspector: React.FC<ComponentInspectorProps> = ({ path, name, component, onUpdate }) => {
    return (
        <div className="h-full overflow-y-auto">
            <div className="p-4 border-b">
                <span className="text-xs font-mono text-muted-foreground bg-accent px-1.5 py-0.5 rounded">
                    {path}
                </span>
                <h2 className="text-xl font-bold mt-2">{name}</h2>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 capitalize">
                        {component.type}
                    </span>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Parameter Editing Section */}
                <div className="space-y-3 pb-4 border-b">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Parameters
                    </h3>

                    {/* Initial Value */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex justify-between">
                            Initial Value
                            <span className="text-muted-foreground font-mono">{component.initial.toFixed(2)}</span>
                        </label>
                        <input
                            type="range"
                            min={component.min ?? 0}
                            max={component.max ?? 1}
                            step={0.01}
                            value={component.initial}
                            onChange={(e) => onUpdate(parseFloat(e.target.value))}
                            className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{component.min ?? 0}</span>
                            <span>{component.max ?? 1}</span>
                        </div>
                    </div>

                    {/* Min Value Editor */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Minimum Value</label>
                        <input
                            type="number"
                            step="0.1"
                            value={component.min ?? ''}
                            onChange={(e) => {
                                const { updateComponentParameter } = useStore.getState();
                                updateComponentParameter(path, {
                                    initial: component.initial,
                                    min: e.target.value ? parseFloat(e.target.value) : null,
                                    max: component.max ?? null,
                                });
                            }}
                            className="w-full text-xs px-2 py-1.5 border rounded bg-background"
                            placeholder="No minimum"
                        />
                    </div>

                    {/* Max Value Editor */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Maximum Value</label>
                        <input
                            type="number"
                            step="0.1"
                            value={component.max ?? ''}
                            onChange={(e) => {
                                const { updateComponentParameter } = useStore.getState();
                                updateComponentParameter(path, {
                                    initial: component.initial,
                                    min: component.min ?? null,
                                    max: e.target.value ? parseFloat(e.target.value) : null,
                                });
                            }}
                            className="w-full text-xs px-2 py-1.5 border rounded bg-background"
                            placeholder="No maximum"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        Influences
                        <span className="bg-secondary text-secondary-foreground text-[10px] px-1.5 rounded-full">
                            {component.influences.length}
                        </span>
                    </h3>

                    <div className="space-y-2">
                        {component.influences.map((inf, i) => (
                            <InfluenceEditor
                                key={i}
                                influence={inf}
                                index={i}
                                componentPath={path}
                            />
                        ))}
                        {component.influences.length === 0 && (
                            <div className="text-xs text-muted-foreground italic text-center py-2">
                                No incoming influences.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface InfluenceEditorProps {
    influence: Influence;
    index: number;
    componentPath: string;
}

const InfluenceEditor: React.FC<InfluenceEditorProps> = ({ influence, index, componentPath }) => {
    const { updateInfluence } = useStore();
    const [isExpanded, setIsExpanded] = useState(false);

    const kindColors = {
        positive: 'bg-green-100 text-green-700 border-green-200',
        negative: 'bg-red-100 text-red-700 border-red-200',
        decay: 'bg-orange-100 text-orange-700 border-orange-200',
        ratio: 'bg-purple-100 text-purple-700 border-purple-200',
    };

    return (
        <div className={`bg-card border rounded-md overflow-hidden shadow-sm ${!influence.enabled ? 'opacity-60' : ''}`}>
            <div
                className="p-3 text-sm cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                            type="checkbox"
                            checked={influence.enabled}
                            onChange={(e) => {
                                e.stopPropagation();
                                updateInfluence(componentPath, index, { enabled: e.target.checked });
                            }}
                            className="w-4 h-4 accent-primary"
                        />
                        <span className="font-medium truncate flex-1" title={influence.from}>
                            ← {influence.from}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${kindColors[influence.kind]}`}>
                            {influence.coef > 0 ? '+' : ''}{influence.coef.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {isExpanded ? '▼' : '▶'}
                        </span>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="px-3 pb-3 space-y-3 bg-accent/20 border-t">
                    {/* Coefficient Editor */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium flex justify-between">
                            Coefficient
                            <input
                                type="number"
                                step="0.01"
                                value={influence.coef}
                                onChange={(e) => updateInfluence(componentPath, index, { coef: parseFloat(e.target.value) || 0 })}
                                className="w-20 text-xs px-1 py-0.5 border rounded font-mono text-right"
                            />
                        </label>
                        <input
                            type="range"
                            min="-2"
                            max="2"
                            step="0.01"
                            value={influence.coef}
                            onChange={(e) => updateInfluence(componentPath, index, { coef: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>-2.0</span>
                            <span>0</span>
                            <span>+2.0</span>
                        </div>
                    </div>

                    {/* Kind Selector */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Kind</label>
                        <select
                            value={influence.kind}
                            onChange={(e) => updateInfluence(componentPath, index, { kind: e.target.value })}
                            className="w-full text-xs px-2 py-1.5 border rounded bg-background"
                        >
                            <option value="positive">Positive</option>
                            <option value="negative">Negative</option>
                            <option value="decay">Decay</option>
                            <option value="ratio">Ratio</option>
                        </select>
                    </div>

                    {/* Function Selector */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Function</label>
                        <select
                            value={influence.function}
                            onChange={(e) => updateInfluence(componentPath, index, { function: e.target.value })}
                            className="w-full text-xs px-2 py-1.5 border rounded bg-background"
                        >
                            <option value="linear">Linear (x)</option>
                            <option value="sigmoid">Sigmoid (S-curve)</option>
                            <option value="threshold">Threshold (step)</option>
                            <option value="division">Division (1/x)</option>
                            <option value="square">Square (x²)</option>
                            <option value="cubic">Cubic (x³)</option>
                            <option value="sqrt">Square Root (√x)</option>
                            <option value="exponential">Exponential (eˣ)</option>
                            <option value="logarithmic">Logarithmic (log x)</option>
                            <option value="inverse_square">Inverse Square (1/x²)</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};
