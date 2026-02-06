import { create } from 'zustand';
import type { SystemModel, SimulationResult, Influence } from '../types';
import type { ViewMode } from '../lib/viewModes';
import type { ExplainableResult } from '../types/explainability';
import { analyzeSimulation } from '../lib/explainabilityEngine';
import axios from 'axios';

// AI Log entry for tracking AI operations
export interface AILogEntry {
    id: string;
    timestamp: Date;
    type: 'edit' | 'generation' | 'explanation' | 'analysis';
    target?: string; // Entity.Component or Entity
    description: string;
    prompt?: string;
    changes?: {
        field: string;
        oldValue: unknown;
        newValue: unknown;
    }[];
    result?: string;
    viewMode?: ViewMode;
}

// Stored simulation for comparison
export interface StoredSimulation {
    id: string;
    name: string;
    timestamp: Date;
    result: SimulationResult;
    variables: string[];
}

// Batch simulation config
export interface BatchSimConfig {
    parameter: string; // "Entity.Component"
    minValue: number;
    maxValue: number;
    steps: number;
}

interface AppState {
    model: SystemModel | null;
    simulationResult: SimulationResult | null;
    storedSimulations: StoredSimulation[];
    isLoading: boolean;
    selectedNode: string | null; // "Entity.Component" or "Entity"
    useV7: boolean; // Toggle between V5 and V7 pipeline
    showEntityBoxes: boolean; // Toggle entity boxes visibility on canvas
    viewMode: ViewMode; // View mode for different audiences

    // Explainability state
    explainableResult: ExplainableResult | null;
    crossFilterVariable: string | null; // For cross-filtering between charts
    highlightedPath: string[] | null; // For path highlighting in causal graph

    // Actions
    setModel: (model: SystemModel) => void;
    generateModel: (description: string) => Promise<void>;
    runSimulation: () => Promise<void>;
    runBatchSimulations: (config: BatchSimConfig) => Promise<void>;
    updateParameter: (path: string, value: number) => void;
    updateComponentParameter: (path: string, values: { initial: number, min: number | null, max: number | null }) => void;
    updateInfluence: (componentPath: string, influenceIndex: number, updates: Partial<{ coef: number, kind: string, enabled: boolean, function: string }>) => void;
    addInfluence: (componentPath: string, influence: Influence) => void;
    removeInfluence: (componentPath: string, influenceIndex: number) => void;
    addEntity: (name: string, description?: string) => void;
    removeEntity: (name: string) => void;
    addComponent: (entityName: string, componentName: string, component: { type: string, initial: number, min?: number, max?: number, influences?: Influence[] }) => void;
    removeComponent: (entityName: string, componentName: string) => void;
    updateSimulationConfig: (updates: Partial<{ dt: number, steps: number }>) => void;
    selectNode: (id: string | null) => void;
    toggleV7: () => void;
    toggleEntityBoxes: () => void;
    setViewMode: (mode: ViewMode) => void;
    storeSimulation: (name?: string) => void;
    removeStoredSimulation: (id: string) => void;
    renameStoredSimulation: (id: string, name: string) => void;

    // Explainability actions
    computeExplainability: () => void;
    setCrossFilter: (variable: string | null) => void;
    setHighlightedPath: (path: string[] | null) => void;

    // AI Logs state
    aiLogs: AILogEntry[];
    addAILog: (log: Omit<AILogEntry, 'id' | 'timestamp'>) => void;
    clearAILogs: () => void;

    // Connection mode state
    connectionMode: {
        active: boolean;
        from: string | null; // "Entity.Component" or "Entity"
    };
    startConnection: (from: string) => void;
    cancelConnection: () => void;

    // Simulation variable selection
    simulationIncludedVars: string[]; // List of variables to include in simulation (all by default)
    toggleSimulationVariable: (path: string) => void;
    setAllSimulationVariables: (include: boolean) => void;
}

const API_URL = 'http://localhost:8000';
const STORAGE_KEY = 'industriel_ai_model';
const SIMULATIONS_STORAGE_KEY = 'industriel_ai_simulations';
const SIMULATION_RESULT_KEY = 'industriel_ai_simulation_result';

// Load model from localStorage
const loadModelFromStorage = (): SystemModel | null => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Failed to load model from localStorage:', error);
        return null;
    }
};

// Save model to localStorage
const saveModelToStorage = (model: SystemModel | null) => {
    try {
        if (model) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch (error) {
        console.error('Failed to save model to localStorage:', error);
    }
};

// Load stored simulations from localStorage
const loadSimulationsFromStorage = (): StoredSimulation[] => {
    try {
        const stored = localStorage.getItem(SIMULATIONS_STORAGE_KEY);
        if (stored) {
            const sims = JSON.parse(stored);
            // Convert timestamp strings back to Date objects
            return sims.map((s: StoredSimulation) => ({
                ...s,
                timestamp: new Date(s.timestamp)
            }));
        }
        return [];
    } catch (error) {
        console.error('Failed to load simulations from localStorage:', error);
        return [];
    }
};

// Save stored simulations to localStorage
const saveSimulationsToStorage = (simulations: StoredSimulation[]) => {
    try {
        localStorage.setItem(SIMULATIONS_STORAGE_KEY, JSON.stringify(simulations));
    } catch (error) {
        console.error('Failed to save simulations to localStorage:', error);
    }
};

// Load simulation result from localStorage
const loadSimulationResultFromStorage = (): SimulationResult | null => {
    try {
        const stored = localStorage.getItem(SIMULATION_RESULT_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Failed to load simulation result from localStorage:', error);
        return null;
    }
};

// Save simulation result to localStorage
const saveSimulationResultToStorage = (result: SimulationResult | null) => {
    try {
        if (result) {
            localStorage.setItem(SIMULATION_RESULT_KEY, JSON.stringify(result));
        } else {
            localStorage.removeItem(SIMULATION_RESULT_KEY);
        }
    } catch (error) {
        console.error('Failed to save simulation result to localStorage:', error);
    }
};

// Get all variable paths from a model
const getAllVariablePaths = (model: SystemModel | null): string[] => {
    if (!model) return [];
    const paths: string[] = [];
    Object.entries(model.entities).forEach(([entityName, entity]) => {
        Object.keys(entity.components).forEach(compName => {
            paths.push(`${entityName}.${compName}`);
        });
    });
    return paths;
};

const initialModel = loadModelFromStorage();

export const useStore = create<AppState>((set, get) => ({
    model: initialModel, // Load from localStorage on init
    simulationResult: loadSimulationResultFromStorage(), // Load simulation result from localStorage
    storedSimulations: loadSimulationsFromStorage(), // Load stored simulations
    isLoading: false,
    selectedNode: null,
    useV7: false, // Default to V5 for speed
    showEntityBoxes: true, // Show entity boxes by default
    viewMode: 'executive' as ViewMode, // Default view mode for business users

    // Explainability initial state
    explainableResult: null,
    crossFilterVariable: null,
    highlightedPath: null,

    // AI Logs initial state
    aiLogs: [],

    // Connection mode initial state
    connectionMode: {
        active: false,
        from: null
    },

    // Simulation variable selection - all variables by default
    simulationIncludedVars: getAllVariablePaths(initialModel),

    startConnection: (from) => set({ connectionMode: { active: true, from } }),
    cancelConnection: () => set({ connectionMode: { active: false, from: null } }),

    toggleSimulationVariable: (path) => {
        const { simulationIncludedVars } = get();
        if (simulationIncludedVars.includes(path)) {
            set({ simulationIncludedVars: simulationIncludedVars.filter(p => p !== path) });
        } else {
            set({ simulationIncludedVars: [...simulationIncludedVars, path] });
        }
    },

    setAllSimulationVariables: (include) => {
        const { model } = get();
        if (!model) return;
        if (include) {
            const allPaths: string[] = [];
            Object.entries(model.entities).forEach(([entityName, entity]) => {
                Object.keys(entity.components).forEach(compName => {
                    allPaths.push(`${entityName}.${compName}`);
                });
            });
            set({ simulationIncludedVars: allPaths });
        } else {
            set({ simulationIncludedVars: [] });
        }
    },

    setModel: (model) => {
        // Initialize all variables as included for simulation
        const allPaths: string[] = [];
        Object.entries(model.entities).forEach(([entityName, entity]) => {
            Object.keys(entity.components).forEach(compName => {
                allPaths.push(`${entityName}.${compName}`);
            });
        });
        set({ model, simulationIncludedVars: allPaths });
        saveModelToStorage(model);
    },

    generateModel: async (description) => {
        const { useV7 } = get();
        set({ isLoading: true });
        try {
            // Add ?use_v7=true query parameter if V7 is enabled
            const url = useV7
                ? `${API_URL}/generate?use_v7=true`
                : `${API_URL}/generate`;

            const response = await axios.post(url, { description });
            if (response.data.success) {
                const model = response.data.model;
                set({ model });
                saveModelToStorage(model); // Persist to localStorage
            }
        } catch (error) {
            console.error("Generation failed", error);
        } finally {
            set({ isLoading: false });
        }
    },

    runSimulation: async () => {
        const { model } = get();
        if (!model) return;

        set({ isLoading: true });
        try {
            // In a real app we would track parameter changes separately.
            // Here we assume model is up to date with initial values.
            const response = await axios.post(`${API_URL}/simulate`, {
                model,
                steps: model.simulation.steps,
                dt: model.simulation.dt
            });

            if (response.data.success) {
                console.log('Simulation result received:', response.data);
                const result: SimulationResult = {
                    time_points: response.data.time_points,
                    history: response.data.history,
                    final_state: response.data.final_state
                };
                set({ simulationResult: result });
                saveSimulationResultToStorage(result); // Persist to localStorage

                // Auto-store the simulation
                const { storedSimulations } = get();
                const variables: string[] = [];
                Object.entries(model.entities).forEach(([entityName, entity]) => {
                    Object.keys(entity.components).forEach(compName => {
                        variables.push(`${entityName}.${compName}`);
                    });
                });

                const newSim: StoredSimulation = {
                    id: `sim-${Date.now()}`,
                    name: `Simulation ${storedSimulations.length + 1}`,
                    timestamp: new Date(),
                    result: JSON.parse(JSON.stringify(result)),
                    variables
                };

                const newSimulations = [...storedSimulations, newSim];
                set({ storedSimulations: newSimulations });
                saveSimulationsToStorage(newSimulations);

                console.log('Simulation result stored:', get().simulationResult);
            }
        } catch (error) {
            console.error("Simulation failed", error);
        } finally {
            set({ isLoading: false });
        }
    },

    runBatchSimulations: async (config: BatchSimConfig) => {
        const { model, storedSimulations } = get();
        if (!model) return;

        set({ isLoading: true });
        try {
            const [entityName, componentName] = config.parameter.split('.');
            const stepSize = (config.maxValue - config.minValue) / (config.steps - 1);

            // Extract variable names
            const variables: string[] = [];
            Object.entries(model.entities).forEach(([eName, entity]) => {
                Object.keys(entity.components).forEach(cName => {
                    variables.push(`${eName}.${cName}`);
                });
            });

            const newSimulations: StoredSimulation[] = [];

            for (let i = 0; i < config.steps; i++) {
                const paramValue = config.minValue + (i * stepSize);

                // Clone model and set parameter
                const testModel = JSON.parse(JSON.stringify(model));
                if (testModel.entities[entityName]?.components[componentName]) {
                    testModel.entities[entityName].components[componentName].initial = paramValue;
                }

                // Run simulation
                const response = await axios.post(`${API_URL}/simulate`, {
                    model: testModel,
                    steps: testModel.simulation.steps,
                    dt: testModel.simulation.dt
                });

                if (response.data.success) {
                    const result: SimulationResult = {
                        time_points: response.data.time_points,
                        history: response.data.history,
                        final_state: response.data.final_state
                    };

                    newSimulations.push({
                        id: `sim-${Date.now()}-${i}`,
                        name: `${config.parameter}=${paramValue.toFixed(2)}`,
                        timestamp: new Date(),
                        result: result,
                        variables
                    });
                }
            }

            // Add all new simulations
            const allSimulations = [...storedSimulations, ...newSimulations];
            set({ storedSimulations: allSimulations });
            saveSimulationsToStorage(allSimulations);

        } catch (error) {
            console.error("Batch simulation failed", error);
        } finally {
            set({ isLoading: false });
        }
    },

    updateParameter: (path, value) => {
        set((state) => {
            if (!state.model) return state;

            const [entityName, componentName] = path.split('.');
            const newModel = JSON.parse(JSON.stringify(state.model));

            if (newModel.entities[entityName]?.components[componentName]) {
                newModel.entities[entityName].components[componentName].initial = value;
            }

            saveModelToStorage(newModel);
            return { model: newModel };
        });
    },

    updateComponentParameter: (path, values) => {
        set((state) => {
            if (!state.model) return state;

            const [entityName, componentName] = path.split('.');
            const newModel = JSON.parse(JSON.stringify(state.model));

            if (newModel.entities[entityName]?.components[componentName]) {
                newModel.entities[entityName].components[componentName].initial = values.initial;
                newModel.entities[entityName].components[componentName].min = values.min;
                newModel.entities[entityName].components[componentName].max = values.max;
            }

            saveModelToStorage(newModel);
            return { model: newModel };
        });
    },

    updateInfluence: (componentPath, influenceIndex, updates) => {
        set((state) => {
            if (!state.model) return state;

            const [entityName, componentName] = componentPath.split('.');
            const newModel = JSON.parse(JSON.stringify(state.model));

            if (newModel.entities[entityName]?.components[componentName]) {
                const influence = newModel.entities[entityName].components[componentName].influences[influenceIndex];
                if (influence) {
                    Object.assign(influence, updates);
                }
            }

            saveModelToStorage(newModel);
            return { model: newModel };
        });
    },

    addInfluence: (componentPath, influence) => {
        set((state) => {
            if (!state.model) return state;

            const [entityName, componentName] = componentPath.split('.');
            const newModel = JSON.parse(JSON.stringify(state.model));

            if (newModel.entities[entityName]?.components[componentName]) {
                newModel.entities[entityName].components[componentName].influences.push(influence);
            }

            saveModelToStorage(newModel);
            return { model: newModel };
        });
    },

    removeInfluence: (componentPath, influenceIndex) => {
        set((state) => {
            if (!state.model) return state;

            const [entityName, componentName] = componentPath.split('.');
            const newModel = JSON.parse(JSON.stringify(state.model));

            if (newModel.entities[entityName]?.components[componentName]) {
                newModel.entities[entityName].components[componentName].influences.splice(influenceIndex, 1);
            }

            saveModelToStorage(newModel);
            return { model: newModel };
        });
    },

    addEntity: (name, description = '') => {
        set((state) => {
            if (!state.model) return state;

            const newModel = JSON.parse(JSON.stringify(state.model));

            // Don't add if entity already exists
            if (newModel.entities[name]) return state;

            newModel.entities[name] = {
                description: description,
                components: {}
            };

            saveModelToStorage(newModel);
            return { model: newModel };
        });
    },

    removeEntity: (name) => {
        set((state) => {
            if (!state.model) return state;

            const newModel = JSON.parse(JSON.stringify(state.model));

            // Remove the entity
            if (newModel.entities[name]) {
                delete newModel.entities[name];

                // Also remove any influences that reference this entity's components
                Object.values(newModel.entities).forEach((entity: any) => {
                    Object.values(entity.components).forEach((comp: any) => {
                        comp.influences = comp.influences.filter((inf: any) =>
                            !inf.from.startsWith(`${name}.`)
                        );
                    });
                });
            }

            saveModelToStorage(newModel);
            return { model: newModel };
        });
    },

    addComponent: (entityName, componentName, component) => {
        set((state) => {
            if (!state.model) {
                console.error('No model exists to add component to');
                return state;
            }

            const newModel = JSON.parse(JSON.stringify(state.model));

            // Create entity if it doesn't exist
            if (!newModel.entities[entityName]) {
                console.log(`Creating entity ${entityName} for new component`);
                newModel.entities[entityName] = {
                    description: '',
                    components: {}
                };
            }

            // Don't add if component already exists
            if (newModel.entities[entityName].components[componentName]) {
                console.log(`Component ${entityName}.${componentName} already exists`);
                return state;
            }

            // Add component with proper structure
            newModel.entities[entityName].components[componentName] = {
                type: component.type || 'state',
                initial: component.initial ?? 0,
                min: component.min ?? null,
                max: component.max ?? null,
                influences: (component.influences || []).map((inf: any) => ({
                    from: inf.from,
                    coef: inf.coef ?? 0.1,
                    kind: inf.kind || 'positive',
                    function: inf.function || 'linear',
                    enabled: inf.enabled !== false
                }))
            };

            console.log(`Added component ${entityName}.${componentName}:`, newModel.entities[entityName].components[componentName]);

            saveModelToStorage(newModel);
            return { model: newModel };
        });
    },

    removeComponent: (entityName, componentName) => {
        set((state) => {
            if (!state.model) return state;

            const newModel = JSON.parse(JSON.stringify(state.model));

            // Remove the component
            if (newModel.entities[entityName]?.components[componentName]) {
                delete newModel.entities[entityName].components[componentName];

                // Also remove any influences that reference this component
                const componentPath = `${entityName}.${componentName}`;
                Object.values(newModel.entities).forEach((entity: any) => {
                    Object.values(entity.components).forEach((comp: any) => {
                        comp.influences = comp.influences.filter((inf: any) =>
                            inf.from !== componentPath
                        );
                    });
                });
            }

            saveModelToStorage(newModel);
            return { model: newModel };
        });
    },

    updateSimulationConfig: (updates) => {
        set((state) => {
            if (!state.model) return state;

            const newModel = JSON.parse(JSON.stringify(state.model));
            Object.assign(newModel.simulation, updates);

            saveModelToStorage(newModel);
            return { model: newModel };
        });
    },

    selectNode: (id) => set({ selectedNode: id }),

    toggleV7: () => set((state) => ({ useV7: !state.useV7 })),

    toggleEntityBoxes: () => set((state) => ({ showEntityBoxes: !state.showEntityBoxes })),

    setViewMode: (mode) => set({ viewMode: mode }),

    storeSimulation: (name?: string) => {
        const { simulationResult, model, storedSimulations } = get();
        if (!simulationResult || !model) return;

        // Extract variable names from model
        const variables: string[] = [];
        Object.entries(model.entities).forEach(([entityName, entity]) => {
            Object.keys(entity.components).forEach(compName => {
                variables.push(`${entityName}.${compName}`);
            });
        });

        const newSim: StoredSimulation = {
            id: `sim-${Date.now()}`,
            name: name || `Simulation ${storedSimulations.length + 1}`,
            timestamp: new Date(),
            result: JSON.parse(JSON.stringify(simulationResult)),
            variables
        };

        const newSimulations = [...storedSimulations, newSim];
        set({ storedSimulations: newSimulations });
        saveSimulationsToStorage(newSimulations);
    },

    removeStoredSimulation: (id: string) => {
        const { storedSimulations } = get();
        const newSimulations = storedSimulations.filter(s => s.id !== id);
        set({ storedSimulations: newSimulations });
        saveSimulationsToStorage(newSimulations);
    },

    renameStoredSimulation: (id: string, name: string) => {
        const { storedSimulations } = get();
        const newSimulations = storedSimulations.map(s =>
            s.id === id ? { ...s, name } : s
        );
        set({ storedSimulations: newSimulations });
        saveSimulationsToStorage(newSimulations);
    },

    // Explainability actions
    computeExplainability: () => {
        const { model, simulationResult } = get();
        if (!model || !simulationResult) return;

        const result = analyzeSimulation(model, simulationResult);
        set({ explainableResult: result });
    },

    setCrossFilter: (variable: string | null) => {
        set({ crossFilterVariable: variable });
    },

    setHighlightedPath: (path: string[] | null) => {
        set({ highlightedPath: path });
    },

    // AI Logs actions
    addAILog: (log) => {
        const newLog: AILogEntry = {
            ...log,
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
        };
        set((state) => ({
            aiLogs: [newLog, ...state.aiLogs].slice(0, 100), // Keep last 100 logs
        }));
    },

    clearAILogs: () => {
        set({ aiLogs: [] });
    },
}));
