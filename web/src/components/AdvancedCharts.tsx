import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    BarChart, Bar, Cell, Legend, ComposedChart
} from 'recharts';
import { 
    GitBranch, Grid3X3, BarChart2, Target, Activity, Thermometer,
    Info
} from 'lucide-react';
import { getDisplayLabel, VIEW_MODE_CONFIGS, getChartColors } from '../lib/viewModes';
import type { ViewMode } from '../lib/viewModes';
import { cn } from '../lib/utils';

type ChartType = 'phase' | 'correlation' | 'waterfall' | 'radar' | 'sensitivity' | 'heatmap';

interface ChartOption {
    id: ChartType;
    label: string;
    icon: React.ReactNode;
    description: string;
    audiences: ViewMode[];
}

const CHART_OPTIONS: ChartOption[] = [
    {
        id: 'phase',
        label: 'Phase Plot',
        icon: <GitBranch className="w-4 h-4" />,
        description: 'Trajectories in state space - see how variables evolve together',
        audiences: ['technical', 'executive']
    },
    {
        id: 'correlation',
        label: 'Correlation Matrix',
        icon: <Grid3X3 className="w-4 h-4" />,
        description: 'Relationships between all variables',
        audiences: ['technical', 'investor']
    },
    {
        id: 'waterfall',
        label: 'Waterfall',
        icon: <BarChart2 className="w-4 h-4" />,
        description: 'Breakdown of changes from initial to final state',
        audiences: ['executive', 'investor', 'sales']
    },
    {
        id: 'radar',
        label: 'Radar View',
        icon: <Target className="w-4 h-4" />,
        description: 'Multi-dimensional comparison at a glance',
        audiences: ['executive', 'sales', 'investor']
    },
    {
        id: 'sensitivity',
        label: 'Sensitivity',
        icon: <Activity className="w-4 h-4" />,
        description: 'Which variables have the most impact',
        audiences: ['technical', 'investor']
    },
    {
        id: 'heatmap',
        label: 'Temporal Heatmap',
        icon: <Thermometer className="w-4 h-4" />,
        description: 'All variables over time in one view',
        audiences: ['technical', 'executive']
    }
];

export const AdvancedCharts: React.FC = () => {
    const { simulationResult, model, viewMode } = useStore();
    const [selectedChart, setSelectedChart] = useState<ChartType>('radar');
    const [phaseVarX, setPhaseVarX] = useState<string>('');
    const [phaseVarY, setPhaseVarY] = useState<string>('');

    const config = VIEW_MODE_CONFIGS[viewMode as ViewMode];
    const chartColors = getChartColors(viewMode as ViewMode);

    // Get all variables
    const allVariables = useMemo(() => {
        if (!simulationResult) return [];
        return Object.keys(simulationResult.history[0] || {}).filter(key => key !== 'time');
    }, [simulationResult]);

    // Initialize phase variables
    React.useEffect(() => {
        if (allVariables.length >= 2 && !phaseVarX) {
            setPhaseVarX(allVariables[0]);
            setPhaseVarY(allVariables[1]);
        }
    }, [allVariables]);

    // Get component bounds from model
    const getBounds = (varName: string) => {
        if (!model) return { min: 0, max: 1 };
        const [entityName, compName] = varName.split('.');
        const comp = model.entities[entityName]?.components[compName];
        return { min: comp?.min ?? 0, max: comp?.max ?? 1 };
    };

    // Filter charts by audience
    const availableCharts = CHART_OPTIONS.filter(c => c.audiences.includes(viewMode as ViewMode));

    if (!simulationResult) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Run a simulation to see advanced charts</p>
                </div>
            </div>
        );
    }

    // Calculate correlation matrix
    const correlationData = useMemo(() => {
        if (!simulationResult || allVariables.length === 0) return [];

        const correlations: { x: string; y: string; value: number }[] = [];
        
        for (const varX of allVariables) {
            for (const varY of allVariables) {
                const xValues = simulationResult.history.map(h => h[varX] || 0);
                const yValues = simulationResult.history.map(h => h[varY] || 0);
                
                // Calculate Pearson correlation
                const n = xValues.length;
                const sumX = xValues.reduce((a, b) => a + b, 0);
                const sumY = yValues.reduce((a, b) => a + b, 0);
                const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
                const sumX2 = xValues.reduce((acc, x) => acc + x * x, 0);
                const sumY2 = yValues.reduce((acc, y) => acc + y * y, 0);
                
                const num = n * sumXY - sumX * sumY;
                const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
                const correlation = den === 0 ? 0 : num / den;
                
                correlations.push({
                    x: getDisplayLabel(varX, viewMode as ViewMode),
                    y: getDisplayLabel(varY, viewMode as ViewMode),
                    value: correlation
                });
            }
        }
        
        return correlations;
    }, [simulationResult, allVariables, viewMode]);

    // Calculate waterfall data
    const waterfallData = useMemo(() => {
        if (!simulationResult) return [];
        
        return allVariables.map(varName => {
            const initial = simulationResult.history[0][varName] || 0;
            const final = simulationResult.history[simulationResult.history.length - 1][varName] || 0;
            const change = final - initial;
            const changePercent = initial !== 0 ? (change / initial) * 100 : 0;
            
            return {
                name: getDisplayLabel(varName, viewMode as ViewMode),
                fullName: varName,
                initial,
                final,
                change,
                changePercent,
                positive: change >= 0
            };
        }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    }, [simulationResult, allVariables, viewMode]);

    // Calculate radar data
    const radarData = useMemo(() => {
        if (!simulationResult) return [];
        
        return allVariables.map(varName => {
            const bounds = getBounds(varName);
            const initial = simulationResult.history[0][varName] || 0;
            const final = simulationResult.history[simulationResult.history.length - 1][varName] || 0;
            
            // Normalize to 0-100 for radar
            const normalizedInitial = ((initial - bounds.min) / (bounds.max - bounds.min)) * 100;
            const normalizedFinal = ((final - bounds.min) / (bounds.max - bounds.min)) * 100;
            
            return {
                subject: getDisplayLabel(varName, viewMode as ViewMode),
                initial: normalizedInitial,
                final: normalizedFinal,
                fullMark: 100
            };
        });
    }, [simulationResult, allVariables, viewMode]);

    // Calculate sensitivity (variance over time)
    const sensitivityData = useMemo(() => {
        if (!simulationResult) return [];
        
        return allVariables.map(varName => {
            const values = simulationResult.history.map(h => h[varName] || 0);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
            const stdDev = Math.sqrt(variance);
            
            // Calculate rate of change
            const changes = values.slice(1).map((v, i) => Math.abs(v - values[i]));
            const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
            
            return {
                name: getDisplayLabel(varName, viewMode as ViewMode),
                fullName: varName,
                volatility: stdDev,
                avgChange,
                sensitivity: stdDev * avgChange * 100 // Combined metric
            };
        }).sort((a, b) => b.sensitivity - a.sensitivity);
    }, [simulationResult, allVariables, viewMode]);

    // Phase plot data
    const phaseData = useMemo(() => {
        if (!simulationResult || !phaseVarX || !phaseVarY) return [];
        
        return simulationResult.history.map((point, index) => ({
            x: point[phaseVarX] || 0,
            y: point[phaseVarY] || 0,
            time: simulationResult.time_points[index] || index
        }));
    }, [simulationResult, phaseVarX, phaseVarY]);

    // Heatmap data
    const heatmapData = useMemo(() => {
        if (!simulationResult) return [];
        
        // Sample data points to avoid too many
        const sampleRate = Math.max(1, Math.floor(simulationResult.history.length / 20));
        const sampledHistory = simulationResult.history.filter((_, i) => i % sampleRate === 0);
        
        return sampledHistory.map((point, timeIndex) => {
            const row: Record<string, number | string> = {
                time: simulationResult.time_points[timeIndex * sampleRate]?.toFixed(1) || String(timeIndex)
            };
            
            allVariables.forEach(varName => {
                const bounds = getBounds(varName);
                const value = point[varName] || 0;
                // Normalize to 0-1
                row[varName] = (value - bounds.min) / (bounds.max - bounds.min);
            });
            
            return row;
        });
    }, [simulationResult, allVariables]);

    const renderChart = () => {
        switch (selectedChart) {
            case 'phase':
                return (
                    <div className="h-full flex flex-col">
                        <div className="flex gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
                            <div className="flex-1">
                                <label className="text-xs font-medium text-muted-foreground">X Axis</label>
                                <select 
                                    value={phaseVarX}
                                    onChange={(e) => setPhaseVarX(e.target.value)}
                                    className="w-full mt-1 px-2 py-1.5 text-sm border rounded-md bg-background"
                                >
                                    {allVariables.map(v => (
                                        <option key={v} value={v}>{getDisplayLabel(v, viewMode as ViewMode)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-medium text-muted-foreground">Y Axis</label>
                                <select 
                                    value={phaseVarY}
                                    onChange={(e) => setPhaseVarY(e.target.value)}
                                    className="w-full mt-1 px-2 py-1.5 text-sm border rounded-md bg-background"
                                >
                                    {allVariables.map(v => (
                                        <option key={v} value={v}>{getDisplayLabel(v, viewMode as ViewMode)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis 
                                        type="number" 
                                        dataKey="x" 
                                        name={getDisplayLabel(phaseVarX, viewMode as ViewMode)}
                                        label={{ value: getDisplayLabel(phaseVarX, viewMode as ViewMode), position: 'bottom' }}
                                    />
                                    <YAxis 
                                        type="number" 
                                        dataKey="y" 
                                        name={getDisplayLabel(phaseVarY, viewMode as ViewMode)}
                                        label={{ value: getDisplayLabel(phaseVarY, viewMode as ViewMode), angle: -90, position: 'left' }}
                                    />
                                    <Tooltip 
                                        content={({ payload }) => {
                                            if (!payload?.length) return null;
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-popover border rounded-lg p-2 shadow-lg">
                                                    <p className="text-xs text-muted-foreground">Time: {data.time.toFixed(2)}</p>
                                                    <p className="text-sm font-medium">{getDisplayLabel(phaseVarX, viewMode as ViewMode)}: {data.x.toFixed(3)}</p>
                                                    <p className="text-sm font-medium">{getDisplayLabel(phaseVarY, viewMode as ViewMode)}: {data.y.toFixed(3)}</p>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Scatter 
                                        data={phaseData} 
                                        line={{ stroke: chartColors.primary[0], strokeWidth: 2 }}
                                        shape={(props: any) => {
                                            const { cx, cy, payload } = props;
                                            const isStart = payload.time === phaseData[0]?.time;
                                            const isEnd = payload.time === phaseData[phaseData.length - 1]?.time;
                                            if (isStart) {
                                                return <circle cx={cx} cy={cy} r={6} fill="#22c55e" stroke="#fff" strokeWidth={2} />;
                                            }
                                            if (isEnd) {
                                                return <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
                                            }
                                            return <circle cx={cx} cy={cy} r={2} fill={chartColors.primary[0]} opacity={0.5} />;
                                        }}
                                    />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-6 mt-2 text-xs">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <span>Start</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <span>End</span>
                            </div>
                        </div>
                    </div>
                );

            case 'correlation':
                const uniqueVars = [...new Set(correlationData.map(d => d.x))];
                return (
                    <div className="h-full overflow-auto p-4">
                        <div className="inline-block min-w-full">
                            <table className="border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-2 text-xs font-medium text-muted-foreground"></th>
                                        {uniqueVars.map(v => (
                                            <th key={v} className="p-2 text-xs font-medium text-muted-foreground" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                                {v}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {uniqueVars.map(varY => (
                                        <tr key={varY}>
                                            <td className="p-2 text-xs font-medium text-muted-foreground whitespace-nowrap">{varY}</td>
                                            {uniqueVars.map(varX => {
                                                const correlation = correlationData.find(d => d.x === varX && d.y === varY)?.value || 0;
                                                const intensity = Math.abs(correlation);
                                                const color = correlation > 0 
                                                    ? `rgba(34, 197, 94, ${intensity})` 
                                                    : `rgba(239, 68, 68, ${intensity})`;
                                                return (
                                                    <td 
                                                        key={`${varX}-${varY}`}
                                                        className="p-1"
                                                        title={`${varX} vs ${varY}: ${correlation.toFixed(2)}`}
                                                    >
                                                        <div 
                                                            className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-mono"
                                                            style={{ 
                                                                backgroundColor: color,
                                                                color: intensity > 0.5 ? 'white' : 'inherit'
                                                            }}
                                                        >
                                                            {correlation.toFixed(1)}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-center gap-4 mt-4 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-16 h-3 rounded" style={{ background: 'linear-gradient(to right, rgba(239, 68, 68, 1), rgba(239, 68, 68, 0))' }} />
                                <span>Negative</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-16 h-3 rounded" style={{ background: 'linear-gradient(to right, rgba(34, 197, 94, 0), rgba(34, 197, 94, 1))' }} />
                                <span>Positive</span>
                            </div>
                        </div>
                    </div>
                );

            case 'waterfall':
                return (
                    <div className="h-full p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={waterfallData} layout="vertical" margin={{ left: 100, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={true} vertical={false} />
                                <XAxis type="number" tickFormatter={(v) => config.valueFormat === 'percentage' ? `${(v * 100).toFixed(0)}%` : v.toFixed(2)} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                                <Tooltip 
                                    content={({ payload }) => {
                                        if (!payload?.length) return null;
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-popover border rounded-lg p-3 shadow-lg">
                                                <p className="font-medium">{data.name}</p>
                                                <p className="text-sm">Initial: {data.initial.toFixed(3)}</p>
                                                <p className="text-sm">Final: {data.final.toFixed(3)}</p>
                                                <p className={cn("text-sm font-bold", data.positive ? "text-green-500" : "text-red-500")}>
                                                    Change: {data.positive ? '+' : ''}{data.change.toFixed(3)} ({data.changePercent.toFixed(1)}%)
                                                </p>
                                            </div>
                                        );
                                    }}
                                />
                                <Bar dataKey="change" radius={[0, 4, 4, 0]}>
                                    {waterfallData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.positive ? '#22c55e' : '#ef4444'} 
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                );

            case 'radar':
                return (
                    <div className="h-full p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                                <PolarGrid gridType="polygon" />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                                <Radar 
                                    name="Initial" 
                                    dataKey="initial" 
                                    stroke={chartColors.secondary[0]} 
                                    fill={chartColors.secondary[0]} 
                                    fillOpacity={0.3}
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                />
                                <Radar 
                                    name="Final" 
                                    dataKey="final" 
                                    stroke={chartColors.primary[0]} 
                                    fill={chartColors.primary[0]} 
                                    fillOpacity={0.5}
                                    strokeWidth={2}
                                />
                                <Legend />
                                <Tooltip 
                                    content={({ payload, label }) => {
                                        if (!payload?.length) return null;
                                        return (
                                            <div className="bg-popover border rounded-lg p-2 shadow-lg">
                                                <p className="font-medium text-sm">{label}</p>
                                                {payload.map((p: any, i: number) => (
                                                    <p key={i} className="text-xs" style={{ color: p.color }}>
                                                        {p.name}: {p.value.toFixed(1)}%
                                                    </p>
                                                ))}
                                            </div>
                                        );
                                    }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                );

            case 'sensitivity':
                return (
                    <div className="h-full p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={sensitivityData} layout="vertical" margin={{ left: 100, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                                <Tooltip 
                                    content={({ payload }) => {
                                        if (!payload?.length) return null;
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-popover border rounded-lg p-3 shadow-lg">
                                                <p className="font-medium">{data.name}</p>
                                                <p className="text-xs text-muted-foreground">Volatility: {data.volatility.toFixed(4)}</p>
                                                <p className="text-xs text-muted-foreground">Avg Change: {data.avgChange.toFixed(4)}</p>
                                                <p className="text-sm font-bold text-primary">Sensitivity: {data.sensitivity.toFixed(2)}</p>
                                            </div>
                                        );
                                    }}
                                />
                                <Bar dataKey="sensitivity" fill={chartColors.primary[0]} radius={[0, 4, 4, 0]} opacity={0.8} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                );

            case 'heatmap':
                return (
                    <div className="h-full overflow-auto p-4">
                        <div className="min-w-full">
                            <table className="border-collapse w-full">
                                <thead>
                                    <tr>
                                        <th className="p-2 text-xs font-medium text-muted-foreground sticky left-0 bg-card z-10">Time</th>
                                        {allVariables.map(v => (
                                            <th key={v} className="p-2 text-xs font-medium text-muted-foreground whitespace-nowrap">
                                                {getDisplayLabel(v, viewMode as ViewMode)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {heatmapData.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            <td className="p-2 text-xs font-mono text-muted-foreground sticky left-0 bg-card">{row.time}</td>
                                            {allVariables.map(varName => {
                                                const value = row[varName] as number;
                                                // Color based on value (0-1)
                                                const hue = value * 120; // 0 = red, 60 = yellow, 120 = green
                                                return (
                                                    <td 
                                                        key={varName}
                                                        className="p-0"
                                                        title={`${getDisplayLabel(varName, viewMode as ViewMode)}: ${(value * 100).toFixed(0)}%`}
                                                    >
                                                        <div 
                                                            className="w-full h-6"
                                                            style={{ 
                                                                backgroundColor: `hsl(${hue}, 70%, 50%)`,
                                                                opacity: 0.7 + value * 0.3
                                                            }}
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-center gap-4 mt-4 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-3 rounded" style={{ background: 'linear-gradient(to right, hsl(0, 70%, 50%), hsl(60, 70%, 50%), hsl(120, 70%, 50%))' }} />
                                <span>Low → High</span>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-card">
            {/* Chart Type Selector */}
            <div className="flex items-center gap-2 p-3 border-b bg-muted/30 overflow-x-auto">
                {availableCharts.map((chart) => (
                    <button
                        key={chart.id}
                        onClick={() => setSelectedChart(chart.id)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                            selectedChart === chart.id
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "hover:bg-accent text-muted-foreground"
                        )}
                        title={chart.description}
                    >
                        {chart.icon}
                        <span className="hidden sm:inline">{chart.label}</span>
                    </button>
                ))}
            </div>

            {/* Chart Description */}
            <div className="px-4 py-2 border-b bg-muted/20 flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                    {CHART_OPTIONS.find(c => c.id === selectedChart)?.description}
                </p>
            </div>

            {/* Chart Content */}
            <div className="flex-1 overflow-hidden">
                {renderChart()}
            </div>
        </div>
    );
};
