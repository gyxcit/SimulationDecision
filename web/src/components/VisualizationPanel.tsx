import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { 
    LineChart, 
    BarChart3, 
    TrendingUp, 
    Activity, 
    Layers,
    ArrowUpDown,
    Maximize2,
    ChevronDown,
    ChevronRight,
    Check,
    GitCompare,
    PieChart
} from 'lucide-react';
import type { SimulationResult } from '../types';

type ChartType = 'timeSeries' | 'phaseSpace' | 'distribution' | 'comparison' | 'rates' | 'correlation' | 'multiSimComparison';

interface ChartConfig {
    id: ChartType;
    name: string;
    description: string;
    icon: React.ReactNode;
}

const CHART_TYPES: ChartConfig[] = [
    { id: 'timeSeries', name: 'Séries Temporelles', description: 'Évolution dans le temps', icon: <LineChart className="w-4 h-4" /> },
    { id: 'phaseSpace', name: 'Espace de Phase', description: 'Relations entre variables', icon: <Activity className="w-4 h-4" /> },
    { id: 'distribution', name: 'Distribution', description: 'Répartition des valeurs', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'comparison', name: 'Comparaison', description: 'États initial vs final', icon: <ArrowUpDown className="w-4 h-4" /> },
    { id: 'rates', name: 'Taux de Variation', description: 'Dérivées et vitesses', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'correlation', name: 'Corrélations', description: 'Matrice de corrélation', icon: <Layers className="w-4 h-4" /> },
    { id: 'multiSimComparison', name: 'Comparaison Simulations', description: 'Comparer plusieurs simulations', icon: <GitCompare className="w-4 h-4" /> },
];

const COLORS = [
    '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

export const VisualizationPanel: React.FC = () => {
    const { simulationResult } = useStore();
    const [selectedCharts, setSelectedCharts] = useState<ChartType[]>(['timeSeries']);

    const toggleChart = (chartType: ChartType) => {
        setSelectedCharts(prev => 
            prev.includes(chartType) 
                ? prev.filter(c => c !== chartType)
                : [...prev, chartType]
        );
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-3 border-b">
                <h2 className="font-semibold text-sm">Visualisation</h2>
                <p className="text-xs text-muted-foreground mt-1">
                    Sélectionnez les graphiques à afficher
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {CHART_TYPES.map(chart => (
                    <button
                        key={chart.id}
                        onClick={() => toggleChart(chart.id)}
                        className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                            selectedCharts.includes(chart.id) 
                                ? "bg-primary/10 text-primary border border-primary/20" 
                                : "hover:bg-accent text-muted-foreground"
                        )}
                    >
                        <div className={cn(
                            "w-8 h-8 rounded flex items-center justify-center",
                            selectedCharts.includes(chart.id) ? "bg-primary/20" : "bg-accent"
                        )}>
                            {chart.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{chart.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{chart.description}</div>
                        </div>
                    </button>
                ))}
            </div>

            {!simulationResult && (
                <div className="p-3 border-t bg-accent/20">
                    <p className="text-xs text-muted-foreground text-center">
                        Lancez une simulation pour voir les graphiques
                    </p>
                </div>
            )}
        </div>
    );
};

// Full page visualization view
export const VisualizationView: React.FC = () => {
    const { simulationResult, model, storedSimulations } = useStore();
    const [selectedCharts, setSelectedCharts] = useState<ChartType[]>(['timeSeries']);
    const [fullscreenChart, setFullscreenChart] = useState<ChartType | null>(null);
    const [activeChartForConfig, setActiveChartForConfig] = useState<ChartType | null>('timeSeries');
    
    // Per-chart variable selection - use Set for better tracking
    const [chartVariables, setChartVariables] = useState<Record<ChartType, Set<string>>>({
        timeSeries: new Set(),
        phaseSpace: new Set(),
        distribution: new Set(),
        comparison: new Set(),
        rates: new Set(),
        correlation: new Set(),
        multiSimComparison: new Set()
    });

    // Selected simulations for comparison
    const [selectedSimulations, setSelectedSimulations] = useState<string[]>([]);

    // Extract variable names from model
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

    // Initialize chart variables with all variables when they change
    React.useEffect(() => {
        if (variables.length > 0) {
            setChartVariables(prev => {
                const newState = { ...prev };
                Object.keys(newState).forEach(key => {
                    const chartType = key as ChartType;
                    if (newState[chartType].size === 0) {
                        newState[chartType] = new Set(variables);
                    }
                });
                return newState;
            });
        }
    }, [variables]);

    // Get active variables for a chart
    const getChartVariables = (chartType: ChartType): string[] => {
        const selected = chartVariables[chartType];
        if (selected.size === 0) return variables;
        return Array.from(selected).filter(v => variables.includes(v));
    };

    // Toggle variable for a chart
    const toggleVariable = (chartType: ChartType, varName: string) => {
        setChartVariables(prev => {
            const currentSet = prev[chartType].size > 0 ? new Set(prev[chartType]) : new Set(variables);
            if (currentSet.has(varName)) {
                currentSet.delete(varName);
            } else {
                currentSet.add(varName);
            }
            return { ...prev, [chartType]: currentSet };
        });
    };

    // Select all/none variables - FIXED
    const selectAllVariables = (chartType: ChartType, selectAll: boolean) => {
        setChartVariables(prev => ({
            ...prev,
            [chartType]: selectAll ? new Set(variables) : new Set<string>()
        }));
    };

    // Toggle simulation selection
    const toggleSimulationSelection = (simId: string) => {
        setSelectedSimulations(prev => 
            prev.includes(simId) 
                ? prev.filter(id => id !== simId)
                : [...prev, simId]
        );
    };

    // Calculate statistics
    const getStats = (result: SimulationResult, vars: string[]) => {
        if (!result || !result.history.length) return null;
        
        const statistics: Record<string, { min: number; max: number; mean: number; final: number; initial: number }> = {};
        
        vars.forEach(varName => {
            const values = result.history.map(h => h[varName] ?? 0);
            if (values.length === 0) return;
            statistics[varName] = {
                min: Math.min(...values),
                max: Math.max(...values),
                mean: values.reduce((a, b) => a + b, 0) / values.length,
                initial: values[0] ?? 0,
                final: values[values.length - 1] ?? 0
            };
        });
        
        return statistics;
    };

    const stats = useMemo(() => {
        return simulationResult ? getStats(simulationResult, variables) : null;
    }, [simulationResult, variables]);

    // Calculate rates of change
    const getRates = (result: SimulationResult, vars: string[]) => {
        if (!result || result.history.length < 2) return null;
        
        const rateData: Record<string, number[]> = {};
        
        vars.forEach(varName => {
            rateData[varName] = [];
            for (let i = 1; i < result.history.length; i++) {
                const dt = result.time_points[i] - result.time_points[i - 1];
                const dv = (result.history[i][varName] ?? 0) - (result.history[i - 1][varName] ?? 0);
                rateData[varName].push(dt !== 0 ? dv / dt : 0);
            }
        });
        
        return rateData;
    };

    const rates = useMemo(() => {
        return simulationResult ? getRates(simulationResult, variables) : null;
    }, [simulationResult, variables]);

    if (!simulationResult) {
        return (
            <div className="h-full flex items-center justify-center bg-background">
                <div className="text-center p-8">
                    <Activity className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Aucune donnée de simulation</h2>
                    <p className="text-muted-foreground">
                        Lancez une simulation pour visualiser les graphiques d'analyse
                    </p>
                </div>
            </div>
        );
    }

    const renderChart = (chartType: ChartType, isFullscreen: boolean = false) => {
        const height = isFullscreen ? 400 : 250;
        const width = isFullscreen ? 900 : 700;
        const chartVars = getChartVariables(chartType);
        
        if (chartVars.length === 0) {
            return (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Sélectionnez au moins une variable
                </div>
            );
        }
        
        const padding = { top: 40, right: 20, bottom: 40, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        switch (chartType) {
            case 'timeSeries': {
                // Calculate global min/max for all selected variables
                let globalMin = Infinity;
                let globalMax = -Infinity;
                chartVars.forEach(varName => {
                    const values = simulationResult.history.map(h => h[varName] ?? 0);
                    globalMin = Math.min(globalMin, ...values);
                    globalMax = Math.max(globalMax, ...values);
                });
                
                if (globalMin === globalMax) {
                    globalMax = globalMin + 1;
                }
                const range = globalMax - globalMin;
                globalMin -= range * 0.05;
                globalMax += range * 0.05;
                
                return (
                    <div className="w-full overflow-x-auto">
                        <svg width={width} height={height} style={{ minWidth: width }}>
                            {/* Background */}
                            <rect width={width} height={height} fill="transparent" />
                            
                            {/* Grid lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map(t => (
                                <g key={`grid-${t}`}>
                                    <line
                                        x1={padding.left}
                                        y1={padding.top + chartHeight * t}
                                        x2={padding.left + chartWidth}
                                        y2={padding.top + chartHeight * t}
                                        stroke="#374151"
                                        strokeOpacity="0.3"
                                        strokeDasharray="4"
                                    />
                                    <text
                                        x={padding.left - 8}
                                        y={padding.top + chartHeight * t + 4}
                                        textAnchor="end"
                                        fontSize="10"
                                        fill="#9ca3af"
                                    >
                                        {(globalMax - (globalMax - globalMin) * t).toFixed(1)}
                                    </text>
                                </g>
                            ))}
                            
                            {/* Axes */}
                            <line
                                x1={padding.left}
                                y1={padding.top + chartHeight}
                                x2={padding.left + chartWidth}
                                y2={padding.top + chartHeight}
                                stroke="#6b7280"
                                strokeWidth="1"
                            />
                            <line
                                x1={padding.left}
                                y1={padding.top}
                                x2={padding.left}
                                y2={padding.top + chartHeight}
                                stroke="#6b7280"
                                strokeWidth="1"
                            />
                            
                            {/* Data lines */}
                            {chartVars.map((varName, idx) => {
                                const values = simulationResult.history.map(h => h[varName] ?? 0);
                                const n = values.length;
                                
                                if (n < 2) return null;
                                
                                const points = values.map((v, i) => {
                                    const x = padding.left + (i / (n - 1)) * chartWidth;
                                    const y = padding.top + chartHeight - ((v - globalMin) / (globalMax - globalMin)) * chartHeight;
                                    return `${x},${y}`;
                                }).join(' ');
                                
                                return (
                                    <polyline
                                        key={varName}
                                        points={points}
                                        fill="none"
                                        stroke={COLORS[idx % COLORS.length]}
                                        strokeWidth="2"
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                    />
                                );
                            })}
                            
                            {/* Legend */}
                            <g transform={`translate(${padding.left + 10}, ${padding.top + 5})`}>
                                {chartVars.map((varName, idx) => (
                                    <g key={varName} transform={`translate(${(idx % 3) * 150}, ${Math.floor(idx / 3) * 18})`}>
                                        <rect width="12" height="12" fill={COLORS[idx % COLORS.length]} rx="2"/>
                                        <text x="16" y="10" fontSize="11" fill="#d1d5db">{varName}</text>
                                    </g>
                                ))}
                            </g>
                            
                            {/* X-axis label */}
                            <text
                                x={padding.left + chartWidth / 2}
                                y={height - 8}
                                textAnchor="middle"
                                fontSize="12"
                                fill="#9ca3af"
                            >
                                Temps
                            </text>
                        </svg>
                    </div>
                );
            }

            case 'phaseSpace': {
                if (chartVars.length < 2) {
                    return <div className="h-64 flex items-center justify-center text-muted-foreground">Sélectionnez au moins 2 variables</div>;
                }
                
                const var1 = chartVars[0];
                const var2 = chartVars[1];
                const vals1 = simulationResult.history.map(h => h[var1] ?? 0);
                const vals2 = simulationResult.history.map(h => h[var2] ?? 0);
                
                const min1 = Math.min(...vals1);
                const max1 = Math.max(...vals1) || 1;
                const min2 = Math.min(...vals2);
                const max2 = Math.max(...vals2) || 1;
                const range1 = (max1 - min1) || 1;
                const range2 = (max2 - min2) || 1;
                
                const points = vals1.map((v1, i) => {
                    const x = padding.left + ((v1 - min1) / range1) * chartWidth;
                    const y = padding.top + chartHeight - ((vals2[i] - min2) / range2) * chartHeight;
                    return `${x},${y}`;
                }).join(' ');
                
                return (
                    <div className="w-full overflow-x-auto">
                        <svg width={width} height={height} style={{ minWidth: width }}>
                            {/* Grid */}
                            <rect
                                x={padding.left}
                                y={padding.top}
                                width={chartWidth}
                                height={chartHeight}
                                fill="transparent"
                                stroke="#374151"
                                strokeOpacity="0.3"
                            />
                            
                            {/* Trajectory */}
                            <polyline
                                points={points}
                                fill="none"
                                stroke={COLORS[0]}
                                strokeWidth="2"
                                strokeLinejoin="round"
                            />
                            
                            {/* Start point */}
                            <circle 
                                cx={padding.left + ((vals1[0] - min1) / range1) * chartWidth}
                                cy={padding.top + chartHeight - ((vals2[0] - min2) / range2) * chartHeight}
                                r="8"
                                fill="#22c55e"
                            />
                            <text
                                x={padding.left + ((vals1[0] - min1) / range1) * chartWidth + 12}
                                y={padding.top + chartHeight - ((vals2[0] - min2) / range2) * chartHeight + 4}
                                fontSize="10"
                                fill="#22c55e"
                            >
                                Début
                            </text>
                            
                            {/* End point */}
                            <circle 
                                cx={padding.left + ((vals1[vals1.length-1] - min1) / range1) * chartWidth}
                                cy={padding.top + chartHeight - ((vals2[vals2.length-1] - min2) / range2) * chartHeight}
                                r="8"
                                fill="#ef4444"
                            />
                            <text
                                x={padding.left + ((vals1[vals1.length-1] - min1) / range1) * chartWidth + 12}
                                y={padding.top + chartHeight - ((vals2[vals2.length-1] - min2) / range2) * chartHeight + 4}
                                fontSize="10"
                                fill="#ef4444"
                            >
                                Fin
                            </text>
                            
                            {/* Labels */}
                            <text
                                x={padding.left + chartWidth / 2}
                                y={height - 8}
                                textAnchor="middle"
                                fontSize="12"
                                fill="#9ca3af"
                            >
                                {var1}
                            </text>
                            <text
                                x={15}
                                y={padding.top + chartHeight / 2}
                                textAnchor="middle"
                                fontSize="12"
                                fill="#9ca3af"
                                transform={`rotate(-90, 15, ${padding.top + chartHeight / 2})`}
                            >
                                {var2}
                            </text>
                        </svg>
                    </div>
                );
            }

            case 'distribution': {
                const chartStats = stats;
                if (!chartStats) return null;
                
                const maxVal = Math.max(...chartVars.map(v => chartStats[v]?.max ?? 0), 1);
                const barWidth = Math.min(60, (chartWidth - 20) / chartVars.length - 10);
                
                return (
                    <div className="w-full overflow-x-auto">
                        <svg width={width} height={height} style={{ minWidth: width }}>
                            {/* Y-axis */}
                            <line
                                x1={padding.left}
                                y1={padding.top}
                                x2={padding.left}
                                y2={padding.top + chartHeight}
                                stroke="#6b7280"
                                strokeWidth="1"
                            />
                            
                            {/* Y-axis labels */}
                            {[0, 0.5, 1].map(t => (
                                <text
                                    key={t}
                                    x={padding.left - 8}
                                    y={padding.top + chartHeight * (1 - t) + 4}
                                    textAnchor="end"
                                    fontSize="10"
                                    fill="#9ca3af"
                                >
                                    {(maxVal * t).toFixed(1)}
                                </text>
                            ))}
                            
                            {chartVars.map((varName, idx) => {
                                const stat = chartStats[varName];
                                if (!stat) return null;
                                
                                const x = padding.left + 20 + idx * (barWidth + 10);
                                const barHeight = (stat.max / maxVal) * chartHeight;
                                const minHeight = (stat.min / maxVal) * chartHeight;
                                const meanY = padding.top + chartHeight - (stat.mean / maxVal) * chartHeight;
                                
                                return (
                                    <g key={varName}>
                                        {/* Min-Max range bar */}
                                        <rect 
                                            x={x} 
                                            y={padding.top + chartHeight - barHeight}
                                            width={barWidth}
                                            height={barHeight - minHeight}
                                            fill={COLORS[idx % COLORS.length]}
                                            fillOpacity="0.4"
                                            rx="4"
                                        />
                                        {/* Mean line */}
                                        <line 
                                            x1={x} 
                                            x2={x + barWidth}
                                            y1={meanY}
                                            y2={meanY}
                                            stroke={COLORS[idx % COLORS.length]}
                                            strokeWidth="3"
                                        />
                                        {/* Label */}
                                        <text 
                                            x={x + barWidth / 2} 
                                            y={height - 8}
                                            textAnchor="middle" 
                                            fontSize="9" 
                                            fill="#9ca3af"
                                        >
                                            {varName.split('.')[1] || varName}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                );
            }

            case 'comparison': {
                const chartStats = stats;
                if (!chartStats) return null;
                
                const maxVal = Math.max(
                    ...chartVars.flatMap(v => [chartStats[v]?.initial ?? 0, chartStats[v]?.final ?? 0]),
                    1
                );
                const groupWidth = Math.min(100, (chartWidth - 40) / chartVars.length);
                const barWidth = groupWidth / 3;
                
                return (
                    <div className="w-full overflow-x-auto">
                        <svg width={width} height={height} style={{ minWidth: width }}>
                            {/* Y-axis */}
                            <line
                                x1={padding.left}
                                y1={padding.top}
                                x2={padding.left}
                                y2={padding.top + chartHeight}
                                stroke="#6b7280"
                                strokeWidth="1"
                            />
                            
                            {chartVars.map((varName, idx) => {
                                const stat = chartStats[varName];
                                if (!stat) return null;
                                
                                const x = padding.left + 20 + idx * groupWidth;
                                const initialHeight = (stat.initial / maxVal) * chartHeight;
                                const finalHeight = (stat.final / maxVal) * chartHeight;
                                
                                return (
                                    <g key={varName}>
                                        {/* Initial bar */}
                                        <rect 
                                            x={x} 
                                            y={padding.top + chartHeight - initialHeight}
                                            width={barWidth - 2}
                                            height={initialHeight}
                                            fill="#3b82f6"
                                            rx="3"
                                        />
                                        {/* Final bar */}
                                        <rect 
                                            x={x + barWidth} 
                                            y={padding.top + chartHeight - finalHeight}
                                            width={barWidth - 2}
                                            height={finalHeight}
                                            fill="#22c55e"
                                            rx="3"
                                        />
                                        {/* Label */}
                                        <text 
                                            x={x + barWidth} 
                                            y={height - 8}
                                            textAnchor="middle" 
                                            fontSize="9" 
                                            fill="#9ca3af"
                                        >
                                            {varName.split('.')[1] || varName}
                                        </text>
                                    </g>
                                );
                            })}
                            
                            {/* Legend */}
                            <g transform={`translate(${width - 100}, ${padding.top})`}>
                                <rect width="12" height="12" fill="#3b82f6" rx="2"/>
                                <text x="16" y="10" fontSize="10" fill="#d1d5db">Initial</text>
                                <rect y="18" width="12" height="12" fill="#22c55e" rx="2"/>
                                <text x="16" y="28" fontSize="10" fill="#d1d5db">Final</text>
                            </g>
                        </svg>
                    </div>
                );
            }

            case 'rates': {
                const chartRates = rates;
                if (!chartRates) return <div className="h-64 flex items-center justify-center text-muted-foreground">Données insuffisantes</div>;
                
                let maxRate = 0;
                chartVars.forEach(varName => {
                    const rateValues = chartRates[varName] || [];
                    maxRate = Math.max(maxRate, ...rateValues.map(Math.abs));
                });
                maxRate = maxRate || 1;
                
                return (
                    <div className="w-full overflow-x-auto">
                        <svg width={width} height={height} style={{ minWidth: width }}>
                            {/* Zero line */}
                            <line
                                x1={padding.left}
                                y1={padding.top + chartHeight / 2}
                                x2={padding.left + chartWidth}
                                y2={padding.top + chartHeight / 2}
                                stroke="#6b7280"
                                strokeWidth="1"
                                strokeDasharray="4"
                            />
                            
                            {/* Y-axis */}
                            <line
                                x1={padding.left}
                                y1={padding.top}
                                x2={padding.left}
                                y2={padding.top + chartHeight}
                                stroke="#6b7280"
                                strokeWidth="1"
                            />
                            
                            {chartVars.map((varName, idx) => {
                                const rateValues = chartRates[varName] || [];
                                const n = rateValues.length;
                                
                                if (n < 2) return null;
                                
                                const points = rateValues.map((v, i) => {
                                    const x = padding.left + (i / (n - 1)) * chartWidth;
                                    const y = padding.top + chartHeight / 2 - (v / maxRate) * (chartHeight / 2);
                                    return `${x},${y}`;
                                }).join(' ');
                                
                                return (
                                    <polyline
                                        key={varName}
                                        points={points}
                                        fill="none"
                                        stroke={COLORS[idx % COLORS.length]}
                                        strokeWidth="2"
                                        strokeLinejoin="round"
                                    />
                                );
                            })}
                            
                            {/* Legend */}
                            <g transform={`translate(${padding.left + 10}, ${padding.top + 5})`}>
                                {chartVars.map((varName, idx) => (
                                    <g key={varName} transform={`translate(${(idx % 3) * 150}, ${Math.floor(idx / 3) * 18})`}>
                                        <rect width="12" height="12" fill={COLORS[idx % COLORS.length]} rx="2"/>
                                        <text x="16" y="10" fontSize="11" fill="#d1d5db">d({varName})/dt</text>
                                    </g>
                                ))}
                            </g>
                        </svg>
                    </div>
                );
            }

            case 'correlation': {
                const cellSize = Math.min(50, (Math.min(chartWidth, chartHeight) - 60) / chartVars.length);
                const matrixSize = cellSize * chartVars.length;
                
                return (
                    <div className="w-full overflow-x-auto flex justify-center">
                        <svg width={matrixSize + 100} height={matrixSize + 80}>
                            {chartVars.map((var1, i) => 
                                chartVars.map((var2, j) => {
                                    const vals1 = simulationResult.history.map(h => h[var1] ?? 0);
                                    const vals2 = simulationResult.history.map(h => h[var2] ?? 0);
                                    const mean1 = vals1.reduce((a, b) => a + b, 0) / vals1.length;
                                    const mean2 = vals2.reduce((a, b) => a + b, 0) / vals2.length;
                                    
                                    let num = 0, den1 = 0, den2 = 0;
                                    for (let k = 0; k < vals1.length; k++) {
                                        const d1 = vals1[k] - mean1;
                                        const d2 = vals2[k] - mean2;
                                        num += d1 * d2;
                                        den1 += d1 * d1;
                                        den2 += d2 * d2;
                                    }
                                    const corr = den1 && den2 ? num / Math.sqrt(den1 * den2) : 0;
                                    
                                    const x = 80 + j * cellSize;
                                    const y = 40 + i * cellSize;
                                    
                                    const color = corr > 0 
                                        ? `rgba(34, 197, 94, ${Math.abs(corr)})` 
                                        : `rgba(239, 68, 68, ${Math.abs(corr)})`;
                                    
                                    return (
                                        <g key={`${var1}-${var2}`}>
                                            <rect 
                                                x={x} 
                                                y={y} 
                                                width={cellSize - 2} 
                                                height={cellSize - 2}
                                                fill={color}
                                                stroke="#374151"
                                                strokeOpacity="0.3"
                                                rx="2"
                                            />
                                            <text 
                                                x={x + cellSize / 2 - 1} 
                                                y={y + cellSize / 2 + 4}
                                                textAnchor="middle"
                                                fontSize="10"
                                                fill="#d1d5db"
                                            >
                                                {corr.toFixed(2)}
                                            </text>
                                        </g>
                                    );
                                })
                            )}
                            
                            {/* Row labels */}
                            {chartVars.map((varName, i) => (
                                <text 
                                    key={`row-${varName}`}
                                    x="75" 
                                    y={40 + i * cellSize + cellSize / 2 + 4}
                                    textAnchor="end"
                                    fontSize="9"
                                    fill="#9ca3af"
                                >
                                    {varName.split('.')[1] || varName}
                                </text>
                            ))}
                            
                            {/* Column labels */}
                            {chartVars.map((varName, j) => (
                                <text 
                                    key={`col-${varName}`}
                                    x={80 + j * cellSize + cellSize / 2}
                                    y="32"
                                    textAnchor="middle"
                                    fontSize="9"
                                    fill="#9ca3af"
                                >
                                    {varName.split('.')[1] || varName}
                                </text>
                            ))}
                        </svg>
                    </div>
                );
            }

            case 'multiSimComparison': {
                if (storedSimulations.length === 0) {
                    return (
                        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-3">
                            <p>Aucune simulation disponible</p>
                            <p className="text-xs">Lancez une simulation depuis le canvas</p>
                        </div>
                    );
                }
                
                const selectedSims = storedSimulations.filter(s => selectedSimulations.includes(s.id));
                if (selectedSims.length === 0) {
                    return (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                            Sélectionnez des simulations à comparer dans le panneau latéral
                        </div>
                    );
                }
                
                // Compare first variable across simulations
                const compareVar = chartVars[0];
                if (!compareVar) return null;
                
                let globalMin = Infinity;
                let globalMax = -Infinity;
                selectedSims.forEach(sim => {
                    const values = sim.result.history.map(h => h[compareVar] ?? 0);
                    globalMin = Math.min(globalMin, ...values);
                    globalMax = Math.max(globalMax, ...values);
                });
                
                if (globalMin === globalMax) globalMax = globalMin + 1;
                const range = globalMax - globalMin;
                globalMin -= range * 0.05;
                globalMax += range * 0.05;
                
                return (
                    <div className="w-full overflow-x-auto">
                        <svg width={width} height={height} style={{ minWidth: width }}>
                            {/* Grid */}
                            {[0, 0.25, 0.5, 0.75, 1].map(t => (
                                <line
                                    key={t}
                                    x1={padding.left}
                                    y1={padding.top + chartHeight * t}
                                    x2={padding.left + chartWidth}
                                    y2={padding.top + chartHeight * t}
                                    stroke="#374151"
                                    strokeOpacity="0.3"
                                    strokeDasharray="4"
                                />
                            ))}
                            
                            {/* Axes */}
                            <line
                                x1={padding.left}
                                y1={padding.top + chartHeight}
                                x2={padding.left + chartWidth}
                                y2={padding.top + chartHeight}
                                stroke="#6b7280"
                                strokeWidth="1"
                            />
                            
                            {/* Lines for each simulation */}
                            {selectedSims.map((sim, idx) => {
                                const values = sim.result.history.map(h => h[compareVar] ?? 0);
                                const n = values.length;
                                
                                if (n < 2) return null;
                                
                                const points = values.map((v, i) => {
                                    const x = padding.left + (i / (n - 1)) * chartWidth;
                                    const y = padding.top + chartHeight - ((v - globalMin) / (globalMax - globalMin)) * chartHeight;
                                    return `${x},${y}`;
                                }).join(' ');
                                
                                return (
                                    <polyline
                                        key={sim.id}
                                        points={points}
                                        fill="none"
                                        stroke={COLORS[idx % COLORS.length]}
                                        strokeWidth="2"
                                        strokeLinejoin="round"
                                    />
                                );
                            })}
                            
                            {/* Legend */}
                            <g transform={`translate(${padding.left + 10}, ${padding.top + 5})`}>
                                {selectedSims.map((sim, idx) => (
                                    <g key={sim.id} transform={`translate(${(idx % 3) * 120}, ${Math.floor(idx / 3) * 18})`}>
                                        <rect width="12" height="12" fill={COLORS[idx % COLORS.length]} rx="2"/>
                                        <text x="16" y="10" fontSize="11" fill="#d1d5db">{sim.name}</text>
                                    </g>
                                ))}
                            </g>
                            
                            {/* Title */}
                            <text
                                x={padding.left + chartWidth / 2}
                                y={height - 8}
                                textAnchor="middle"
                                fontSize="12"
                                fill="#9ca3af"
                            >
                                {compareVar}
                            </text>
                        </svg>
                    </div>
                );
            }

            default:
                return null;
        }
    };

    const toggleChart = (chartType: ChartType) => {
        setSelectedCharts(prev => {
            const newCharts = prev.includes(chartType) 
                ? prev.filter(c => c !== chartType)
                : [...prev, chartType];
            
            // Set active config to the newly added chart
            if (!prev.includes(chartType)) {
                setActiveChartForConfig(chartType);
            } else if (activeChartForConfig === chartType) {
                setActiveChartForConfig(newCharts[0] || null);
            }
            
            return newCharts;
        });
    };

    return (
        <div className="h-full flex bg-background overflow-hidden">
            {/* Left Sidebar - Variable Selection */}
            <div className="w-64 border-r bg-card flex flex-col overflow-hidden">
                <div className="p-3 border-b">
                    <h2 className="font-semibold text-sm">Configuration</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Sélectionnez les variables par graphique
                    </p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2">
                    {/* Chart selector */}
                    <div className="mb-4">
                        <div className="text-xs font-medium text-muted-foreground mb-2">Graphiques actifs</div>
                        {CHART_TYPES.map(chart => (
                            <div key={chart.id} className="mb-1">
                                <button
                                    onClick={() => {
                                        if (selectedCharts.includes(chart.id)) {
                                            setActiveChartForConfig(activeChartForConfig === chart.id ? null : chart.id);
                                        } else {
                                            toggleChart(chart.id);
                                        }
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors text-sm",
                                        selectedCharts.includes(chart.id)
                                            ? activeChartForConfig === chart.id
                                                ? "bg-primary/20 text-primary"
                                                : "bg-accent/50"
                                            : "hover:bg-accent text-muted-foreground"
                                    )}
                                >
                                    <div 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleChart(chart.id);
                                        }}
                                        className={cn(
                                            "w-5 h-5 rounded border flex items-center justify-center cursor-pointer",
                                            selectedCharts.includes(chart.id) 
                                                ? "bg-primary border-primary" 
                                                : "border-muted-foreground"
                                        )}
                                    >
                                        {selectedCharts.includes(chart.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                                    </div>
                                    {chart.icon}
                                    <span className="flex-1 truncate">{chart.name}</span>
                                    {selectedCharts.includes(chart.id) && (
                                        activeChartForConfig === chart.id 
                                            ? <ChevronDown className="w-4 h-4" />
                                            : <ChevronRight className="w-4 h-4" />
                                    )}
                                </button>
                                
                                {/* Variable selection for this chart */}
                                {activeChartForConfig === chart.id && selectedCharts.includes(chart.id) && (
                                    <div className="ml-4 mt-1 p-2 bg-background rounded-md border">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs text-muted-foreground">Variables</span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => selectAllVariables(chart.id, true)}
                                                    className="text-xs px-2 py-0.5 hover:bg-accent rounded"
                                                >
                                                    Tous
                                                </button>
                                                <button
                                                    onClick={() => selectAllVariables(chart.id, false)}
                                                    className="text-xs px-2 py-0.5 hover:bg-accent rounded"
                                                >
                                                    Aucun
                                                </button>
                                            </div>
                                        </div>
                                        {variables.map((varName, idx) => {
                                            const isSelected = chartVariables[chart.id].size === 0 
                                                || chartVariables[chart.id].has(varName);
                                            return (
                                                <button
                                                    key={varName}
                                                    onClick={() => toggleVariable(chart.id, varName)}
                                                    className={cn(
                                                        "w-full flex items-center gap-2 p-1.5 rounded text-xs transition-colors",
                                                        isSelected ? "text-foreground" : "text-muted-foreground"
                                                    )}
                                                >
                                                    <div 
                                                        className="w-3 h-3 rounded-sm"
                                                        style={{ backgroundColor: isSelected ? COLORS[idx % COLORS.length] : '#374151' }}
                                                    />
                                                    <span className="truncate">{varName}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    {/* Stored simulations section */}
                    <div className="border-t pt-3 mt-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">Simulations disponibles</span>
                        </div>
                        
                        {storedSimulations.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                                Lancez une simulation depuis le canvas
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {storedSimulations.map((sim, idx) => (
                                    <button
                                        key={sim.id}
                                        onClick={() => toggleSimulationSelection(sim.id)}
                                        className={cn(
                                            "w-full flex items-center gap-2 p-2 rounded text-xs transition-colors",
                                            selectedSimulations.includes(sim.id)
                                                ? "bg-primary/10 text-primary"
                                                : "hover:bg-accent text-muted-foreground"
                                        )}
                                    >
                                        <div 
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                        />
                                        <span className="flex-1 truncate text-left">{sim.name}</span>
                                        {selectedSimulations.includes(sim.id) && (
                                            <Check className="w-3 h-3" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b bg-card flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">Analyse & Visualisation</h1>
                        <p className="text-sm text-muted-foreground">
                            {simulationResult.time_points.length} points de données • {variables.length} variables
                        </p>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="flex-1 overflow-auto p-4">
                    <div className={cn(
                        "grid gap-4",
                        selectedCharts.length === 1 ? "grid-cols-1" :
                        selectedCharts.length === 2 ? "grid-cols-1 lg:grid-cols-2" :
                        "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                    )}>
                        {selectedCharts.map(chartType => {
                            const chartConfig = CHART_TYPES.find(c => c.id === chartType);
                            return (
                                <div key={chartType} className="bg-card rounded-lg border p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {chartConfig?.icon}
                                            <h3 className="font-medium">{chartConfig?.name}</h3>
                                        </div>
                                        <div className="flex gap-1">
                                            <button 
                                                className="p-1 hover:bg-accent rounded transition-colors"
                                                title="Plein écran"
                                                onClick={() => setFullscreenChart(chartType)}
                                            >
                                                <Maximize2 className="w-4 h-4 text-muted-foreground" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="h-64 overflow-hidden">
                                        {renderChart(chartType)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {selectedCharts.length === 0 && (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <PieChart className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                                <p className="text-muted-foreground">
                                    Sélectionnez des graphiques à afficher dans le panneau de gauche
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Fullscreen Modal */}
            {fullscreenChart && (
                <div 
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
                    onClick={() => setFullscreenChart(null)}
                >
                    <div 
                        className="bg-card rounded-xl w-full max-w-6xl max-h-[90vh] overflow-auto p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">
                                {CHART_TYPES.find(c => c.id === fullscreenChart)?.name}
                            </h2>
                            <button 
                                onClick={() => setFullscreenChart(null)}
                                className="p-2 hover:bg-accent rounded-md transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        {renderChart(fullscreenChart, true)}
                    </div>
                </div>
            )}
        </div>
    );
};
