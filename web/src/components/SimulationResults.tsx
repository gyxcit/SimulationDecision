import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, Table as TableIcon } from 'lucide-react';

type ResultTab = 'chart' | 'table';

export const SimulationResults: React.FC = () => {
    const { simulationResult } = useStore();
    const [activeTab, setActiveTab] = useState<ResultTab>('chart');
    const [selectedVariables, setSelectedVariables] = useState<Set<string>>(new Set());

    if (!simulationResult) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                Run a simulation to see results
            </div>
        );
    }

    // Get all available variables from the first timestep
    const allVariables = Object.keys(simulationResult.history[0] || {}).filter(key => key !== 'time');

    // Transform data for charts - use time_points array for time values
    const chartData = simulationResult.history.map((point, index) => ({
        time: simulationResult.time_points[index] ?? index,
        ...Object.fromEntries(
            Array.from(selectedVariables).map(varName => [varName, point[varName]])
        )
    }));

    // Calculate table data with initial/final values and change
    const tableData = allVariables.map(varName => {
        const initial = simulationResult.history[0][varName] || 0;
        const final = simulationResult.history[simulationResult.history.length - 1][varName] || 0;
        const change = ((final - initial) / initial) * 100;

        // Parse entity and component from variable name (e.g., "School.funding")
        const parts = varName.split('.');
        const entity = parts[0] || '';
        const component = parts[1] || varName;

        return {
            name: component,
            entity,
            fullName: varName,
            initial: initial.toFixed(3),
            final: final.toFixed(3),
            change: isFinite(change) ? change.toFixed(2) : 'N/A'
        };
    });

    const toggleVariable = (varName: string) => {
        const newSelected = new Set(selectedVariables);
        if (newSelected.has(varName)) {
            newSelected.delete(varName);
        } else {
            newSelected.add(varName);
        }
        setSelectedVariables(newSelected);
    };

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    return (
        <div className="h-full flex flex-col bg-card border-t">
            {/* Tab Headers */}
            <div className="flex border-b bg-muted/30">
                <button
                    onClick={() => setActiveTab('chart')}
                    className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${activeTab === 'chart'
                            ? 'bg-background border-b-2 border-primary text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    Charts
                </button>
                <button
                    onClick={() => setActiveTab('table')}
                    className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${activeTab === 'table'
                            ? 'bg-background border-b-2 border-primary text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <TableIcon className="w-4 h-4" />
                    Table
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'chart' && (
                    <div className="h-full flex">
                        {/* Variable Selector */}
                        <div className="w-64 border-r bg-card overflow-y-auto p-3">
                            <h3 className="text-sm font-semibold mb-2">Variables</h3>
                            <div className="space-y-1">
                                {allVariables.map((varName, idx) => (
                                    <label
                                        key={varName}
                                        className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedVariables.has(varName)}
                                            onChange={() => toggleVariable(varName)}
                                            className="rounded"
                                        />
                                        <div className="flex items-center gap-2 flex-1">
                                            <div
                                                className="w-3 h-3 rounded"
                                                style={{ backgroundColor: colors[idx % colors.length] }}
                                            />
                                            <span className="text-sm truncate">{varName}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Chart Display */}
                        <div className="flex-1 p-4">
                            {selectedVariables.size === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground">
                                    Select variables to display
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="time"
                                            label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                                        />
                                        <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
                                        <Tooltip />
                                        <Legend />
                                        {Array.from(selectedVariables).map((varName, idx) => (
                                            <Line
                                                key={varName}
                                                type="monotone"
                                                dataKey={varName}
                                                stroke={colors[allVariables.indexOf(varName) % colors.length]}
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'table' && (
                    <div className="h-full overflow-auto p-4">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-card">
                                    <th className="text-left p-2 border-b font-semibold bg-card">Component</th>
                                    <th className="text-left p-2 border-b font-semibold bg-card">Entity</th>
                                    <th className="text-right p-2 border-b font-semibold bg-card">Initial</th>
                                    <th className="text-right p-2 border-b font-semibold bg-card">Final</th>
                                    <th className="text-right p-2 border-b font-semibold bg-card">Change (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.map((row) => {
                                    const changeNum = parseFloat(row.change);
                                    const changeColor = isNaN(changeNum)
                                        ? 'text-muted-foreground'
                                        : changeNum > 0
                                            ? 'text-green-600'
                                            : changeNum < 0
                                                ? 'text-red-600'
                                                : 'text-muted-foreground';

                                    return (
                                        <tr key={row.fullName} className="border-b hover:bg-accent/50">
                                            <td className="p-2 font-medium">{row.name}</td>
                                            <td className="p-2 text-muted-foreground">{row.entity}</td>
                                            <td className="p-2 text-right font-mono">{row.initial}</td>
                                            <td className="p-2 text-right font-mono">{row.final}</td>
                                            <td className={`p-2 text-right font-mono font-semibold ${changeColor}`}>
                                                {row.change !== 'N/A' && (changeNum > 0 ? '+' : '')}
                                                {row.change}
                                                {row.change !== 'N/A' && '%'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
