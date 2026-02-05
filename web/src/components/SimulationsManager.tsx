import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { BatchSimConfig } from '../store/useStore';
import { Trash2, Edit3, Check, X, Eye, Clock, Activity, ChevronRight, ChevronDown, Play, Settings, RotateCcw, Plus, Layers, Sliders } from 'lucide-react';
import { cn } from '../lib/utils';
import type { SystemModel, Influence, InfluenceFunction } from '../types';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

// Deep clone a model
const cloneModel = (model: SystemModel): SystemModel => JSON.parse(JSON.stringify(model));

export const SimulationsManager: React.FC = () => {
    const { model, storedSimulations, removeStoredSimulation, renameStoredSimulation, runBatchSimulations, isLoading } = useStore();
    const [selectedSimulations, setSelectedSimulations] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [expandedSim, setExpandedSim] = useState<string | null>(null);
    
    // New simulation config panel
    const [showConfigPanel, setShowConfigPanel] = useState(false);
    const [configModel, setConfigModel] = useState<SystemModel | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
    const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());
    const [newSimName, setNewSimName] = useState('');

    // Batch simulation state
    const [showBatchPanel, setShowBatchPanel] = useState(false);
    const [batchConfig, setBatchConfig] = useState<BatchSimConfig>({
        parameter: '',
        minValue: 0,
        maxValue: 1,
        steps: 5
    });

    // Get variables from model
    const variables = useMemo(() => {
        if (!model) return [];
        const vars: string[] = [];
        Object.entries(model.entities).forEach(([entityName, entity]) => {
            Object.keys(entity.components).forEach(compName => {
                vars.push(`${entityName}.${compName}`);
            });
        });
        return vars;
    }, [model]);

    // Initialize config model when opening panel
    const openConfigPanel = () => {
        if (model) {
            setConfigModel(cloneModel(model));
            setNewSimName(`Simulation ${storedSimulations.length + 1}`);
            setShowConfigPanel(true);
            setShowBatchPanel(false);
            // Expand first entity by default
            const firstEntity = Object.keys(model.entities)[0];
            if (firstEntity) {
                setExpandedEntities(new Set([firstEntity]));
            }
        }
    };

    // Open batch simulation panel
    const openBatchPanel = () => {
        if (model && variables.length > 0) {
            setBatchConfig({
                parameter: variables[0],
                minValue: 0,
                maxValue: 1,
                steps: 5
            });
            setShowBatchPanel(true);
            setShowConfigPanel(false);
        }
    };

    // Run batch simulations
    const handleRunBatch = async () => {
        if (!batchConfig.parameter) return;
        await runBatchSimulations(batchConfig);
        setShowBatchPanel(false);
    };

    const resetConfig = () => {
        if (model) {
            setConfigModel(cloneModel(model));
        }
    };

    // Run simulation with config model
    const runSimulation = async () => {
        if (!configModel) return;
        
        setIsRunning(true);
        try {
            const response = await axios.post(`${API_URL}/simulate`, {
                model: configModel,
                steps: configModel.simulation.steps,
                dt: configModel.simulation.dt
            });

            if (response.data.success) {
                // Extract variable names
                const vars: string[] = [];
                Object.entries(configModel.entities).forEach(([entityName, entity]) => {
                    Object.keys(entity.components).forEach(compName => {
                        vars.push(`${entityName}.${compName}`);
                    });
                });

                // Store the simulation result
                const { storedSimulations: currentSims } = useStore.getState();
                const newSim = {
                    id: `sim-${Date.now()}`,
                    name: newSimName || `Simulation ${currentSims.length + 1}`,
                    timestamp: new Date(),
                    result: {
                        time_points: response.data.time_points,
                        history: response.data.history,
                        final_state: response.data.final_state
                    },
                    variables: vars
                };

                // Add to stored simulations
                const newSimulations = [...currentSims, newSim];
                useStore.setState({ storedSimulations: newSimulations });
                
                // Save to localStorage
                localStorage.setItem('industriel_ai_simulations', JSON.stringify(newSimulations));

                // Close panel and reset
                setShowConfigPanel(false);
                setNewSimName('');
            }
        } catch (error) {
            console.error('Simulation failed:', error);
            alert('La simulation a échoué. Vérifiez la console pour plus de détails.');
        } finally {
            setIsRunning(false);
        }
    };

    // Update config model parameter
    const updateConfigParameter = (entityName: string, compName: string, field: 'initial' | 'min' | 'max', value: number | null) => {
        if (!configModel) return;
        
        setConfigModel(prev => {
            if (!prev) return prev;
            const newModel = cloneModel(prev);
            if (newModel.entities[entityName]?.components[compName]) {
                if (field === 'initial') {
                    newModel.entities[entityName].components[compName].initial = value as number;
                } else {
                    newModel.entities[entityName].components[compName][field] = value;
                }
            }
            return newModel;
        });
    };

    // Update config model influence
    const updateConfigInfluence = (entityName: string, compName: string, influenceIndex: number, updates: Partial<Influence>) => {
        if (!configModel) return;
        
        setConfigModel(prev => {
            if (!prev) return prev;
            const newModel = cloneModel(prev);
            const influence = newModel.entities[entityName]?.components[compName]?.influences[influenceIndex];
            if (influence) {
                Object.assign(influence, updates);
            }
            return newModel;
        });
    };

    // Update simulation settings
    const updateSimulationSettings = (field: 'dt' | 'steps', value: number) => {
        if (!configModel) return;
        
        setConfigModel(prev => {
            if (!prev) return prev;
            const newModel = cloneModel(prev);
            newModel.simulation[field] = value;
            return newModel;
        });
    };

    const toggleEntity = (entityName: string) => {
        setExpandedEntities(prev => {
            const newSet = new Set(prev);
            if (newSet.has(entityName)) {
                newSet.delete(entityName);
            } else {
                newSet.add(entityName);
            }
            return newSet;
        });
    };

    const toggleComponent = (path: string) => {
        setExpandedComponents(prev => {
            const newSet = new Set(prev);
            if (newSet.has(path)) {
                newSet.delete(path);
            } else {
                newSet.add(path);
            }
            return newSet;
        });
    };

    if (!model) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground p-4">
                <div className="text-center">
                    <Activity className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Aucun modèle</h2>
                    <p>Générez un modèle pour gérer vos simulations</p>
                </div>
            </div>
        );
    }

    const toggleSimulation = (id: string) => {
        setSelectedSimulations(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const selectAll = () => {
        setSelectedSimulations(new Set(storedSimulations.map(s => s.id)));
    };

    const selectNone = () => {
        setSelectedSimulations(new Set());
    };

    const deleteSelected = () => {
        selectedSimulations.forEach(id => {
            removeStoredSimulation(id);
        });
        setSelectedSimulations(new Set());
    };

    const startEditing = (id: string, currentName: string) => {
        setEditingId(id);
        setEditingName(currentName);
    };

    const saveEditing = () => {
        if (editingId && editingName.trim()) {
            renameStoredSimulation(editingId, editingName.trim());
        }
        setEditingId(null);
        setEditingName('');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditingName('');
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    // Get statistics for a simulation
    const getSimStats = (sim: typeof storedSimulations[0]) => {
        const history = sim.result.history;
        if (!history || history.length === 0) return null;
        
        const initial = history[0];
        const final = history[history.length - 1];
        const timePoints = sim.result.time_points;
        
        return {
            duration: timePoints[timePoints.length - 1] - timePoints[0],
            steps: history.length,
            variables: Object.keys(initial).length,
            changes: sim.variables.map(v => ({
                name: v,
                initial: initial[v] ?? 0,
                final: final[v] ?? 0,
                change: ((final[v] ?? 0) - (initial[v] ?? 0))
            }))
        };
    };

    const selectedSimsData = storedSimulations.filter(s => selectedSimulations.has(s.id));

    // Kind colors for influences
    const kindColors: Record<string, string> = {
        positive: 'bg-green-100 text-green-700 border-green-200',
        negative: 'bg-red-100 text-red-700 border-red-200',
        decay: 'bg-orange-100 text-orange-700 border-orange-200',
        ratio: 'bg-purple-100 text-purple-700 border-purple-200',
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-card">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Gestionnaire de Simulations</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {storedSimulations.length} simulation{storedSimulations.length !== 1 ? 's' : ''} sauvegardée{storedSimulations.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={openConfigPanel}
                            className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors flex items-center gap-2 font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Nouvelle Simulation
                        </button>
                        <button
                            onClick={openBatchPanel}
                            className="px-4 py-2 text-sm bg-orange-500 text-white hover:bg-orange-600 rounded-md transition-colors flex items-center gap-2 font-medium"
                            title="Run multiple simulations with parameter sweep"
                        >
                            <Layers className="w-4 h-4" />
                            Batch (Plage)
                        </button>
                        <button
                            onClick={selectAll}
                            className="px-3 py-2 text-sm bg-accent hover:bg-accent/80 rounded-md transition-colors"
                        >
                            Tout
                        </button>
                        <button
                            onClick={selectNone}
                            className="px-3 py-2 text-sm bg-accent hover:bg-accent/80 rounded-md transition-colors"
                        >
                            Aucun
                        </button>
                        {selectedSimulations.size > 0 && (
                            <button
                                onClick={deleteSelected}
                                className="px-3 py-2 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md transition-colors flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Supprimer ({selectedSimulations.size})
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Simulation List */}
                <div className={cn(
                    "border-r bg-card flex flex-col transition-all",
                    (showConfigPanel || showBatchPanel) ? "w-72" : "w-96"
                )}>
                    <div className="p-3 border-b bg-muted/30">
                        <h2 className="font-semibold text-sm">Simulations</h2>
                        <p className="text-xs text-muted-foreground mt-1">
                            Cochez pour comparer
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {storedSimulations.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <Activity className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                                <p className="text-sm font-medium mb-1">Aucune simulation</p>
                                <p className="text-xs mb-4">
                                    Lancez une simulation depuis le canvas<br />
                                    ou créez-en une nouvelle
                                </p>
                                <button
                                    onClick={openConfigPanel}
                                    className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
                                >
                                    Nouvelle Simulation
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {storedSimulations.map((sim) => {
                                    const stats = getSimStats(sim);
                                    const isSelected = selectedSimulations.has(sim.id);
                                    const isExpanded = expandedSim === sim.id;
                                    
                                    return (
                                        <div
                                            key={sim.id}
                                            className={cn(
                                                "transition-colors",
                                                isSelected ? "bg-primary/5" : "hover:bg-accent/50"
                                            )}
                                        >
                                            <div className="p-3 flex items-start gap-3">
                                                {/* Checkbox */}
                                                <button
                                                    onClick={() => toggleSimulation(sim.id)}
                                                    className={cn(
                                                        "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
                                                        isSelected
                                                            ? "bg-primary border-primary text-primary-foreground"
                                                            : "border-muted-foreground/30 hover:border-primary"
                                                    )}
                                                >
                                                    {isSelected && <Check className="w-3 h-3" />}
                                                </button>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    {/* Name */}
                                                    {editingId === sim.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={editingName}
                                                                onChange={(e) => setEditingName(e.target.value)}
                                                                className="flex-1 px-2 py-1 text-sm border rounded bg-background"
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') saveEditing();
                                                                    if (e.key === 'Escape') cancelEditing();
                                                                }}
                                                            />
                                                            <button onClick={saveEditing} className="p-1 hover:bg-accent rounded text-green-600">
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={cancelEditing} className="p-1 hover:bg-accent rounded text-destructive">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="font-medium text-sm truncate block">{sim.name}</span>
                                                    )}

                                                    {/* Meta info */}
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatDate(sim.timestamp)}
                                                        </span>
                                                        {stats && <span>{stats.steps} pts</span>}
                                                    </div>

                                                    {/* Expand button */}
                                                    {!showConfigPanel && (
                                                        <button
                                                            onClick={() => setExpandedSim(isExpanded ? null : sim.id)}
                                                            className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                                                        >
                                                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                            {isExpanded ? 'Masquer' : 'Détails'}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-1 flex-shrink-0">
                                                    <button
                                                        onClick={() => startEditing(sim.id, sim.name)}
                                                        className="p-1.5 hover:bg-accent rounded transition-colors"
                                                        title="Renommer"
                                                    >
                                                        <Edit3 className="w-4 h-4 text-muted-foreground" />
                                                    </button>
                                                    <button
                                                        onClick={() => removeStoredSimulation(sim.id)}
                                                        className="p-1.5 hover:bg-destructive/20 rounded transition-colors"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded details */}
                                            {isExpanded && stats && !showConfigPanel && (
                                                <div className="px-3 pb-3 pt-0 ml-8">
                                                    <div className="p-3 bg-muted/30 rounded-md text-xs space-y-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <span className="text-muted-foreground">Durée:</span>
                                                                <span className="ml-2 font-medium">{stats.duration.toFixed(2)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">Points:</span>
                                                                <span className="ml-2 font-medium">{stats.steps}</span>
                                                            </div>
                                                        </div>
                                                        <div className="border-t pt-2 mt-2">
                                                            <div className="font-medium mb-1">Valeurs finales:</div>
                                                            <div className="space-y-1">
                                                                {stats.changes.slice(0, 5).map(change => (
                                                                    <div key={change.name} className="flex justify-between">
                                                                        <span className="text-muted-foreground truncate">{change.name}</span>
                                                                        <span className={cn(
                                                                            "font-mono",
                                                                            change.change > 0 ? "text-green-600" : change.change < 0 ? "text-red-600" : ""
                                                                        )}>
                                                                            {change.final.toFixed(2)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Middle: Config Panel (when open) */}
                {showConfigPanel && configModel && (
                    <div className="w-[500px] border-r bg-card flex flex-col">
                        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold">Configuration</h2>
                                <p className="text-xs text-muted-foreground">Modifiez les paramètres avant de lancer</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={resetConfig}
                                    className="p-2 hover:bg-accent rounded-md transition-colors"
                                    title="Réinitialiser"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setShowConfigPanel(false)}
                                    className="p-2 hover:bg-accent rounded-md transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Simulation Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nom de la simulation</label>
                                <input
                                    type="text"
                                    value={newSimName}
                                    onChange={(e) => setNewSimName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                                    placeholder="Simulation X"
                                />
                            </div>

                            {/* Simulation Settings */}
                            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                                <h3 className="font-semibold text-sm flex items-center gap-2">
                                    <Settings className="w-4 h-4" />
                                    Paramètres de simulation
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">Pas de temps (dt)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={configModel.simulation.dt}
                                            onChange={(e) => updateSimulationSettings('dt', parseFloat(e.target.value) || 0.1)}
                                            className="w-full px-2 py-1.5 border rounded bg-background text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">Nombre de pas</label>
                                        <input
                                            type="number"
                                            value={configModel.simulation.steps}
                                            onChange={(e) => updateSimulationSettings('steps', parseInt(e.target.value) || 100)}
                                            className="w-full px-2 py-1.5 border rounded bg-background text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Entities and Components */}
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Entités et Composants</h3>
                                
                                {Object.entries(configModel.entities).map(([entityName, entity]) => (
                                    <div key={entityName} className="border rounded-lg overflow-hidden">
                                        {/* Entity Header */}
                                        <button
                                            onClick={() => toggleEntity(entityName)}
                                            className="w-full p-3 bg-muted/50 hover:bg-muted flex items-center justify-between text-left"
                                        >
                                            <span className="font-medium text-sm">{entityName}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {Object.keys(entity.components).length} composants
                                                </span>
                                                {expandedEntities.has(entityName) 
                                                    ? <ChevronDown className="w-4 h-4" />
                                                    : <ChevronRight className="w-4 h-4" />
                                                }
                                            </div>
                                        </button>

                                        {/* Components */}
                                        {expandedEntities.has(entityName) && (
                                            <div className="divide-y">
                                                {Object.entries(entity.components).map(([compName, component]) => {
                                                    const path = `${entityName}.${compName}`;
                                                    const isCompExpanded = expandedComponents.has(path);
                                                    
                                                    return (
                                                        <div key={compName} className="bg-background">
                                                            {/* Component Header */}
                                                            <button
                                                                onClick={() => toggleComponent(path)}
                                                                className="w-full p-3 hover:bg-accent/30 flex items-center justify-between text-left"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm">{compName}</span>
                                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 capitalize">
                                                                        {component.type}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-mono text-muted-foreground">
                                                                        {component.initial.toFixed(2)}
                                                                    </span>
                                                                    {isCompExpanded 
                                                                        ? <ChevronDown className="w-4 h-4" />
                                                                        : <ChevronRight className="w-4 h-4" />
                                                                    }
                                                                </div>
                                                            </button>

                                                            {/* Component Details */}
                                                            {isCompExpanded && (
                                                                <div className="p-3 bg-accent/10 space-y-4">
                                                                    {/* Initial Value */}
                                                                    <div className="space-y-2">
                                                                        <label className="text-xs font-medium flex justify-between">
                                                                            Valeur initiale
                                                                            <span className="font-mono">{component.initial.toFixed(2)}</span>
                                                                        </label>
                                                                        <input
                                                                            type="range"
                                                                            min={component.min ?? 0}
                                                                            max={component.max ?? Math.max(component.initial * 2, 100)}
                                                                            step={0.01}
                                                                            value={component.initial}
                                                                            onChange={(e) => updateConfigParameter(entityName, compName, 'initial', parseFloat(e.target.value))}
                                                                            className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                                                                        />
                                                                        <div className="flex justify-between text-[10px] text-muted-foreground">
                                                                            <span>{component.min ?? 0}</span>
                                                                            <span>{component.max ?? Math.max(component.initial * 2, 100)}</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Min/Max */}
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div className="space-y-1">
                                                                            <label className="text-xs text-muted-foreground">Min</label>
                                                                            <input
                                                                                type="number"
                                                                                step="0.1"
                                                                                value={component.min ?? ''}
                                                                                onChange={(e) => updateConfigParameter(entityName, compName, 'min', e.target.value ? parseFloat(e.target.value) : null)}
                                                                                className="w-full px-2 py-1 text-xs border rounded bg-background"
                                                                                placeholder="Aucun"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <label className="text-xs text-muted-foreground">Max</label>
                                                                            <input
                                                                                type="number"
                                                                                step="0.1"
                                                                                value={component.max ?? ''}
                                                                                onChange={(e) => updateConfigParameter(entityName, compName, 'max', e.target.value ? parseFloat(e.target.value) : null)}
                                                                                className="w-full px-2 py-1 text-xs border rounded bg-background"
                                                                                placeholder="Aucun"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Influences */}
                                                                    {component.influences.length > 0 && (
                                                                        <div className="space-y-2">
                                                                            <h4 className="text-xs font-medium text-muted-foreground">
                                                                                Influences ({component.influences.length})
                                                                            </h4>
                                                                            <div className="space-y-2">
                                                                                {component.influences.map((inf, idx) => (
                                                                                    <InfluenceConfigEditor
                                                                                        key={idx}
                                                                                        influence={inf}
                                                                                        index={idx}
                                                                                        kindColors={kindColors}
                                                                                        onUpdate={(updates) => updateConfigInfluence(entityName, compName, idx, updates)}
                                                                                    />
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Run Button */}
                        <div className="p-4 border-t bg-card">
                            <button
                                onClick={runSimulation}
                                disabled={isRunning}
                                className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
                            >
                                <Play className="w-5 h-5" />
                                {isRunning ? 'Simulation en cours...' : 'Lancer la simulation'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Middle: Batch Simulation Panel */}
                {showBatchPanel && (
                    <div className="w-[400px] border-r bg-card flex flex-col">
                        <div className="p-4 border-b bg-orange-50 flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-orange-500" />
                                    Batch Simulations
                                </h2>
                                <p className="text-xs text-muted-foreground">Balayer une plage de paramètres</p>
                            </div>
                            <button
                                onClick={() => setShowBatchPanel(false)}
                                className="p-2 hover:bg-accent rounded-md transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* Parameter Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Sliders className="w-4 h-4" />
                                    Paramètre à varier
                                </label>
                                <select
                                    value={batchConfig.parameter}
                                    onChange={(e) => setBatchConfig(prev => ({ ...prev, parameter: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                >
                                    {variables.map(v => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Value Range */}
                            <div className="space-y-4">
                                <label className="text-sm font-medium">Plage de valeurs</label>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">Minimum</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={batchConfig.minValue}
                                            onChange={(e) => setBatchConfig(prev => ({ ...prev, minValue: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 border rounded-md text-sm font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted-foreground">Maximum</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={batchConfig.maxValue}
                                            onChange={(e) => setBatchConfig(prev => ({ ...prev, maxValue: parseFloat(e.target.value) || 1 }))}
                                            className="w-full px-3 py-2 border rounded-md text-sm font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground flex justify-between">
                                        Nombre de simulations
                                        <span className="font-mono">{batchConfig.steps}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="2"
                                        max="20"
                                        value={batchConfig.steps}
                                        onChange={(e) => setBatchConfig(prev => ({ ...prev, steps: parseInt(e.target.value) }))}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>2</span>
                                        <span>20</span>
                                    </div>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                                <div className="text-sm font-medium mb-2">Aperçu des valeurs:</div>
                                <div className="flex flex-wrap gap-2">
                                    {Array.from({ length: batchConfig.steps }, (_, i) => {
                                        const value = batchConfig.minValue + (i * (batchConfig.maxValue - batchConfig.minValue) / (batchConfig.steps - 1));
                                        return (
                                            <span key={i} className="px-2 py-1 bg-white rounded text-xs font-mono border">
                                                {value.toFixed(2)}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <strong>Info:</strong> Cette fonctionnalité va exécuter {batchConfig.steps} simulations avec des valeurs de <code className="bg-white px-1 rounded">{batchConfig.parameter}</code> allant de {batchConfig.minValue} à {batchConfig.maxValue}. Chaque simulation sera sauvegardée séparément.
                            </div>
                        </div>

                        {/* Run Batch Button */}
                        <div className="p-4 border-t bg-card">
                            <button
                                onClick={handleRunBatch}
                                disabled={isLoading}
                                className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
                            >
                                <Layers className="w-5 h-5" />
                                {isLoading ? `Exécution en cours...` : `Lancer ${batchConfig.steps} simulations`}
                            </button>
                        </div>
                    </div>
                )}

                {/* Right: Comparison View */}
                <div className="flex-1 overflow-auto bg-background p-6">
                    {selectedSimulations.size === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Eye className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                                <p className="text-sm font-medium mb-1">Sélectionnez des simulations</p>
                                <p className="text-xs">
                                    Cochez une ou plusieurs simulations<br />
                                    pour voir leurs détails et les comparer
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold">
                                Comparaison de {selectedSimulations.size} simulation{selectedSimulations.size > 1 ? 's' : ''}
                            </h2>

                            {/* Comparison Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted sticky top-0">
                                        <tr>
                                            <th className="text-left p-3 font-medium bg-muted">Variable</th>
                                            {selectedSimsData.map(sim => (
                                                <th key={sim.id} className="text-center p-3 font-medium bg-muted min-w-[120px]">
                                                    {sim.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {variables.map(varName => (
                                            <tr key={varName} className="hover:bg-accent/30">
                                                <td className="p-3 font-medium">{varName}</td>
                                                {selectedSimsData.map(sim => {
                                                    const history = sim.result.history;
                                                    const initial = history[0]?.[varName] ?? 0;
                                                    const final = history[history.length - 1]?.[varName] ?? 0;
                                                    const change = final - initial;
                                                    const pctChange = initial !== 0 ? (change / initial) * 100 : 0;
                                                    
                                                    return (
                                                        <td key={sim.id} className="p-3 text-center">
                                                            <div className="font-mono">{final.toFixed(2)}</div>
                                                            <div className={cn(
                                                                "text-xs",
                                                                change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-muted-foreground"
                                                            )}>
                                                                {change > 0 ? '+' : ''}{pctChange.toFixed(1)}%
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {selectedSimsData.map(sim => {
                                    const stats = getSimStats(sim);
                                    if (!stats) return null;
                                    
                                    return (
                                        <div key={sim.id} className="p-4 bg-card border rounded-lg">
                                            <h3 className="font-medium text-sm mb-2 truncate">{sim.name}</h3>
                                            <div className="space-y-1 text-xs text-muted-foreground">
                                                <div className="flex justify-between">
                                                    <span>Durée:</span>
                                                    <span className="font-mono">{stats.duration.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Points:</span>
                                                    <span className="font-mono">{stats.steps}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Variables:</span>
                                                    <span className="font-mono">{stats.variables}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Influence editor component
interface InfluenceConfigEditorProps {
    influence: Influence;
    index: number;
    kindColors: Record<string, string>;
    onUpdate: (updates: Partial<Influence>) => void;
}

const InfluenceConfigEditor: React.FC<InfluenceConfigEditorProps> = ({ influence, kindColors, onUpdate }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={cn("bg-card border rounded-md overflow-hidden", !influence.enabled && "opacity-60")}>
            <div
                className="p-2 text-xs cursor-pointer hover:bg-accent/50 flex items-center justify-between"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                        type="checkbox"
                        checked={influence.enabled}
                        onChange={(e) => {
                            e.stopPropagation();
                            onUpdate({ enabled: e.target.checked });
                        }}
                        className="w-3.5 h-3.5 accent-primary"
                    />
                    <span className="truncate" title={influence.from}>← {influence.from}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-mono px-1 py-0.5 rounded border", kindColors[influence.kind])}>
                        {influence.coef > 0 ? '+' : ''}{influence.coef.toFixed(2)}
                    </span>
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </div>
            </div>

            {isExpanded && (
                <div className="px-2 pb-2 pt-1 space-y-2 border-t bg-accent/10">
                    {/* Coefficient */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-medium flex justify-between">
                            Coefficient
                            <input
                                type="number"
                                step="0.01"
                                value={influence.coef}
                                onChange={(e) => onUpdate({ coef: parseFloat(e.target.value) || 0 })}
                                className="w-16 text-[10px] px-1 py-0.5 border rounded font-mono text-right bg-background"
                            />
                        </label>
                        <input
                            type="range"
                            min="-2"
                            max="2"
                            step="0.01"
                            value={influence.coef}
                            onChange={(e) => onUpdate({ coef: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    {/* Kind */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-medium">Type</label>
                        <select
                            value={influence.kind}
                            onChange={(e) => onUpdate({ kind: e.target.value as Influence['kind'] })}
                            className="w-full text-[10px] px-1.5 py-1 border rounded bg-background"
                        >
                            <option value="positive">Positive</option>
                            <option value="negative">Negative</option>
                            <option value="decay">Decay</option>
                            <option value="ratio">Ratio</option>
                        </select>
                    </div>

                    {/* Function */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-medium">Fonction</label>
                        <select
                            value={influence.function}
                            onChange={(e) => onUpdate({ function: e.target.value as InfluenceFunction })}
                            className="w-full text-[10px] px-1.5 py-1 border rounded bg-background"
                        >
                            <option value="linear">Linéaire</option>
                            <option value="sigmoid">Sigmoïde</option>
                            <option value="threshold">Seuil</option>
                            <option value="division">Division</option>
                            <option value="square">Carré</option>
                            <option value="sqrt">Racine carrée</option>
                            <option value="exponential">Exponentielle</option>
                            <option value="logarithmic">Logarithmique</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};
