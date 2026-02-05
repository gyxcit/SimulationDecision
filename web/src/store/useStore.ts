import { create } from 'zustand';
import type { SystemModel, SimulationResult } from '../types';
import axios from 'axios';

interface AppState {
    model: SystemModel | null;
    simulationResult: SimulationResult | null;
    isLoading: boolean;
    selectedNode: string | null; // "Entity.Component" or "Entity"

    // Actions
    setModel: (model: SystemModel) => void;
    generateModel: (description: string) => Promise<void>;
    runSimulation: () => Promise<void>;
    updateParameter: (path: string, value: number) => void;
    selectNode: (id: string | null) => void;
}

const API_URL = 'http://localhost:8000';

export const useStore = create<AppState>((set, get) => ({
    model: null,
    simulationResult: null,
    isLoading: false,
    selectedNode: null,

    setModel: (model) => set({ model }),

    generateModel: async (description) => {
        set({ isLoading: true });
        try {
            const response = await axios.post(`${API_URL}/generate`, { description });
            if (response.data.success) {
                set({ model: response.data.model });
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
                set({
                    simulationResult: {
                        time_points: response.data.time_points,
                        history: response.data.history,
                        final_state: response.data.final_state
                    }
                });
            }
        } catch (error) {
            console.error("Simulation failed", error);
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

            return { model: newModel };
        });
    },

    selectNode: (id) => set({ selectedNode: id }),
}));
