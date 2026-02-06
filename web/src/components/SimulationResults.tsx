import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { BarChart3, Table as TableIcon, TrendingUp, TrendingDown, Minus, Info, Lightbulb, Activity } from 'lucide-react';
import { 
    getDisplayLabel, 
    formatValue, 
    getTrendIndicator, 
    getChartColors, 
    getYAxisLabel,
    getTooltipContent,
    generateSummary,
    VIEW_MODE_CONFIGS
} from '../lib/viewModes';
import type { ViewMode } from '../lib/viewModes';
import { cn } from '../lib/utils';
import { AdvancedCharts } from './AdvancedCharts';

type ResultTab = 'chart' | 'table' | 'summary' | 'advanced';

// Custom tooltip component that adapts to view mode
const CustomTooltip = ({ active, payload, label, viewMode }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const config = VIEW_MODE_CONFIGS[viewMode as ViewMode];
    
    return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 max-w-xs">
            <p className="text-xs text-muted-foreground mb-2">
                {config.valueFormat === 'currency' ? 'Period' : 'Time'}: {typeof label === 'number' ? label.toFixed(1) : label}
            </p>
            {payload.map((entry: any, idx: number) => {
                const tooltipData = getTooltipContent(entry.dataKey, entry.value, viewMode);
                return (
                    <div key={idx} className="mb-2 last:mb-0">
                        <div className="flex items-center gap-2">
                            <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm font-medium">{tooltipData.label}</span>
                        </div>
                        <div className="ml-4">
                            <span className="text-lg font-bold">{tooltipData.value}</span>
                            {tooltipData.insight && (
                                <p className="text-xs text-muted-foreground">{tooltipData.insight}</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const SimulationResults: React.FC = () => {
    const { simulationResult, viewMode, model } = useStore();
    const [activeTab, setActiveTab] = useState<ResultTab>('chart');
    const [selectedVariables, setSelectedVariables] = useState<Set<string>>(new Set());
    const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');

    const config = VIEW_MODE_CONFIGS[viewMode as ViewMode];
    const chartColors = getChartColors(viewMode as ViewMode);

    // Get component min/max values from model
    const getComponentBounds = (varName: string) => {
        if (!model) return { min: 0, max: 1 };
        const [entityName, compName] = varName.split('.');
        const comp = model.entities[entityName]?.components[compName];
        return {
            min: comp?.min ?? 0,
            max: comp?.max ?? 1
        };
    };

    // Get all available variables
    const allVariables = useMemo(() => {
        if (!simulationResult) return [];
        return Object.keys(simulationResult.history[0] || {}).filter(key => key !== 'time');
    }, [simulationResult]);

    // Transform data for charts
    const chartData = useMemo(() => {
        if (!simulationResult) return [];
        return simulationResult.history.map((point, index) => {
            const timeValue = simulationResult.time_points[index] ?? index;
            const dataPoint: Record<string, number> = { time: timeValue };
            
            Array.from(selectedVariables).forEach(varName => {
                const bounds = getComponentBounds(varName);
                let value = point[varName] ?? 0;
                
                // Transform value based on view mode
                if (config.valueFormat === 'percentage') {
                    value = ((value - bounds.min) / (bounds.max - bounds.min)) * 100;
                } else if (config.valueFormat === 'score') {
                    value = ((value - bounds.min) / (bounds.max - bounds.min)) * 10;
                }
                
                dataPoint[varName] = value;
            });
            
            return dataPoint;
        });
    }, [simulationResult, selectedVariables, viewMode, model]);

    // Calculate table data
    const tableData = useMemo(() => {
        if (!simulationResult) return [];
        return allVariables.map(varName => {
            const bounds = getComponentBounds(varName);
            const initial = simulationResult.history[0][varName] || 0;
            const final = simulationResult.history[simulationResult.history.length - 1][varName] || 0;
            const mid = simulationResult.history[Math.floor(simulationResult.history.length / 2)][varName] || 0;
            
            const trend = getTrendIndicator(final, initial, viewMode);
            
            const parts = varName.split('.');
            const entity = parts[0] || '';

            return {
                name: getDisplayLabel(varName, viewMode),
                entity,
                fullName: varName,
                initial: formatValue(initial, viewMode, bounds.min, bounds.max),
                final: formatValue(final, viewMode, bounds.min, bounds.max),
                rawInitial: initial,
                rawFinal: final,
                trend,
                sparkline: [initial, mid, final]
            };
        });
    }, [simulationResult, viewMode, model, allVariables]);

    // Generate summary
    const summary = useMemo(() => {
        if (!simulationResult) return { title: '', points: [] };
        return generateSummary(simulationResult.final_state, viewMode);
    }, [simulationResult, viewMode]);

    const toggleVariable = (varName: string) => {
        const newSelected = new Set(selectedVariables);
        if (newSelected.has(varName)) {
            newSelected.delete(varName);
        } else {
            newSelected.add(varName);
        }
        setSelectedVariables(newSelected);
    };

    if (!simulationResult) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Run a simulation to see results</p>
                </div>
            </div>
        );
    }

    // Render chart based on type
    const renderChart = () => {
        if (selectedVariables.size === 0) {
            return (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                        <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Select variables to display</p>
                    </div>
                </div>
            );
        }

        const yAxisLabel = getYAxisLabel(viewMode);

        return (
            <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                    <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                            dataKey="time" 
                            label={{ 
                                value: config.valueFormat === 'currency' ? 'Period' : 'Time', 
                                position: 'insideBottom', 
                                offset: -10 
                            }}
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
                            tick={{ fontSize: 12 }}
                            domain={config.valueFormat === 'percentage' ? [0, 100] : config.valueFormat === 'score' ? [0, 10] : ['auto', 'auto']}
                        />
                        <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
                        <Legend 
                            formatter={(value) => getDisplayLabel(value, viewMode)}
                            wrapperStyle={{ fontSize: '12px' }}
                        />
                        {Array.from(selectedVariables).map((varName, idx) => {
                            const color = chartColors.primary[idx % chartColors.primary.length];
                            return (
                                <Area
                                    key={varName}
                                    type="monotone"
                                    dataKey={varName}
                                    stroke={color}
                                    fill={color}
                                    fillOpacity={0.3}
                                    strokeWidth={2}
                                />
                            );
                        })}
                    </AreaChart>
                ) : chartType === 'bar' ? (
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                            dataKey="time" 
                            label={{ 
                                value: config.valueFormat === 'currency' ? 'Period' : 'Time', 
                                position: 'insideBottom', 
                                offset: -10 
                            }}
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
                            tick={{ fontSize: 12 }}
                            domain={config.valueFormat === 'percentage' ? [0, 100] : config.valueFormat === 'score' ? [0, 10] : ['auto', 'auto']}
                        />
                        <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
                        <Legend 
                            formatter={(value) => getDisplayLabel(value, viewMode)}
                            wrapperStyle={{ fontSize: '12px' }}
                        />
                        {Array.from(selectedVariables).map((varName, idx) => {
                            const color = chartColors.primary[idx % chartColors.primary.length];
                            return (
                                <Bar
                                    key={varName}
                                    dataKey={varName}
                                    fill={color}
                                    opacity={0.8}
                                />
                            );
                        })}
                    </BarChart>
                ) : (
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                            dataKey="time" 
                            label={{ 
                                value: config.valueFormat === 'currency' ? 'Period' : 'Time', 
                                position: 'insideBottom', 
                                offset: -10 
                            }}
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
                            tick={{ fontSize: 12 }}
                            domain={config.valueFormat === 'percentage' ? [0, 100] : config.valueFormat === 'score' ? [0, 10] : ['auto', 'auto']}
                        />
                        <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
                        <Legend 
                            formatter={(value) => getDisplayLabel(value, viewMode)}
                            wrapperStyle={{ fontSize: '12px' }}
                        />
                        {Array.from(selectedVariables).map((varName, idx) => {
                            const color = chartColors.primary[idx % chartColors.primary.length];
                            return (
                                <Line
                                    key={varName}
                                    type="monotone"
                                    dataKey={varName}
                                    stroke={color}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                />
                            );
                        })}
                    </LineChart>
                )}
            </ResponsiveContainer>
        );
    };

    return (
        <div className="h-full flex flex-col bg-card border-t">
            {/* Tab Headers */}
            <div className="flex items-center justify-between border-b bg-muted/30 px-2">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('chart')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 font-medium transition-colors",
                            activeTab === 'chart'
                                ? 'bg-background border-b-2 border-primary text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <BarChart3 className="w-4 h-4" />
                        {viewMode === 'executive' ? 'Trends' : viewMode === 'investor' ? 'Projections' : 'Charts'}
                    </button>
                    <button
                        onClick={() => setActiveTab('table')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 font-medium transition-colors",
                            activeTab === 'table'
                                ? 'bg-background border-b-2 border-primary text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <TableIcon className="w-4 h-4" />
                        {viewMode === 'executive' ? 'KPIs' : viewMode === 'investor' ? 'Metrics' : 'Data'}
                    </button>
                    <button
                        onClick={() => setActiveTab('summary')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 font-medium transition-colors",
                            activeTab === 'summary'
                                ? 'bg-background border-b-2 border-primary text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Lightbulb className="w-4 h-4" />
                        {viewMode === 'executive' ? 'Insights' : viewMode === 'investor' ? 'Analysis' : 'Summary'}
                    </button>
                    <button
                        onClick={() => setActiveTab('advanced')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 font-medium transition-colors",
                            activeTab === 'advanced'
                                ? 'bg-background border-b-2 border-primary text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Activity className="w-4 h-4" />
                        {viewMode === 'executive' ? 'Deep Analysis' : viewMode === 'investor' ? 'Risk Analysis' : viewMode === 'sales' ? 'Opportunities' : 'Advanced'}
                    </button>
                </div>

                {/* Chart Type Selector (only for chart tab) */}
                {activeTab === 'chart' && (
                    <div className="flex gap-1 p-1 bg-muted rounded-lg">
                        {(['line', 'area', 'bar'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setChartType(type)}
                                className={cn(
                                    "px-2 py-1 text-xs font-medium rounded transition-colors capitalize",
                                    chartType === type 
                                        ? 'bg-background shadow-sm' 
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'chart' && (
                    <div className="h-full flex">
                        {/* Variable Selector */}
                        <div className="w-64 border-r bg-card overflow-y-auto p-3">
                            <h3 className="text-sm font-semibold mb-2">
                                {viewMode === 'executive' ? 'Key Metrics' : 
                                 viewMode === 'investor' ? 'Indicators' : 
                                 viewMode === 'sales' ? 'Opportunities' : 'Variables'}
                            </h3>
                            <div className="space-y-1">
                                {allVariables.map((varName, idx) => {
                                    const displayName = getDisplayLabel(varName, viewMode);
                                    const data = tableData.find(d => d.fullName === varName);
                                    
                                    return (
                                        <label
                                            key={varName}
                                            className={cn(
                                                "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors",
                                                selectedVariables.has(varName) 
                                                    ? "bg-primary/10 border border-primary/30" 
                                                    : "hover:bg-accent border border-transparent"
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedVariables.has(varName)}
                                                onChange={() => toggleVariable(varName)}
                                                className="rounded"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: chartColors.primary[idx % chartColors.primary.length] }}
                                                    />
                                                    <span className="text-sm truncate">{displayName}</span>
                                                </div>
                                                {config.showTrendArrows && data && (
                                                    <div className={cn("text-xs ml-4 flex items-center gap-1", data.trend.color)}>
                                                        {data.trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
                                                        {data.trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
                                                        {data.trend.direction === 'stable' && <Minus className="w-3 h-3" />}
                                                        <span>{data.final}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Chart Display */}
                        <div className="flex-1 p-4">
                            {renderChart()}
                        </div>
                    </div>
                )}

                {activeTab === 'table' && (
                    <div className="h-full overflow-auto p-4">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-card">
                                    <th className="text-left p-3 border-b font-semibold bg-card">
                                        {viewMode === 'executive' ? 'Metric' : 
                                         viewMode === 'investor' ? 'Indicator' : 'Component'}
                                    </th>
                                    <th className="text-left p-3 border-b font-semibold bg-card">
                                        {viewMode === 'investor' ? 'Category' : 'Entity'}
                                    </th>
                                    <th className="text-right p-3 border-b font-semibold bg-card">
                                        {viewMode === 'investor' ? 'Baseline' : 'Initial'}
                                    </th>
                                    <th className="text-right p-3 border-b font-semibold bg-card">
                                        {viewMode === 'investor' ? 'Projected' : 'Final'}
                                    </th>
                                    <th className="text-center p-3 border-b font-semibold bg-card">
                                        {viewMode === 'executive' ? 'Status' : 'Trend'}
                                    </th>
                                    {config.showRawValues && (
                                        <th className="text-right p-3 border-b font-semibold bg-card">Raw Value</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.map((row) => (
                                    <tr key={row.fullName} className="border-b hover:bg-accent/50">
                                        <td className="p-3 font-medium">{row.name}</td>
                                        <td className="p-3 text-muted-foreground">{row.entity}</td>
                                        <td className="p-3 text-right font-mono">{row.initial}</td>
                                        <td className="p-3 text-right font-mono font-semibold">{row.final}</td>
                                        <td className="p-3">
                                            <div className={cn(
                                                "flex items-center justify-center gap-1 text-sm",
                                                row.trend.color
                                            )}>
                                                {row.trend.direction === 'up' && <TrendingUp className="w-4 h-4" />}
                                                {row.trend.direction === 'down' && <TrendingDown className="w-4 h-4" />}
                                                {row.trend.direction === 'stable' && <Minus className="w-4 h-4" />}
                                                <span>{row.trend.label}</span>
                                            </div>
                                        </td>
                                        {config.showRawValues && (
                                            <td className="p-3 text-right font-mono text-muted-foreground">
                                                {row.rawFinal.toFixed(4)}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'summary' && (
                    <div className="h-full overflow-auto p-6">
                        <div className="max-w-2xl mx-auto">
                            <h2 className="text-xl font-bold mb-4">{summary.title}</h2>
                            
                            <div className="space-y-3">
                                {summary.points.map((point, idx) => (
                                    <div 
                                        key={idx}
                                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-bold text-primary">{idx + 1}</span>
                                        </div>
                                        <p className="text-sm">{point}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Quick Stats */}
                            <div className="mt-6 grid grid-cols-3 gap-4">
                                {tableData.slice(0, 6).map((item) => (
                                    <div 
                                        key={item.fullName}
                                        className="p-4 border rounded-lg bg-card"
                                    >
                                        <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                                        <p className="text-2xl font-bold mt-1">{item.final}</p>
                                        <div className={cn("flex items-center gap-1 text-xs mt-1", item.trend.color)}>
                                            {item.trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
                                            {item.trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
                                            {item.trend.direction === 'stable' && <Minus className="w-3 h-3" />}
                                            <span>{item.trend.label}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'advanced' && (
                    <AdvancedCharts />
                )}
            </div>
        </div>
    );
};
