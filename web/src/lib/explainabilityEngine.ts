/**
 * Explainability Engine
 * 
 * Computes drivers, sensitivities, contributions, critical paths, 
 * scenarios, and timeline events from simulation results.
 */

import type { SystemModel, SimulationResult, Component } from '../types';
import type {
    ExplainableResult,
    DriverMetric,
    SensitivityMetric,
    ContributionMetric,
    ContributionItem,
    CriticalPath,
    ScenarioResult,
    TimelineEvent,
    ViabilityAssessment,
    RiskLevel,
    StabilityScore
} from '../types/explainability';
import { getDisplayLabel } from './viewModes';

// =============================================================================
// MAIN ENGINE CLASS
// =============================================================================

export class ExplainabilityEngine {
    private model: SystemModel;
    private result: SimulationResult;

    constructor(model: SystemModel, result: SimulationResult) {
        this.model = model;
        this.result = result;
    }

    /**
     * Main entry point - compute all explainability metrics
     */
    analyze(): ExplainableResult {
        const mainDrivers = this.computeDrivers();
        const sensitivities = this.computeSensitivities();
        const contributions = this.computeContributions();
        const criticalPaths = this.findCriticalPaths();
        const scenarios = this.generateScenarios();
        const timeline = this.detectTimelineEvents();
        const viability = this.assessViability(mainDrivers);
        const aiInsight = this.generateInsight(mainDrivers, criticalPaths, viability);

        return {
            mainDrivers,
            sensitivities,
            contributions,
            criticalPaths,
            scenarios,
            timeline,
            viability,
            aiInsight,
            computedAt: new Date()
        };
    }

    // =========================================================================
    // DRIVER COMPUTATION
    // =========================================================================

    /**
     * Compute main drivers by analyzing influence weights and final values
     */
    computeDrivers(): DriverMetric[] {
        const drivers: DriverMetric[] = [];
        const allVariables = this.getAllVariables();

        // Calculate impact for each variable based on:
        // 1. Total outgoing influence weight
        // 2. Variance during simulation
        // 3. Final value deviation from initial

        allVariables.forEach(variable => {
            const outgoingInfluence = this.calculateOutgoingInfluence(variable);
            const variance = this.calculateVariance(variable);
            const initialValue = this.getInitialValue(variable);
            const finalValue = this.result.final_state[variable] ?? initialValue;
            const change = Math.abs(finalValue - initialValue);

            // Composite impact score (weighted)
            const impact = Math.min(100, Math.round(
                (outgoingInfluence * 40) +
                (variance * 30) +
                (change * 30)
            ) * 100);

            if (impact > 10) { // Filter low-impact variables
                drivers.push({
                    variable,
                    displayName: getDisplayLabel(variable, 'executive'),
                    impact,
                    direction: finalValue >= initialValue ? 'positive' : 'negative',
                    rank: 0, // Will be set after sorting
                    explanation: this.generateDriverExplanation(variable, change)
                });
            }
        });

        // Sort by impact and assign ranks
        drivers.sort((a, b) => b.impact - a.impact);
        drivers.forEach((d, i) => d.rank = i + 1);

        return drivers.slice(0, 10); // Top 10 drivers
    }

    /**
     * Calculate total outgoing influence from a variable
     */
    private calculateOutgoingInfluence(variable: string): number {
        let total = 0;

        Object.entries(this.model.entities).forEach(([entityName, entity]) => {
            Object.entries(entity.components).forEach(([, comp]) => {
                comp.influences.forEach(inf => {
                    const source = this.resolveVariablePath(inf.from, entityName);
                    if (source === variable) {
                        total += Math.abs(inf.coef);
                    }
                });
            });
        });

        return Math.min(1, total); // Normalize to 0-1
    }

    /**
     * Calculate variance of a variable over simulation
     */
    private calculateVariance(variable: string): number {
        const values = this.result.history.map(h => h[variable] ?? 0);
        if (values.length === 0) return 0;

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        return Math.sqrt(variance); // Standard deviation
    }

    /**
     * Get initial value for a variable
     */
    private getInitialValue(variable: string): number {
        const [entityName, compName] = variable.split('.');
        return this.model.entities[entityName]?.components[compName]?.initial ?? 0;
    }

    // =========================================================================
    // SENSITIVITY COMPUTATION
    // =========================================================================

    /**
     * Compute sensitivity (elasticity) for each parameter
     */
    computeSensitivities(): SensitivityMetric[] {
        const sensitivities: SensitivityMetric[] = [];
        const allVariables = this.getAllVariables();

        allVariables.forEach(variable => {
            const [entityName, compName] = variable.split('.');
            const comp = this.model.entities[entityName]?.components[compName];
            if (!comp) return;

            const currentValue = this.result.final_state[variable] ?? comp.initial;
            const outgoingInfluence = this.calculateOutgoingInfluence(variable);

            // Elasticity approximation based on influence weight
            const elasticity = outgoingInfluence * 100;

            // Control level based on component type and influence
            let controlLevel: 'high' | 'medium' | 'low';
            if (comp.type === 'constant' || outgoingInfluence > 0.5) {
                controlLevel = 'high';
            } else if (comp.type === 'state' && comp.influences.length <= 2) {
                controlLevel = 'medium';
            } else {
                controlLevel = 'low';
            }

            sensitivities.push({
                variable,
                displayName: getDisplayLabel(variable, 'levers'),
                elasticity,
                controlLevel,
                currentValue,
                min: comp.min ?? 0,
                max: comp.max ?? 1,
                suggestedValue: this.suggestOptimalValue(variable, comp)
            });
        });

        // Sort by elasticity
        sensitivities.sort((a, b) => b.elasticity - a.elasticity);

        return sensitivities;
    }

    /**
     * Suggest an optimal value for a parameter
     */
    private suggestOptimalValue(variable: string, comp: Component): number | undefined {
        const finalValue = this.result.final_state[variable] ?? comp.initial;
        const min = comp.min ?? 0;
        const max = comp.max ?? 1;

        // If close to bounds, suggest moving away
        if (finalValue < min + (max - min) * 0.2) {
            return min + (max - min) * 0.5;
        }
        if (finalValue > max - (max - min) * 0.2) {
            return max - (max - min) * 0.3;
        }

        return undefined;
    }

    // =========================================================================
    // CONTRIBUTION DECOMPOSITION
    // =========================================================================

    /**
     * Decompose each variable's change into contributions from influences
     */
    computeContributions(): ContributionMetric[] {
        const contributions: ContributionMetric[] = [];
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

        Object.entries(this.model.entities).forEach(([entityName, entity]) => {
            Object.entries(entity.components).forEach(([compName, comp]) => {
                if (comp.influences.length === 0) return;

                const variable = `${entityName}.${compName}`;
                const initialValue = comp.initial;
                const finalValue = this.result.final_state[variable] ?? initialValue;
                const totalChange = finalValue - initialValue;

                if (Math.abs(totalChange) < 0.01) return; // Skip if no significant change

                const contributors: ContributionItem[] = [];
                let totalContribution = 0;

                comp.influences.forEach((inf, idx) => {
                    if (!inf.enabled) return;

                    const sourceVar = this.resolveVariablePath(inf.from, entityName);
                    const sourceChange = this.calculateChange(sourceVar);
                    const contribution = Math.abs(inf.coef * sourceChange);
                    totalContribution += contribution;

                    contributors.push({
                        source: sourceVar,
                        displayName: getDisplayLabel(sourceVar, 'analyst'),
                        contribution,
                        percentage: 0, // Will be calculated after
                        sign: inf.kind === 'negative' || inf.coef < 0 ? '-' : '+',
                        color: colors[idx % colors.length]
                    });
                });

                // Calculate percentages
                contributors.forEach(c => {
                    c.percentage = totalContribution > 0
                        ? Math.round((c.contribution / totalContribution) * 100)
                        : 0;
                });

                // Sort by contribution
                contributors.sort((a, b) => b.contribution - a.contribution);

                contributions.push({
                    target: variable,
                    targetDisplayName: getDisplayLabel(variable, 'analyst'),
                    initialValue,
                    finalValue,
                    totalChange,
                    contributors
                });
            });
        });

        return contributions;
    }

    /**
     * Calculate total change for a variable during simulation
     */
    private calculateChange(variable: string): number {
        const initial = this.getInitialValue(variable);
        const final = this.result.final_state[variable] ?? initial;
        return final - initial;
    }

    // =========================================================================
    // CRITICAL PATH DETECTION
    // =========================================================================

    /**
     * Find critical influence paths in the system
     */
    findCriticalPaths(): CriticalPath[] {
        const paths: CriticalPath[] = [];
        const visited = new Set<string>();

        // Build adjacency list
        const graph = this.buildInfluenceGraph();

        // Find paths starting from high-impact variables
        const drivers = this.computeDrivers();
        const topDrivers = drivers.slice(0, 3);

        topDrivers.forEach((driver, idx) => {
            const path = this.tracePath(driver.variable, graph, visited);
            if (path.length >= 2) {
                const totalImpact = this.calculatePathImpact(path);
                const nature = totalImpact > 0 ? 'opportunity' : totalImpact < 0 ? 'risk' : 'neutral';

                paths.push({
                    id: `path-${idx}`,
                    nodes: path,
                    nodeDisplayNames: path.map(n => getDisplayLabel(n, 'analyst')),
                    totalImpact: Math.abs(totalImpact * 100),
                    description: this.generatePathDescription(path),
                    nature
                });
            }
        });

        return paths;
    }

    /**
     * Build influence graph as adjacency list
     */
    private buildInfluenceGraph(): Map<string, Array<{ target: string; weight: number }>> {
        const graph = new Map<string, Array<{ target: string; weight: number }>>();

        Object.entries(this.model.entities).forEach(([entityName, entity]) => {
            Object.entries(entity.components).forEach(([compName, comp]) => {
                const target = `${entityName}.${compName}`;

                comp.influences.forEach(inf => {
                    if (!inf.enabled) return;

                    const source = this.resolveVariablePath(inf.from, entityName);
                    if (!graph.has(source)) {
                        graph.set(source, []);
                    }
                    graph.get(source)!.push({ target, weight: inf.coef });
                });
            });
        });

        return graph;
    }

    /**
     * Trace a path through the graph using BFS
     */
    private tracePath(
        start: string,
        graph: Map<string, Array<{ target: string; weight: number }>>,
        visited: Set<string>
    ): string[] {
        const path: string[] = [start];
        let current = start;
        visited.add(start);

        const maxLength = 5;
        while (path.length < maxLength) {
            const neighbors = graph.get(current) || [];
            const unvisited = neighbors.filter(n => !visited.has(n.target));

            if (unvisited.length === 0) break;

            // Follow highest weight edge
            unvisited.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
            current = unvisited[0].target;
            path.push(current);
            visited.add(current);
        }

        return path;
    }

    /**
     * Calculate cumulative impact along a path
     */
    private calculatePathImpact(path: string[]): number {
        let impact = 1;

        for (let i = 0; i < path.length - 1; i++) {
            const source = path[i];
            const target = path[i + 1];

            // Find influence coefficient
            const [targetEntity, targetComp] = target.split('.');
            const comp = this.model.entities[targetEntity]?.components[targetComp];

            if (comp) {
                const inf = comp.influences.find(i =>
                    this.resolveVariablePath(i.from, targetEntity) === source
                );
                if (inf) {
                    impact *= inf.coef;
                }
            }
        }

        return impact;
    }

    /**
     * Generate description for a path
     */
    private generatePathDescription(path: string[]): string {
        const names = path.map(p => getDisplayLabel(p, 'executive'));
        return names.join(' → ');
    }

    // =========================================================================
    // SCENARIO GENERATION
    // =========================================================================

    /**
     * Generate scenario projections
     */
    generateScenarios(): ScenarioResult[] {
        const scenarios: ScenarioResult[] = [];
        const baselineViability = this.calculateViabilityScore();
        const currentTime = this.result.time_points[this.result.time_points.length - 1] ?? 0;

        // Scenario 1: Baseline (no change)
        scenarios.push({
            id: 'baseline',
            name: 'Baseline',
            description: 'Current trajectory without intervention',
            baseline: baselineViability,
            projected: baselineViability,
            delta: 0,
            deltaPercent: 0,
            timeline: currentTime,
            color: '#6b7280',
            parameters: []
        });

        // Scenario 2: Improved top driver
        const topDrivers = this.computeDrivers().slice(0, 3);
        if (topDrivers.length > 0) {
            const topDriver = topDrivers[0];
            const improvement = baselineViability * 1.15; // 15% improvement

            scenarios.push({
                id: 'improve-top-driver',
                name: `Improve ${topDriver.displayName}`,
                description: `Invest in improving ${topDriver.displayName}`,
                baseline: baselineViability,
                projected: Math.min(100, improvement),
                delta: improvement - baselineViability,
                deltaPercent: 15,
                timeline: currentTime * 1.2,
                color: '#10b981',
                parameters: [{
                    variable: topDriver.variable,
                    originalValue: this.result.final_state[topDriver.variable] ?? 0.5,
                    newValue: 0.8
                }]
            });
        }

        // Scenario 3: Risk mitigation
        const negativeDrivers = topDrivers.filter(d => d.direction === 'negative');
        if (negativeDrivers.length > 0) {
            const riskDriver = negativeDrivers[0];
            const mitigated = baselineViability * 1.1;

            scenarios.push({
                id: 'mitigate-risk',
                name: `Mitigate ${riskDriver.displayName}`,
                description: `Address risk from ${riskDriver.displayName}`,
                baseline: baselineViability,
                projected: Math.min(100, mitigated),
                delta: mitigated - baselineViability,
                deltaPercent: 10,
                timeline: currentTime * 0.8,
                color: '#f59e0b',
                parameters: [{
                    variable: riskDriver.variable,
                    originalValue: this.result.final_state[riskDriver.variable] ?? 0.5,
                    newValue: 0.6
                }]
            });
        }

        // Scenario 4: Optimal (all parameters improved)
        scenarios.push({
            id: 'optimal',
            name: 'Optimal Strategy',
            description: 'Best-case with all optimizations',
            baseline: baselineViability,
            projected: Math.min(100, baselineViability * 1.3),
            delta: baselineViability * 0.3,
            deltaPercent: 30,
            timeline: currentTime * 1.5,
            color: '#3b82f6',
            parameters: topDrivers.slice(0, 3).map(d => ({
                variable: d.variable,
                originalValue: this.result.final_state[d.variable] ?? 0.5,
                newValue: 0.85
            }))
        });

        return scenarios;
    }

    // =========================================================================
    // TIMELINE EVENT DETECTION
    // =========================================================================

    /**
     * Detect significant events in the simulation timeline
     */
    detectTimelineEvents(): TimelineEvent[] {
        const events: TimelineEvent[] = [];
        const allVariables = this.getAllVariables();

        allVariables.forEach(variable => {
            const values = this.result.history.map(h => h[variable] ?? 0);
            const times = this.result.time_points;

            // Detect peaks
            for (let i = 1; i < values.length - 1; i++) {
                if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
                    // Local maximum
                    if (values[i] > 0.8) {
                        events.push({
                            time: times[i],
                            variable,
                            displayName: getDisplayLabel(variable, 'analyst'),
                            event: 'peak',
                            value: values[i],
                            annotation: `${getDisplayLabel(variable, 'executive')} reaches peak at ${(values[i] * 100).toFixed(0)}%`,
                            severity: 'info'
                        });
                    }
                }
            }

            // Detect troughs
            for (let i = 1; i < values.length - 1; i++) {
                if (values[i] < values[i - 1] && values[i] < values[i + 1]) {
                    if (values[i] < 0.3) {
                        events.push({
                            time: times[i],
                            variable,
                            displayName: getDisplayLabel(variable, 'analyst'),
                            event: 'trough',
                            value: values[i],
                            annotation: `${getDisplayLabel(variable, 'executive')} drops to ${(values[i] * 100).toFixed(0)}%`,
                            severity: values[i] < 0.2 ? 'critical' : 'warning'
                        });
                    }
                }
            }

            // Detect threshold crossings
            const thresholds = [0.5, 0.3, 0.7];
            thresholds.forEach(threshold => {
                for (let i = 1; i < values.length; i++) {
                    if ((values[i - 1] < threshold && values[i] >= threshold) ||
                        (values[i - 1] > threshold && values[i] <= threshold)) {
                        events.push({
                            time: times[i],
                            variable,
                            displayName: getDisplayLabel(variable, 'analyst'),
                            event: 'threshold_cross',
                            value: values[i],
                            annotation: `${getDisplayLabel(variable, 'executive')} crosses ${(threshold * 100).toFixed(0)}% threshold`,
                            severity: threshold === 0.3 ? 'warning' : 'info'
                        });
                    }
                }
            });
        });

        // Sort by time and take most significant
        events.sort((a, b) => a.time - b.time);
        return events.slice(0, 15);
    }

    // =========================================================================
    // VIABILITY ASSESSMENT
    // =========================================================================

    /**
     * Assess overall system viability
     */
    private assessViability(drivers: DriverMetric[]): ViabilityAssessment {
        const score = this.calculateViabilityScore();
        const previousScore = this.calculatePreviousViabilityScore();
        const riskLevel = this.assessRiskLevel(drivers);
        const stability = this.assessStability();

        return {
            score,
            previousScore,
            trend: score > previousScore + 2 ? 'up' : score < previousScore - 2 ? 'down' : 'stable',
            riskLevel,
            stability,
            factors: drivers.slice(0, 5).map(d => ({
                name: d.displayName,
                impact: d.impact,
                direction: d.direction
            }))
        };
    }

    /**
     * Calculate viability score from final state
     */
    private calculateViabilityScore(): number {
        const values = Object.values(this.result.final_state);
        if (values.length === 0) return 50;

        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return Math.round(avg * 100);
    }

    /**
     * Calculate previous viability score for trend
     */
    private calculatePreviousViabilityScore(): number {
        if (this.result.history.length < 2) return this.calculateViabilityScore();

        const midpoint = Math.floor(this.result.history.length / 2);
        const midState = this.result.history[midpoint];
        const values = Object.values(midState);

        if (values.length === 0) return 50;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return Math.round(avg * 100);
    }

    /**
     * Assess risk level
     */
    private assessRiskLevel(drivers: DriverMetric[]): RiskLevel {
        const negativeDrivers = drivers.filter(d => d.direction === 'negative');
        const negativeImpact = negativeDrivers.reduce((sum, d) => sum + d.impact, 0);

        if (negativeImpact > 200) return 'critical';
        if (negativeImpact > 100) return 'high';
        if (negativeImpact > 50) return 'medium';
        return 'low';
    }

    /**
     * Assess stability
     */
    private assessStability(): StabilityScore {
        const allVariables = this.getAllVariables();
        let unstableCount = 0;

        allVariables.forEach(variable => {
            const variance = this.calculateVariance(variable);
            if (variance > 0.3) unstableCount++;
        });

        const ratio = unstableCount / allVariables.length;
        if (ratio > 0.3) return 'unstable';
        if (ratio > 0.1) return 'moderate';
        return 'good';
    }

    // =========================================================================
    // AI INSIGHT GENERATION
    // =========================================================================

    /**
     * Generate natural language insight
     */
    private generateInsight(
        drivers: DriverMetric[],
        paths: CriticalPath[],
        viability: ViabilityAssessment
    ): string {
        const topDriver = drivers[0];
        const riskPath = paths.find(p => p.nature === 'risk');
        const opportunityPath = paths.find(p => p.nature === 'opportunity');

        let insight = '';

        // Viability statement
        if (viability.score > 70) {
            insight = `The system shows strong performance with ${viability.score}% viability. `;
        } else if (viability.score > 50) {
            insight = `The system is stable at ${viability.score}% viability but has room for improvement. `;
        } else {
            insight = `⚠️ The system is at risk with only ${viability.score}% viability. `;
        }

        // Main driver
        if (topDriver) {
            insight += `The main driver is ${topDriver.displayName} with ${topDriver.impact}% impact. `;
        }

        // Risk path
        if (riskPath) {
            insight += `Primary risk path: ${riskPath.description}. `;
        }

        // Recommendation
        if (opportunityPath) {
            insight += `Focus on: ${opportunityPath.nodes[0]} to improve outcomes.`;
        } else if (topDriver && topDriver.direction === 'negative') {
            insight += `Recommended action: Address ${topDriver.displayName} to mitigate risks.`;
        }

        return insight;
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    /**
     * Get all variable paths in the model
     */
    private getAllVariables(): string[] {
        const variables: string[] = [];

        Object.entries(this.model.entities).forEach(([entityName, entity]) => {
            Object.keys(entity.components).forEach(compName => {
                variables.push(`${entityName}.${compName}`);
            });
        });

        return variables;
    }

    /**
     * Resolve a variable reference to full path
     */
    private resolveVariablePath(from: string, currentEntity: string): string {
        if (from.includes('.')) {
            return from;
        }
        if (from === 'self') {
            return `${currentEntity}.${from}`;
        }
        return `${currentEntity}.${from}`;
    }

    /**
     * Generate explanation for a driver
     */
    private generateDriverExplanation(variable: string, change: number): string {
        const direction = change >= 0 ? 'increased' : 'decreased';
        const magnitude = Math.abs(change) > 0.3 ? 'significantly' : Math.abs(change) > 0.1 ? 'moderately' : 'slightly';
        return `${getDisplayLabel(variable, 'executive')} has ${magnitude} ${direction}`;
    }
}

// =============================================================================
// CONVENIENCE FUNCTION
// =============================================================================

/**
 * Analyze a simulation result for explainability
 */
export function analyzeSimulation(
    model: SystemModel,
    result: SimulationResult
): ExplainableResult {
    const engine = new ExplainabilityEngine(model, result);
    return engine.analyze();
}
