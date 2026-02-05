import React from 'react';
import { useStore } from '../store/useStore';
import type { Component } from '../types';

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
                <div className="space-y-3">
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

                <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        Influences
                        <span className="bg-secondary text-secondary-foreground text-[10px] px-1.5 rounded-full">
                            {component.influences.length}
                        </span>
                    </h3>

                    <div className="space-y-2">
                        {component.influences.map((inf, i) => (
                            <div key={i} className="bg-card border rounded-md p-3 text-sm shadow-sm space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium truncate flex-1" title={inf.from}>
                                        ← {inf.from}
                                    </span>
                                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${inf.kind === 'positive' ? 'bg-green-100 text-green-700' :
                                            inf.kind === 'negative' ? 'bg-red-100 text-red-700' :
                                                'bg-orange-100 text-orange-700'
                                        }`}>
                                        {inf.coef > 0 ? '+' : ''}{inf.coef}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="capitalize">{inf.kind}</span>
                                    <span>•</span>
                                    <span className="capitalize">{inf.function}</span>
                                </div>
                            </div>
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
