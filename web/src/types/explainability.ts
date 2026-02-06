/**
 * Explainability Types for Multi-Level Visualization System
 * 
 * Supports 4 view modes: Executive, Levers, Analyst, Technical
 */

// =============================================================================
// DRIVER METRICS (What is driving the system?)
// =============================================================================

export interface DriverMetric {
    /** Variable path (e.g., "Teachers.retention") */
    variable: string;
    /** Display name for UI */
    displayName: string;
    /** Impact score 0-100 */
    impact: number;
    /** Direction of impact */
    direction: 'positive' | 'negative';
    /** Rank among all drivers (1 = highest) */
    rank: number;
    /** Natural language explanation */
    explanation?: string;
}

// =============================================================================
// SENSITIVITY METRICS (What can be changed?)
// =============================================================================

export interface SensitivityMetric {
    /** Variable path */
    variable: string;
    /** Display name */
    displayName: string;
    /** Elasticity: % change in output per % change in input */
    elasticity: number;
    /** How controllable is this parameter? */
    controlLevel: 'high' | 'medium' | 'low';
    /** Current value */
    currentValue: number;
    /** Min bound */
    min: number;
    /** Max bound */
    max: number;
    /** Suggested optimal value */
    suggestedValue?: number;
}

// =============================================================================
// CONTRIBUTION METRICS (Why is it happening?)
// =============================================================================

export interface ContributionItem {
    /** Source variable */
    source: string;
    /** Display name */
    displayName: string;
    /** Absolute contribution value */
    contribution: number;
    /** Percentage of total change */
    percentage: number;
    /** Sign of contribution */
    sign: '+' | '-';
    /** Color for visualization */
    color: string;
}

export interface ContributionMetric {
    /** Target variable being explained */
    target: string;
    /** Target display name */
    targetDisplayName: string;
    /** Final value */
    finalValue: number;
    /** Initial value */
    initialValue: number;
    /** Total change */
    totalChange: number;
    /** List of contributors */
    contributors: ContributionItem[];
}

// =============================================================================
// CRITICAL PATHS (Causal chains)
// =============================================================================

export interface CriticalPath {
    /** ID for this path */
    id: string;
    /** Ordered list of variable nodes */
    nodes: string[];
    /** Display names for each node */
    nodeDisplayNames: string[];
    /** Total impact of this chain */
    totalImpact: number;
    /** Human-readable description */
    description: string;
    /** Is this path a risk or opportunity? */
    nature: 'risk' | 'opportunity' | 'neutral';
}

// =============================================================================
// SCENARIOS (What-if projections)
// =============================================================================

export interface ScenarioResult {
    /** Scenario identifier */
    id: string;
    /** Scenario name */
    name: string;
    /** Short description */
    description: string;
    /** Baseline value (no changes) */
    baseline: number;
    /** Projected value with scenario */
    projected: number;
    /** Absolute delta */
    delta: number;
    /** Percentage change */
    deltaPercent: number;
    /** Timeline in simulation units */
    timeline: number;
    /** Color for visualization */
    color: string;
    /** Parameters changed in this scenario */
    parameters: Array<{
        variable: string;
        originalValue: number;
        newValue: number;
    }>;
}

// =============================================================================
// TIMELINE EVENTS (Narrative annotations)
// =============================================================================

export type TimelineEventType =
    | 'peak'
    | 'trough'
    | 'threshold_cross'
    | 'inflection'
    | 'stability'
    | 'divergence';

export interface TimelineEvent {
    /** Time point */
    time: number;
    /** Variable affected */
    variable: string;
    /** Display name */
    displayName: string;
    /** Type of event */
    event: TimelineEventType;
    /** Value at this point */
    value: number;
    /** Human-readable annotation */
    annotation: string;
    /** Severity level */
    severity: 'info' | 'warning' | 'critical';
}

// =============================================================================
// VIABILITY & RISK ASSESSMENT
// =============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type StabilityScore = 'good' | 'moderate' | 'unstable';

export interface ViabilityAssessment {
    /** Overall viability score 0-100 */
    score: number;
    /** Previous score for trend */
    previousScore?: number;
    /** Trend direction */
    trend: 'up' | 'down' | 'stable';
    /** Risk level */
    riskLevel: RiskLevel;
    /** Stability assessment */
    stability: StabilityScore;
    /** Key factors affecting viability */
    factors: Array<{
        name: string;
        impact: number;
        direction: 'positive' | 'negative';
    }>;
}

// =============================================================================
// MAIN EXPLAINABILITY RESULT
// =============================================================================

export interface ExplainableResult {
    /** Top drivers affecting the system */
    mainDrivers: DriverMetric[];
    /** Sensitivity analysis results */
    sensitivities: SensitivityMetric[];
    /** Contribution decomposition for each variable */
    contributions: ContributionMetric[];
    /** Critical influence paths */
    criticalPaths: CriticalPath[];
    /** Scenario projections */
    scenarios: ScenarioResult[];
    /** Timeline events/annotations */
    timeline: TimelineEvent[];
    /** Viability assessment */
    viability: ViabilityAssessment;
    /** AI-generated natural language insight */
    aiInsight?: string;
    /** Computation timestamp */
    computedAt: Date;
}

// =============================================================================
// WIDGET VISIBILITY PER VIEW MODE
// =============================================================================

export type WidgetType =
    | 'scorecard'
    | 'keyDrivers'
    | 'scenarioProjection'
    | 'aiInsight'
    | 'leverageTable'
    | 'liveSimulator'
    | 'opportunityMap'
    | 'causalGraph'
    | 'contributionPlot'
    | 'criticalPath'
    | 'narrativeTimeline'
    | 'timeSeries'
    | 'sensitivityHeatmap'
    | 'parameterDistribution'
    | 'equationInspector'
    | 'stabilityIndicator';

export interface WidgetConfig {
    type: WidgetType;
    title: string;
    description: string;
    /** Minimum height in grid units */
    minHeight: number;
    /** Default width in grid columns (1-12) */
    defaultWidth: number;
}
