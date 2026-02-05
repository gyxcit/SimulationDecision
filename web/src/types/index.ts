export type InfluenceKind = "positive" | "negative" | "decay" | "ratio";
export type InfluenceFunction = "linear" | "sigmoid" | "threshold" | "division";
export type ComponentType = "state" | "computed" | "constant";

export interface Influence {
    from: string;
    coef: number;
    kind: InfluenceKind;
    function: InfluenceFunction;
    enabled: boolean;
}

export interface Component {
    type: ComponentType;
    initial: number;
    min?: number | null;
    max?: number | null;
    influences: Influence[];
    value?: number; // Runtime value
}

export interface Entity {
    components: Record<string, Component>;
}

export interface SimulationConfig {
    dt: number;
    steps: number;
}

export interface SystemModel {
    entities: Record<string, Entity>;
    simulation: SimulationConfig;
}

export interface SimulationResult {
    time_points: number[];
    history: Record<string, number>[];
    final_state: Record<string, number>;
}
