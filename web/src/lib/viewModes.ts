/**
 * View Modes Configuration for Explainable Visualization System
 * 
 * Implements the Visualization Pyramid:
 * Level 1 — Executive (Story Mode)
 * Level 2 — Levers (Action Mode)
 * Level 3 — Analyst (Cause Mode)
 * Level 4 — Technical (Math Mode)
 */

import type { WidgetType } from '../types/explainability';

// =============================================================================
// VIEW MODE TYPES
// =============================================================================

export type ViewMode = 'executive' | 'levers' | 'analyst' | 'technical';

export interface ViewModeConfig {
    id: ViewMode;
    name: string;
    label: string;
    description: string;
    icon: string;
    /** Pyramid level (1-4) */
    level: number;
    /** Value format style */
    valueFormat: 'percentage' | 'score' | 'decimal' | 'currency';
    /** Show trend arrows */
    showTrendArrows: boolean;
    /** Show raw values */
    showRawValues: boolean;
    /** Show mathematical formulas */
    showFormulas: boolean;
    /** Color scheme */
    colorScheme: 'business' | 'action' | 'analytical' | 'technical';
    /** Label transformation style */
    labelStyle: 'friendly' | 'impact' | 'causal' | 'technical';
    /** Visible widgets for this mode */
    widgets: WidgetType[];
    /** Data density level */
    dataDensity: 'minimal' | 'moderate' | 'detailed' | 'full';
    /** Interaction complexity */
    interactionLevel: 'simple' | 'moderate' | 'advanced' | 'expert';
    /** Advanced analysis label (for deep analysis mode) */
    advancedLabel: string;
}

// =============================================================================
// VIEW MODE CONFIGURATIONS
// =============================================================================

export const VIEW_MODE_CONFIGS: Record<ViewMode, ViewModeConfig> = {
    // Level 1 — Executive (Story Mode)
    executive: {
        id: 'executive',
        name: 'Exécutif',
        label: 'CEO / Board',
        description: '30-second understanding: viability, risk, and key drivers',
        icon: 'briefcase',
        level: 1,
        valueFormat: 'percentage',
        showTrendArrows: true,
        showRawValues: false,
        showFormulas: false,
        colorScheme: 'business',
        labelStyle: 'friendly',
        widgets: [
            'scorecard',
            'keyDrivers',
            'scenarioProjection',
            'aiInsight'
        ],
        dataDensity: 'minimal',
        interactionLevel: 'simple',
        advancedLabel: 'Insights Stratégiques'
    },

    // Level 2 — Levers (Action Mode)
    levers: {
        id: 'levers',
        name: 'Leviers',
        label: 'Manager / Décideur',
        description: 'Controllable parameters and their impact',
        icon: 'sliders',
        level: 2,
        valueFormat: 'score',
        showTrendArrows: true,
        showRawValues: false,
        showFormulas: false,
        colorScheme: 'action',
        labelStyle: 'impact',
        widgets: [
            'scorecard',
            'leverageTable',
            'liveSimulator',
            'opportunityMap',
            'scenarioProjection'
        ],
        dataDensity: 'moderate',
        interactionLevel: 'moderate',
        advancedLabel: 'Analyse des Leviers'
    },

    // Level 3 — Analyst (Cause Mode)
    analyst: {
        id: 'analyst',
        name: 'Analyste',
        label: 'Analyste / Consultant',
        description: 'Causal mechanisms and contribution analysis',
        icon: 'search',
        level: 3,
        valueFormat: 'decimal',
        showTrendArrows: true,
        showRawValues: true,
        showFormulas: false,
        colorScheme: 'analytical',
        labelStyle: 'causal',
        widgets: [
            'causalGraph',
            'contributionPlot',
            'criticalPath',
            'narrativeTimeline',
            'sensitivityHeatmap'
        ],
        dataDensity: 'detailed',
        interactionLevel: 'advanced',
        advancedLabel: 'Analyse Causale'
    },

    // Level 4 — Technical (Math Mode)
    technical: {
        id: 'technical',
        name: 'Technique',
        label: 'Ingénieur / Développeur',
        description: 'Mathematical details, equations, and numerical analysis',
        icon: 'code',
        level: 4,
        valueFormat: 'decimal',
        showTrendArrows: false,
        showRawValues: true,
        showFormulas: true,
        colorScheme: 'technical',
        labelStyle: 'technical',
        widgets: [
            'timeSeries',
            'sensitivityHeatmap',
            'parameterDistribution',
            'equationInspector',
            'stabilityIndicator',
            'causalGraph'
        ],
        dataDensity: 'full',
        interactionLevel: 'expert',
        advancedLabel: 'Analyse Technique'
    }
};

// =============================================================================
// FRIENDLY LABEL MAPPINGS
// =============================================================================

const FRIENDLY_LABELS: Record<ViewMode, Record<string, string>> = {
    executive: {
        // Educational system
        'satisfaction': 'Student Happiness',
        'motivation': 'Engagement Level',
        'qualite': 'Teaching Quality',
        'retention': 'Staff Retention',
        'enrollment': 'Enrollment Rate',
        'budget': 'Budget Health',
        'housing': 'Housing Availability',
        'transport': 'Transport Access',
        'subsidy': 'Subsidy Level',
        'fatigue': 'Staff Fatigue',
        // Business system
        'market_share': 'Market Position',
        'revenue': 'Revenue Growth',
        'cost': 'Cost Efficiency',
        'risk': 'Risk Level',
        'customer_satisfaction': 'Customer Happiness',
    },
    levers: {
        'satisfaction': 'Student Satisfaction Impact',
        'motivation': 'Motivation Lever',
        'qualite': 'Quality Investment',
        'retention': 'Retention Strategy',
        'budget': 'Budget Allocation',
        'housing': 'Housing Program',
        'transport': 'Transport Initiative',
        'subsidy': 'Subsidy Program',
        'market_share': 'Market Opportunity',
        'revenue': 'Revenue Driver',
    },
    analyst: {
        'satisfaction': 'satisfaction (student)',
        'motivation': 'motivation (student)',
        'qualite': 'qualité (teacher)',
        'retention': 'retention (staff)',
        'budget': 'budget (system)',
        'housing': 'housing (infrastructure)',
        'transport': 'transport (access)',
    },
    technical: {
        // Technical mode keeps original names
    }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get widgets visible for a specific view mode
 */
export function getVisibleWidgets(mode: ViewMode): WidgetType[] {
    return VIEW_MODE_CONFIGS[mode].widgets;
}

/**
 * Check if a widget should be visible in current mode
 */
export function isWidgetVisible(widget: WidgetType, mode: ViewMode): boolean {
    return VIEW_MODE_CONFIGS[mode].widgets.includes(widget);
}

/**
 * Get display label for a variable based on view mode
 */
export function getDisplayLabel(technicalName: string, viewMode: ViewMode): string {
    if (viewMode === 'technical') {
        return technicalName;
    }

    // Extract component name from path (Entity.component -> component)
    const componentName = technicalName.includes('.')
        ? technicalName.split('.').pop()!
        : technicalName;

    // Try to find a friendly mapping
    const friendlyMap = FRIENDLY_LABELS[viewMode] || {};
    if (friendlyMap[componentName.toLowerCase()]) {
        return friendlyMap[componentName.toLowerCase()];
    }

    // Default: convert snake_case to Title Case
    return formatTechnicalName(componentName, viewMode);
}

function formatTechnicalName(name: string, _viewMode: ViewMode): string {
    // Convert snake_case to words
    let words = name.replace(/_/g, ' ').split(' ');

    // Capitalize each word
    words = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

    return words.join(' ');
}

/**
 * Format a value based on view mode
 */
export function formatValue(
    value: number,
    viewMode: ViewMode,
    min: number = 0,
    max: number = 1
): string {
    const config = VIEW_MODE_CONFIGS[viewMode];

    switch (config.valueFormat) {
        case 'percentage': {
            const pct = ((value - min) / (max - min)) * 100;
            return `${pct.toFixed(0)}%`;
        }

        case 'score': {
            const score = ((value - min) / (max - min)) * 10;
            return `${score.toFixed(1)}/10`;
        }

        case 'decimal':
            return value.toFixed(4);

        case 'currency': {
            const millions = value * 100;
            if (millions >= 1000) {
                return `$${(millions / 1000).toFixed(1)}B`;
            }
            return `$${millions.toFixed(0)}M`;
        }

        default:
            return value.toFixed(2);
    }
}

/**
 * Get trend indicator for a value change
 */
export function getTrendIndicator(
    currentValue: number,
    previousValue: number,
    viewMode: ViewMode
): { direction: 'up' | 'down' | 'stable'; label: string; color: string } {
    const change = currentValue - previousValue;
    const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;

    if (Math.abs(changePercent) < 1) {
        return { direction: 'stable', label: 'Stable', color: 'text-muted-foreground' };
    }

    const isUp = change > 0;

    const labels: Record<ViewMode, { up: string; down: string }> = {
        executive: { up: 'Growing', down: 'Declining' },
        levers: { up: 'Opportunity', down: 'At Risk' },
        analyst: { up: `+${changePercent.toFixed(1)}%`, down: `${changePercent.toFixed(1)}%` },
        technical: { up: `+${changePercent.toFixed(2)}%`, down: `${changePercent.toFixed(2)}%` }
    };

    return {
        direction: isUp ? 'up' : 'down',
        label: isUp ? labels[viewMode].up : labels[viewMode].down,
        color: isUp ? 'text-green-500' : 'text-red-500'
    };
}

/**
 * Get chart color scheme based on view mode
 */
export function getChartColors(viewMode: ViewMode): {
    primary: string[];
    secondary: string[];
    positive: string;
    negative: string;
    neutral: string;
    background: string;
} {
    const config = VIEW_MODE_CONFIGS[viewMode];

    switch (config.colorScheme) {
        case 'business':
            return {
                primary: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
                secondary: ['#93c5fd', '#6ee7b7', '#fcd34d', '#fca5a5', '#c4b5fd', '#f9a8d4'],
                positive: '#10b981',
                negative: '#ef4444',
                neutral: '#6b7280',
                background: '#f8fafc'
            };

        case 'action':
            return {
                primary: ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4'],
                secondary: ['#fcd34d', '#86efac', '#93c5fd', '#fca5a5', '#c4b5fd', '#67e8f9'],
                positive: '#22c55e',
                negative: '#ef4444',
                neutral: '#f59e0b',
                background: '#fffbeb'
            };

        case 'analytical':
            return {
                primary: ['#6366f1', '#14b8a6', '#f97316', '#e11d48', '#a855f7', '#0891b2'],
                secondary: ['#a5b4fc', '#5eead4', '#fdba74', '#fda4af', '#d8b4fe', '#67e8f9'],
                positive: '#14b8a6',
                negative: '#e11d48',
                neutral: '#6366f1',
                background: '#f5f3ff'
            };

        case 'technical':
            return {
                primary: ['#06b6d4', '#84cc16', '#eab308', '#f97316', '#a855f7', '#14b8a6'],
                secondary: ['#67e8f9', '#bef264', '#fde047', '#fdba74', '#d8b4fe', '#5eead4'],
                positive: '#84cc16',
                negative: '#f97316',
                neutral: '#06b6d4',
                background: '#0f172a'
            };

        default:
            return {
                primary: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
                secondary: ['#93c5fd', '#6ee7b7', '#fcd34d', '#fca5a5', '#c4b5fd', '#f9a8d4'],
                positive: '#10b981',
                negative: '#ef4444',
                neutral: '#6b7280',
                background: '#ffffff'
            };
    }
}

/**
 * Get Y-axis label based on view mode
 */
export function getYAxisLabel(viewMode: ViewMode): string {
    switch (viewMode) {
        case 'executive':
            return 'Performance (%)';
        case 'levers':
            return 'Impact Score';
        case 'analyst':
            return 'Value';
        case 'technical':
            return 'Raw Value';
        default:
            return 'Value';
    }
}

/**
 * Get tooltip content based on view mode
 */
export function getTooltipContent(
    name: string,
    value: number,
    viewMode: ViewMode,
    min: number = 0,
    max: number = 1
): { label: string; value: string; insight?: string } {
    const displayLabel = getDisplayLabel(name, viewMode);
    const formattedValue = formatValue(value, viewMode, min, max);

    let insight: string | undefined;
    const normalizedValue = (value - min) / (max - min);

    switch (viewMode) {
        case 'executive':
            if (normalizedValue > 0.7) insight = 'Strong performance';
            else if (normalizedValue > 0.4) insight = 'Monitor closely';
            else insight = 'Requires attention';
            break;
        case 'levers':
            if (normalizedValue > 0.7) insight = 'High opportunity';
            else if (normalizedValue > 0.4) insight = 'Worth pursuing';
            else insight = 'Low priority';
            break;
        case 'analyst':
            if (normalizedValue > 0.7) insight = 'Above threshold';
            else if (normalizedValue > 0.4) insight = 'Within bounds';
            else insight = 'Below threshold';
            break;
        case 'technical':
            // No insight for technical mode
            break;
    }

    return { label: displayLabel, value: formattedValue, insight };
}

/**
 * Generate executive summary based on simulation results
 */
export function generateSummary(
    finalState: Record<string, number>,
    viewMode: ViewMode
): { title: string; points: string[] } {
    const values = Object.entries(finalState);
    const highPerformers = values.filter(([, v]) => v > 0.7);
    const lowPerformers = values.filter(([, v]) => v < 0.3);
    const riskyItems = values.filter(([k]) => k.toLowerCase().includes('risk'));

    switch (viewMode) {
        case 'executive':
            return {
                title: 'Executive Summary',
                points: [
                    `${highPerformers.length} metrics showing strong performance`,
                    `${lowPerformers.length} areas requiring strategic attention`,
                    riskyItems.length > 0 ? `${riskyItems.length} risk factors identified` : 'No critical risks detected',
                    'Overall system stability: ' + (lowPerformers.length < 3 ? 'Good' : 'Needs Review')
                ]
            };

        case 'levers':
            return {
                title: 'Leverage Opportunities',
                points: [
                    `${highPerformers.length} high-impact levers identified`,
                    `${lowPerformers.length} areas with improvement potential`,
                    'Recommended action: Focus on highest-elasticity parameters'
                ]
            };

        case 'analyst':
            return {
                title: 'Causal Analysis',
                points: [
                    `${values.length} state variables analyzed`,
                    `${highPerformers.length} variables above 70% threshold`,
                    `${lowPerformers.length} variables below 30% threshold`,
                    'Primary causal chains identified'
                ]
            };

        case 'technical':
            return {
                title: 'Technical Analysis',
                points: [
                    `${values.length} state variables tracked`,
                    `Convergence: ${lowPerformers.length === 0 ? 'Stable' : 'Some variables at bounds'}`,
                    `Max value: ${Math.max(...values.map(([, v]) => v)).toFixed(4)}`,
                    `Min value: ${Math.min(...values.map(([, v]) => v)).toFixed(4)}`
                ]
            };

        default:
            return { title: 'Summary', points: [] };
    }
}
