import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import type { Component, Influence } from '../types';
import { Calculator, List, Plus, Trash2, X, Eye } from 'lucide-react';
import { getDisplayLabel, formatValue, VIEW_MODE_CONFIGS } from '../lib/viewModes';
import { cn } from '../lib/utils';

export const Inspector: React.FC = () => {
    const { model, selectedNode, updateParameter, viewMode } = useStore();
    const config = VIEW_MODE_CONFIGS[viewMode];

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
    const { model, viewMode } = useStore();
    const [inspectorViewMode, setInspectorViewMode] = useState<'list' | 'equation'>('list');
    const [showAddInfluence, setShowAddInfluence] = useState(false);
    
    const config = VIEW_MODE_CONFIGS[viewMode];
    const displayName = getDisplayLabel(path, viewMode);

    // Get all possible source variables (excluding self)
    const allVariables: string[] = [];
    if (model) {
        Object.entries(model.entities).forEach(([entityName, entity]) => {
            Object.keys(entity.components).forEach(compName => {
                const varPath = `${entityName}.${compName}`;
                if (varPath !== path) {
                    allVariables.push(varPath);
                }
            });
        });
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="p-4 border-b">
                {config.showRawValues && (
                    <span className="text-xs font-mono text-muted-foreground bg-accent px-1.5 py-0.5 rounded">
                        {path}
                    </span>
                )}
                <h2 className="text-xl font-bold mt-2">{displayName}</h2>
                {!config.showRawValues && (
                    <p className="text-xs text-muted-foreground mt-1">{name}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 capitalize">
                        {component.type}
                    </span>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Current Value Display (for non-technical modes) */}
                {!config.showRawValues && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-xs text-muted-foreground">
                            {viewMode === 'executive' ? 'Current Performance' : 
                             viewMode === 'investor' ? 'Current Index' : 'Current Score'}
                        </p>
                        <p className="text-2xl font-bold text-primary mt-1">
                            {formatValue(component.initial, viewMode, component.min ?? 0, component.max ?? 1)}
                        </p>
                    </div>
                )}

                {/* Parameter Editing Section */}
                <div className="space-y-3 pb-4 border-b">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        {config.showRawValues ? 'Parameters' : 'Adjust Value'}
                    </h3>

                    {/* Initial Value */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex justify-between">
                            {config.showRawValues ? 'Initial Value' : 'Value'}
                            <span className="text-muted-foreground font-mono">
                                {config.showRawValues 
                                    ? component.initial.toFixed(4) 
                                    : formatValue(component.initial, viewMode, component.min ?? 0, component.max ?? 1)
                                }
                            </span>
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
                            <span>{config.showRawValues ? (component.min ?? 0) : formatValue(component.min ?? 0, viewMode, component.min ?? 0, component.max ?? 1)}</span>
                            <span>{config.showRawValues ? (component.max ?? 1) : formatValue(component.max ?? 1, viewMode, component.min ?? 0, component.max ?? 1)}</span>
                        </div>
                    </div>

                    {/* Min/Max Value Editors - Only show in technical mode */}
                    {config.showRawValues && (
                        <>
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
                        </>
                    )}
                </div>

                <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            {config.showFormulas ? 'Influences' : 'Factors'}
                            <span className="bg-secondary text-secondary-foreground text-[10px] px-1.5 rounded-full">
                                {component.influences.length}
                            </span>
                        </span>
                        <div className="flex items-center gap-1">
                            {/* Add Influence Button */}
                            <button
                                onClick={() => setShowAddInfluence(true)}
                                className="p-1 rounded hover:bg-green-100 text-green-600"
                                title="Add Influence"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                            {/* View Mode Toggle */}
                            <div className="flex items-center bg-secondary rounded-md p-0.5">
                                <button
                                    onClick={() => setInspectorViewMode('list')}
                                    className={`p-1 rounded ${inspectorViewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
                                    title="List View"
                                >
                                    <List className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setInspectorViewMode('equation')}
                                    className={`p-1 rounded ${inspectorViewMode === 'equation' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
                                    title="Equation View"
                                >
                                    <Calculator className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </h3>

                    {inspectorViewMode === 'list' ? (
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
                                    No incoming influences. Click + to add one.
                                </div>
                            )}
                        </div>
                    ) : (
                        <EquationView
                            componentName={name}
                            componentPath={path}
                            influences={component.influences}
                        />
                    )}
                </div>

                {/* Add Influence Modal */}
                {showAddInfluence && (
                    <AddInfluenceModal
                        componentPath={path}
                        availableVariables={allVariables}
                        existingInfluences={component.influences}
                        onClose={() => setShowAddInfluence(false)}
                    />
                )}
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
    const { updateInfluence, removeInfluence } = useStore();
    const [isExpanded, setIsExpanded] = useState(false);

    const kindColors = {
        positive: 'bg-green-100 text-green-700 border-green-200',
        negative: 'bg-red-100 text-red-700 border-red-200',
        decay: 'bg-orange-100 text-orange-700 border-orange-200',
        ratio: 'bg-purple-100 text-purple-700 border-purple-200',
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Remove influence from "${influence.from}"?`)) {
            removeInfluence(componentPath, index);
        }
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
                        <button
                            onClick={handleDelete}
                            className="p-1 rounded hover:bg-red-100 text-red-500"
                            title="Remove influence"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
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

// Equation View Component
interface EquationViewProps {
    componentName: string;
    componentPath: string;
    influences: Influence[];
}

const EquationView: React.FC<EquationViewProps> = ({ componentName, componentPath, influences }) => {
    const { updateInfluence } = useStore();
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const getFunctionSymbol = (func: string): string => {
        const symbols: Record<string, string> = {
            linear: '',
            sigmoid: 'σ',
            threshold: 'θ',
            division: '1/',
            square: '²',
            cubic: '³',
            sqrt: '√',
            exponential: 'e^',
            logarithmic: 'log',
            inverse_square: '1/²',
        };
        return symbols[func] || '';
    };

    const formatTerm = (inf: Influence): string => {
        const sign = inf.coef >= 0 ? '+' : '';
        const coef = Math.abs(inf.coef).toFixed(2);
        const funcSym = getFunctionSymbol(inf.function);
        const varName = inf.from.split('.').pop() || inf.from;
        
        if (inf.function === 'linear') {
            return `${sign} ${coef} × ${varName}`;
        } else if (inf.function === 'sqrt') {
            return `${sign} ${coef} × √(${varName})`;
        } else if (inf.function === 'square') {
            return `${sign} ${coef} × ${varName}²`;
        } else if (inf.function === 'cubic') {
            return `${sign} ${coef} × ${varName}³`;
        } else if (inf.function === 'exponential') {
            return `${sign} ${coef} × e^(${varName})`;
        } else if (inf.function === 'logarithmic') {
            return `${sign} ${coef} × log(${varName})`;
        } else if (inf.function === 'division') {
            return `${sign} ${coef} / ${varName}`;
        } else if (inf.function === 'inverse_square') {
            return `${sign} ${coef} / ${varName}²`;
        } else if (inf.function === 'sigmoid') {
            return `${sign} ${coef} × σ(${varName})`;
        } else if (inf.function === 'threshold') {
            return `${sign} ${coef} × θ(${varName})`;
        }
        return `${sign} ${coef} × ${funcSym}(${varName})`;
    };

    if (influences.length === 0) {
        return (
            <div className="p-4 bg-accent/30 rounded-lg border text-center">
                <div className="font-mono text-lg mb-2">
                    d({componentName})/dt = 0
                </div>
                <p className="text-xs text-muted-foreground">No influences on this component</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Main Equation Display */}
            <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="text-xs text-muted-foreground mb-1">Differential equation:</div>
                <div className="font-mono text-sm leading-relaxed">
                    <span className="text-blue-700 font-semibold">d({componentName})/dt</span>
                    <span className="mx-2">=</span>
                    <span className="text-gray-800">
                        {influences.filter(i => i.enabled).length === 0 ? '0' : (
                            influences
                                .filter(i => i.enabled)
                                .map((inf, i) => (
                                    <span key={i}>
                                        {i === 0 && inf.coef >= 0 ? '' : ''}
                                        {formatTerm(inf)}
                                    </span>
                                ))
                        )}
                    </span>
                </div>
            </div>

            {/* Editable Terms */}
            <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Click to edit terms:</div>
                {influences.map((inf, index) => (
                    <div
                        key={index}
                        className={`p-2 rounded border cursor-pointer transition-all ${
                            !inf.enabled ? 'opacity-40 bg-gray-50' : 'bg-white hover:border-blue-300 hover:shadow-sm'
                        } ${editingIndex === index ? 'ring-2 ring-blue-400' : ''}`}
                        onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="font-mono text-sm flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={inf.enabled}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        updateInfluence(componentPath, index, { enabled: e.target.checked });
                                    }}
                                    className="w-4 h-4"
                                />
                                <span className={inf.coef >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {formatTerm(inf)}
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground">{inf.kind}</span>
                        </div>

                        {/* Inline Editor */}
                        {editingIndex === index && (
                            <div className="mt-3 pt-3 border-t space-y-2" onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-muted-foreground">Coefficient</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={inf.coef}
                                            onChange={(e) => updateInfluence(componentPath, index, { coef: parseFloat(e.target.value) || 0 })}
                                            className="w-full text-xs px-2 py-1 border rounded font-mono"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] text-muted-foreground">Function</label>
                                        <select
                                            value={inf.function}
                                            onChange={(e) => updateInfluence(componentPath, index, { function: e.target.value })}
                                            className="w-full text-xs px-2 py-1 border rounded"
                                        >
                                            <option value="linear">Linear</option>
                                            <option value="sigmoid">Sigmoid</option>
                                            <option value="threshold">Threshold</option>
                                            <option value="square">Square</option>
                                            <option value="sqrt">Sqrt</option>
                                            <option value="exponential">Exp</option>
                                            <option value="logarithmic">Log</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Add Influence Modal
interface AddInfluenceModalProps {
    componentPath: string;
    availableVariables: string[];
    existingInfluences: Influence[];
    onClose: () => void;
}

const AddInfluenceModal: React.FC<AddInfluenceModalProps> = ({
    componentPath,
    availableVariables,
    existingInfluences,
    onClose
}) => {
    const { addInfluence } = useStore();
    const [selectedFrom, setSelectedFrom] = useState('');
    const [coef, setCoef] = useState(0.1);
    const [kind, setKind] = useState<'positive' | 'negative' | 'decay' | 'ratio'>('positive');
    const [func, setFunc] = useState('linear');

    // Filter out variables that already have an influence
    const existingFroms = new Set(existingInfluences.map(i => i.from));
    const filteredVariables = availableVariables.filter(v => !existingFroms.has(v));

    const handleAdd = () => {
        if (!selectedFrom) return;

        const newInfluence: Influence = {
            from: selectedFrom,
            kind,
            coef,
            function: func as any,
            enabled: true
        };

        addInfluence(componentPath, newInfluence);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-xl w-96 max-h-[80vh] overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold">Add Influence (Feedback)</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Source Variable */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Source Variable</label>
                        {filteredVariables.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">
                                All available variables are already influences.
                            </p>
                        ) : (
                            <select
                                value={selectedFrom}
                                onChange={(e) => setSelectedFrom(e.target.value)}
                                className="w-full px-3 py-2 border rounded text-sm"
                            >
                                <option value="">Select a variable...</option>
                                {filteredVariables.map(v => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Coefficient */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex justify-between">
                            Coefficient
                            <span className="font-mono text-muted-foreground">{coef.toFixed(2)}</span>
                        </label>
                        <input
                            type="range"
                            min="-2"
                            max="2"
                            step="0.05"
                            value={coef}
                            onChange={(e) => setCoef(parseFloat(e.target.value))}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>-2.0 (negative)</span>
                            <span>+2.0 (positive)</span>
                        </div>
                    </div>

                    {/* Kind */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Relationship Kind</label>
                        <select
                            value={kind}
                            onChange={(e) => setKind(e.target.value as any)}
                            className="w-full px-3 py-2 border rounded text-sm"
                        >
                            <option value="positive">Positive (enhances)</option>
                            <option value="negative">Negative (reduces)</option>
                            <option value="decay">Decay (self-limiting)</option>
                            <option value="ratio">Ratio (proportional)</option>
                        </select>
                    </div>

                    {/* Function */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Transfer Function</label>
                        <select
                            value={func}
                            onChange={(e) => setFunc(e.target.value)}
                            className="w-full px-3 py-2 border rounded text-sm"
                        >
                            <option value="linear">Linear (direct effect)</option>
                            <option value="sigmoid">Sigmoid (S-curve, saturation)</option>
                            <option value="threshold">Threshold (step function)</option>
                            <option value="square">Square (accelerating)</option>
                            <option value="sqrt">Square Root (diminishing)</option>
                            <option value="exponential">Exponential (rapid growth)</option>
                            <option value="logarithmic">Logarithmic (slow growth)</option>
                        </select>
                    </div>

                    {/* Preview */}
                    <div className="p-3 bg-blue-50 rounded border border-blue-200">
                        <div className="text-xs text-muted-foreground mb-1">Preview:</div>
                        <div className="font-mono text-sm">
                            d({componentPath.split('.')[1]})/dt += {coef >= 0 ? '+' : ''}{coef.toFixed(2)} × {func === 'linear' ? '' : `${func}(`}{selectedFrom ? selectedFrom.split('.')[1] : '?'}{func === 'linear' ? '' : ')'}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={!selectedFrom}
                        className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                    >
                        Add Influence
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};