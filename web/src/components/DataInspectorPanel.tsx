import React from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { Database, X, ChevronDown, ChevronRight, Activity, Hash, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DataInspectorPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DataInspectorPanel: React.FC<DataInspectorPanelProps> = ({ isOpen, onClose }) => {
    const { model, simulationResult, selectedNode } = useStore();
    const [expandedEntities, setExpandedEntities] = React.useState<Set<string>>(new Set());

    // Expand all by default when model changes
    React.useEffect(() => {
        if (model) {
            setExpandedEntities(new Set(Object.keys(model.entities)));
        }
    }, [model]);

    if (!isOpen) return null;

    const toggleEntity = (name: string) => {
        setExpandedEntities(prev => {
            const newSet = new Set(prev);
            if (newSet.has(name)) {
                newSet.delete(name);
            } else {
                newSet.add(name);
            }
            return newSet;
        });
    };

    // Get current values from simulation or model
    const getCurrentValue = (entityName: string, compName: string): number => {
        const path = `${entityName}.${compName}`;
        if (simulationResult?.final_state?.[path] !== undefined) {
            return simulationResult.final_state[path];
        }
        return model?.entities[entityName]?.components[compName]?.initial ?? 0;
    };

    // Get initial value
    const getInitialValue = (entityName: string, compName: string): number => {
        return model?.entities[entityName]?.components[compName]?.initial ?? 0;
    };

    // Format value for display
    const formatValue = (value: number): string => {
        if (value === undefined || value === null) return 'N/A';
        if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
        if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(2)}K`;
        if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(2);
        if (Number.isInteger(value)) return value.toString();
        return value.toFixed(2);
    };

    // Get trend icon based on change
    const getTrendIcon = (current: number, initial: number) => {
        if (!simulationResult) return null;
        const change = current - initial;
        const percentChange = initial !== 0 ? (change / Math.abs(initial)) * 100 : 0;
        
        if (percentChange > 5) {
            return <TrendingUp className="w-3 h-3 text-green-500" />;
        } else if (percentChange < -5) {
            return <TrendingDown className="w-3 h-3 text-red-500" />;
        }
        return <Minus className="w-3 h-3 text-gray-400" />;
    };

    // Get selected entity/component info
    const getSelectedInfo = () => {
        if (!selectedNode || !model) return null;
        
        const parts = selectedNode.split('.');
        if (parts.length === 2) {
            // Component selected
            const [entityName, compName] = parts;
            const component = model.entities[entityName]?.components[compName];
            if (!component) return null;
            
            return {
                type: 'component' as const,
                entityName,
                componentName: compName,
                component,
                currentValue: getCurrentValue(entityName, compName),
                initialValue: getInitialValue(entityName, compName)
            };
        } else {
            // Entity selected
            const entity = model.entities[selectedNode];
            if (!entity) return null;
            
            return {
                type: 'entity' as const,
                entityName: selectedNode,
                entity,
                components: Object.entries(entity.components).map(([name, comp]) => ({
                    name,
                    ...comp,
                    currentValue: getCurrentValue(selectedNode, name),
                    initialValue: getInitialValue(selectedNode, name)
                }))
            };
        }
    };

    const selectedInfo = getSelectedInfo();

    return (
        <div className="fixed right-4 top-20 w-80 bg-card border rounded-xl shadow-2xl z-50 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    <span className="font-semibold">Data Inspector</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Selected Node Details */}
                {selectedInfo && (
                    <div className="p-3 bg-primary/5 border-b">
                        <h3 className="font-semibold text-sm text-primary mb-2 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Sélection: {selectedInfo.type === 'component' 
                                ? `${selectedInfo.entityName}.${selectedInfo.componentName}` 
                                : selectedInfo.entityName}
                        </h3>
                        
                        {selectedInfo.type === 'component' ? (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="p-2 bg-background rounded border">
                                        <div className="text-xs text-muted-foreground">Actuel</div>
                                        <div className="font-mono font-bold text-lg flex items-center gap-1">
                                            {formatValue(selectedInfo.currentValue)}
                                            {getTrendIcon(selectedInfo.currentValue, selectedInfo.initialValue)}
                                        </div>
                                    </div>
                                    <div className="p-2 bg-background rounded border">
                                        <div className="text-xs text-muted-foreground">Initial</div>
                                        <div className="font-mono">{formatValue(selectedInfo.initialValue)}</div>
                                    </div>
                                    {selectedInfo.component.min !== null && selectedInfo.component.min !== undefined && (
                                        <div className="p-2 bg-background rounded border">
                                            <div className="text-xs text-muted-foreground">Min</div>
                                            <div className="font-mono">{formatValue(selectedInfo.component.min)}</div>
                                        </div>
                                    )}
                                    {selectedInfo.component.max !== null && selectedInfo.component.max !== undefined && (
                                        <div className="p-2 bg-background rounded border">
                                            <div className="text-xs text-muted-foreground">Max</div>
                                            <div className="font-mono">{formatValue(selectedInfo.component.max)}</div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Progress bar if min/max defined */}
                                {selectedInfo.component.min != null && selectedInfo.component.max != null && (
                                    <div className="mt-2">
                                        <div className="text-xs text-muted-foreground mb-1">
                                            Position dans la plage
                                        </div>
                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                                                style={{ 
                                                    width: `${Math.min(100, Math.max(0, 
                                                        ((selectedInfo.currentValue - (selectedInfo.component.min ?? 0)) / 
                                                        ((selectedInfo.component.max ?? 1) - (selectedInfo.component.min ?? 0))) * 100
                                                    ))}%` 
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                {/* Influences */}
                                {selectedInfo.component.influences && selectedInfo.component.influences.length > 0 && (
                                    <div className="mt-3 pt-3 border-t">
                                        <div className="text-xs font-medium mb-2">
                                            Influences ({selectedInfo.component.influences.length})
                                        </div>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {selectedInfo.component.influences.map((inf: any, i: number) => (
                                                <div key={i} className="text-xs flex items-center gap-2 p-1 bg-background rounded">
                                                    <span className={cn(
                                                        "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                                        inf.kind === 'positive' ? 'bg-green-100 text-green-700' :
                                                        inf.kind === 'negative' ? 'bg-red-100 text-red-700' :
                                                        inf.kind === 'decay' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    )}>
                                                        {inf.kind}
                                                    </span>
                                                    <span className="font-mono flex-1 truncate">{inf.from}</span>
                                                    <span className="text-muted-foreground">×{inf.coef}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                {selectedInfo.components.map((comp: any) => (
                                    <div key={comp.name} className="flex items-center justify-between p-2 bg-background rounded border text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "w-2 h-2 rounded-full",
                                                comp.type === 'state' ? 'bg-blue-500' :
                                                comp.type === 'computed' ? 'bg-green-500' : 'bg-gray-500'
                                            )} />
                                            <span className="truncate">{comp.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 font-mono">
                                            {formatValue(comp.currentValue)}
                                            {getTrendIcon(comp.currentValue, comp.initialValue)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* All Entities & Components */}
                <div className="p-3">
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        Toutes les données
                    </h3>
                    
                    {!model ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                            Aucun modèle chargé
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {Object.entries(model.entities).map(([entityName, entity]) => (
                                <div key={entityName} className="border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleEntity(entityName)}
                                        className={cn(
                                            "w-full p-2 flex items-center justify-between text-sm transition-colors",
                                            selectedNode === entityName ? "bg-primary/10" : "bg-muted/50 hover:bg-muted"
                                        )}
                                    >
                                        <span className="font-medium">{entityName}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">
                                                {Object.keys(entity.components).length}
                                            </span>
                                            {expandedEntities.has(entityName) 
                                                ? <ChevronDown className="w-4 h-4" />
                                                : <ChevronRight className="w-4 h-4" />
                                            }
                                        </div>
                                    </button>
                                    
                                    {expandedEntities.has(entityName) && (
                                        <div className="p-1.5 space-y-1 bg-background">
                                            {Object.entries(entity.components).map(([compName, comp]) => {
                                                const currentValue = getCurrentValue(entityName, compName);
                                                const initialValue = getInitialValue(entityName, compName);
                                                const isSelected = selectedNode === `${entityName}.${compName}`;
                                                
                                                return (
                                                    <div 
                                                        key={compName}
                                                        className={cn(
                                                            "flex items-center justify-between p-1.5 rounded text-xs",
                                                            isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <span className={cn(
                                                                "w-2 h-2 rounded-full flex-shrink-0",
                                                                comp.type === 'state' ? 'bg-blue-500' :
                                                                comp.type === 'computed' ? 'bg-green-500' : 'bg-gray-500'
                                                            )} />
                                                            <span className="truncate">{compName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 font-mono flex-shrink-0">
                                                            {formatValue(currentValue)}
                                                            {getTrendIcon(currentValue, initialValue)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Simulation Status */}
                {simulationResult && (
                    <div className="p-3 border-t bg-green-50/50">
                        <div className="flex items-center gap-2 text-green-700 text-xs">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span>Simulation: {simulationResult.time_points.length} points</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataInspectorPanel;
