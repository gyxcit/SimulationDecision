// View modes for different audiences
export type ViewMode = 'executive' | 'technical' | 'sales' | 'investor';

export interface ViewModeConfig {
    id: ViewMode;
    name: string;
    label: string;
    description: string;
    icon: string;
    // How to format values
    valueFormat: 'percentage' | 'decimal' | 'score' | 'currency';
    // What to show in graphs
    showTrendArrows: boolean;
    showRawValues: boolean;
    showFormulas: boolean;
    // Color scheme
    colorScheme: 'business' | 'technical' | 'financial';
    // Labels transformation
    labelStyle: 'friendly' | 'technical' | 'impact' | 'financial';
    // Advanced analysis label
    advancedLabel: string;
}

export const VIEW_MODE_CONFIGS: Record<ViewMode, ViewModeConfig> = {
    executive: {
        id: 'executive',
        name: 'Exécutif',
        label: 'CEO / Executive',
        description: 'Strategic KPIs, trends, and high-level insights',
        icon: 'briefcase',
        valueFormat: 'percentage',
        showTrendArrows: true,
        showRawValues: false,
        showFormulas: false,
        colorScheme: 'business',
        labelStyle: 'friendly',
        advancedLabel: 'Deep Analysis'
    },
    technical: {
        id: 'technical',
        name: 'Technique',
        label: 'Technical',
        description: 'Raw values, formulas, and detailed coefficients',
        icon: 'code',
        valueFormat: 'decimal',
        showTrendArrows: false,
        showRawValues: true,
        showFormulas: true,
        colorScheme: 'technical',
        labelStyle: 'technical',
        advancedLabel: 'Analyse Avancée'
    },
    sales: {
        id: 'sales',
        name: 'Commercial',
        label: 'Sales / Commercial',
        description: 'Market impact, opportunities, and customer value',
        icon: 'trending-up',
        valueFormat: 'score',
        showTrendArrows: true,
        showRawValues: false,
        showFormulas: false,
        colorScheme: 'business',
        labelStyle: 'impact',
        advancedLabel: 'Opportunités'
    },
    investor: {
        id: 'investor',
        name: 'Investisseur',
        label: 'Investor / Board',
        description: 'ROI, risk assessment, and financial projections',
        icon: 'dollar-sign',
        valueFormat: 'currency',
        showTrendArrows: true,
        showRawValues: false,
        showFormulas: false,
        colorScheme: 'financial',
        labelStyle: 'financial',
        advancedLabel: 'Analyse des Risques'
    }
};

// Friendly label mappings for common technical terms
const FRIENDLY_LABELS: Record<string, Record<string, string>> = {
    // Example mappings - these would be expanded based on actual model components
    executive: {
        'market_share': 'Market Position',
        'revenue': 'Revenue Growth',
        'cost': 'Cost Efficiency',
        'risk': 'Risk Level',
        'innovation': 'Innovation Index',
        'customer_satisfaction': 'Customer Happiness',
        'employee_engagement': 'Team Engagement',
        'operational_efficiency': 'Operations Score',
        'brand_value': 'Brand Strength',
        'competitive_advantage': 'Competitive Edge',
        'ai_integration': 'AI Adoption',
        'lethal_ai_integration': 'Defense AI Level',
        'non_lethal_ai_integration': 'Support AI Level',
        'political_scrutiny': 'Political Risk',
        'ethical_scrutiny': 'Ethics Compliance',
        'defense_ministry_engagement': 'Gov. Relations',
        'population_harassment_risk': 'Social Risk Index'
    },
    technical: {
        // Technical mode keeps original names
    },
    sales: {
        'market_share': 'Market Opportunity',
        'revenue': 'Sales Growth',
        'cost': 'Margin Impact',
        'risk': 'Deal Risk',
        'innovation': 'Product Edge',
        'customer_satisfaction': 'Customer Win Rate',
        'ai_integration': 'AI Value Prop',
        'lethal_ai_integration': 'Defense Capability',
        'non_lethal_ai_integration': 'Support Capability',
        'political_scrutiny': 'Regulatory Barrier',
        'ethical_scrutiny': 'Compliance Score',
        'defense_ministry_engagement': 'Key Account Status',
        'population_harassment_risk': 'Public Perception'
    },
    investor: {
        'market_share': 'Market Cap Potential',
        'revenue': 'Revenue Multiple',
        'cost': 'Cost Structure',
        'risk': 'Investment Risk',
        'innovation': 'R&D Value',
        'customer_satisfaction': 'NPS Score',
        'ai_integration': 'Tech Investment ROI',
        'lethal_ai_integration': 'Defense Revenue',
        'non_lethal_ai_integration': 'Civilian Revenue',
        'political_scrutiny': 'Regulatory Risk',
        'ethical_scrutiny': 'ESG Score',
        'defense_ministry_engagement': 'B2G Revenue',
        'population_harassment_risk': 'Reputation Risk'
    }
};

// Convert a technical label to a user-friendly one based on view mode
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
    if (friendlyMap[componentName]) {
        return friendlyMap[componentName];
    }
    
    // Default: convert snake_case to Title Case and make it more friendly
    return formatTechnicalName(componentName, viewMode);
}

function formatTechnicalName(name: string, viewMode: ViewMode): string {
    // Convert snake_case to words
    let words = name.replace(/_/g, ' ').split(' ');
    
    // Capitalize each word
    words = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    
    // Add context based on view mode
    const result = words.join(' ');
    
    if (viewMode === 'investor' && !result.includes('Risk') && !result.includes('Revenue')) {
        // Add context for investors if not already present
    }
    
    return result;
}

// Format a value based on view mode
export function formatValue(value: number, viewMode: ViewMode, min: number = 0, max: number = 1): string {
    const config = VIEW_MODE_CONFIGS[viewMode];
    
    switch (config.valueFormat) {
        case 'percentage':
            // Convert 0-1 to percentage
            const pct = ((value - min) / (max - min)) * 100;
            return `${pct.toFixed(0)}%`;
        
        case 'decimal':
            // Show raw decimal
            return value.toFixed(4);
        
        case 'score':
            // Show as score out of 10
            const score = ((value - min) / (max - min)) * 10;
            return `${score.toFixed(1)}/10`;
        
        case 'currency':
            // Show as currency-like value (millions)
            const millions = value * 100; // Arbitrary scale
            if (millions >= 1000) {
                return `$${(millions / 1000).toFixed(1)}B`;
            }
            return `$${millions.toFixed(0)}M`;
        
        default:
            return value.toFixed(2);
    }
}

// Get trend indicator
export function getTrendIndicator(currentValue: number, previousValue: number, viewMode: ViewMode): {
    direction: 'up' | 'down' | 'stable';
    label: string;
    color: string;
} {
    const change = currentValue - previousValue;
    const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;
    
    if (Math.abs(changePercent) < 1) {
        return { direction: 'stable', label: 'Stable', color: 'text-muted-foreground' };
    }
    
    const isUp = change > 0;
    
    // Labels based on view mode
    const labels: Record<ViewMode, { up: string, down: string }> = {
        executive: { up: 'Growing', down: 'Declining' },
        technical: { up: `+${changePercent.toFixed(1)}%`, down: `${changePercent.toFixed(1)}%` },
        sales: { up: 'Opportunity', down: 'At Risk' },
        investor: { up: 'Uptrend', down: 'Downtrend' }
    };
    
    return {
        direction: isUp ? 'up' : 'down',
        label: isUp ? labels[viewMode].up : labels[viewMode].down,
        color: isUp ? 'text-green-500' : 'text-red-500'
    };
}

// Get chart color scheme based on view mode
export function getChartColors(viewMode: ViewMode): {
    primary: string[];
    secondary: string[];
    background: string;
} {
    const config = VIEW_MODE_CONFIGS[viewMode];
    
    switch (config.colorScheme) {
        case 'business':
            return {
                primary: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
                secondary: ['#93c5fd', '#6ee7b7', '#fcd34d', '#fca5a5', '#c4b5fd', '#f9a8d4'],
                background: '#f8fafc'
            };
        
        case 'technical':
            return {
                primary: ['#06b6d4', '#84cc16', '#eab308', '#f97316', '#a855f7', '#14b8a6'],
                secondary: ['#67e8f9', '#bef264', '#fde047', '#fdba74', '#d8b4fe', '#5eead4'],
                background: '#0f172a'
            };
        
        case 'financial':
            return {
                primary: ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#6366f1', '#14b8a6'],
                secondary: ['#86efac', '#fca5a5', '#93c5fd', '#fcd34d', '#a5b4fc', '#5eead4'],
                background: '#fefce8'
            };
        
        default:
            return {
                primary: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
                secondary: ['#93c5fd', '#6ee7b7', '#fcd34d', '#fca5a5', '#c4b5fd', '#f9a8d4'],
                background: '#ffffff'
            };
    }
}

// Get Y-axis label based on view mode
export function getYAxisLabel(viewMode: ViewMode): string {
    switch (viewMode) {
        case 'executive':
            return 'Performance (%)';
        case 'technical':
            return 'Value';
        case 'sales':
            return 'Score';
        case 'investor':
            return 'Index Value';
        default:
            return 'Value';
    }
}

// Get tooltip formatter based on view mode
export function getTooltipContent(
    name: string, 
    value: number, 
    viewMode: ViewMode,
    min: number = 0,
    max: number = 1
): { label: string; value: string; insight?: string } {
    const displayLabel = getDisplayLabel(name, viewMode);
    const formattedValue = formatValue(value, viewMode, min, max);
    
    // Generate insight based on view mode
    let insight: string | undefined;
    const normalizedValue = (value - min) / (max - min);
    
    if (viewMode === 'executive') {
        if (normalizedValue > 0.7) insight = 'Strong performance';
        else if (normalizedValue > 0.4) insight = 'Moderate - monitor closely';
        else insight = 'Requires attention';
    } else if (viewMode === 'sales') {
        if (normalizedValue > 0.7) insight = 'High opportunity';
        else if (normalizedValue > 0.4) insight = 'Worth pursuing';
        else insight = 'Low priority';
    } else if (viewMode === 'investor') {
        if (normalizedValue > 0.7) insight = 'Strong indicator';
        else if (normalizedValue > 0.4) insight = 'Neutral';
        else insight = 'Risk factor';
    }
    
    return { label: displayLabel, value: formattedValue, insight };
}

// Generate executive summary based on simulation results
export function generateSummary(
    finalState: Record<string, number>,
    viewMode: ViewMode
): { title: string; points: string[] } {
    // Analyze the final state
    const values = Object.entries(finalState);
    const highPerformers = values.filter(([_, v]) => v > 0.7);
    const lowPerformers = values.filter(([_, v]) => v < 0.3);
    const riskyItems = values.filter(([k, _]) => k.toLowerCase().includes('risk'));
    
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
        
        case 'technical':
            return {
                title: 'Technical Analysis',
                points: [
                    `${values.length} state variables tracked`,
                    `Convergence: ${lowPerformers.length === 0 ? 'Stable' : 'Some variables at bounds'}`,
                    `Max value: ${Math.max(...values.map(([_, v]) => v)).toFixed(4)}`,
                    `Min value: ${Math.min(...values.map(([_, v]) => v)).toFixed(4)}`
                ]
            };
        
        case 'sales':
            return {
                title: 'Sales Intelligence',
                points: [
                    `${highPerformers.length} strong selling points identified`,
                    `Market positioning: ${highPerformers.length > lowPerformers.length ? 'Favorable' : 'Challenging'}`,
                    `Key differentiators: ${highPerformers.slice(0, 3).map(([k]) => getDisplayLabel(k, viewMode)).join(', ') || 'None prominent'}`,
                    'Recommended focus: ' + (lowPerformers[0] ? getDisplayLabel(lowPerformers[0][0], viewMode) : 'Maintain current strategy')
                ]
            };
        
        case 'investor':
            return {
                title: 'Investment Outlook',
                points: [
                    `Growth indicators: ${highPerformers.length}/${values.length} positive`,
                    `Risk assessment: ${riskyItems.filter(([_, v]) => v > 0.5).length > 0 ? 'Moderate' : 'Low'}`,
                    `Portfolio fit: ${highPerformers.length >= 3 ? 'Strong candidate' : 'Further due diligence needed'}`,
                    `ESG alignment: ${riskyItems.every(([_, v]) => v < 0.5) ? 'Compliant' : 'Some concerns'}`
                ]
            };
        
        default:
            return { title: 'Summary', points: [] };
    }
}
