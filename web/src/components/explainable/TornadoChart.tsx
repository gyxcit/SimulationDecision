/**
 * Tornado Chart (Analyst View)
 * 
 * Horizontal bar chart showing positive/negative impacts symmetrically
 */

import React from 'react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine
} from 'recharts';
import { Tornado } from 'lucide-react';

interface TornadoChartProps {
    className?: string;
}

export const TornadoChart: React.FC<TornadoChartProps> = ({ className }) => {
    const { explainableResult, setCrossFilter, crossFilterVariable } = useStore();

    if (!explainableResult || explainableResult.sensitivities.length === 0) {
        return (
            <div className={cn(
                "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
                className
            )}>
                <div className="text-center text-slate-500 dark:text-slate-400">
                    <Tornado className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No sensitivity data available</p>
                </div>
            </div>
        );
    }

    // Prepare data for tornado chart
    const sensitivities = explainableResult.sensitivities.slice(0, 10);

    // Calculate low and high scenarios for each sensitivity
    const data = sensitivities.map(s => {
        // Simulate +/- 10% change impact
        const lowImpact = -s.elasticity * 0.1;
        const highImpact = s.elasticity * 0.1;

        return {
            variable: s.variable,
            name: s.displayName.split(' ').slice(0, 2).join(' '),
            lowImpact,
            highImpact,
            range: Math.abs(highImpact - lowImpact),
            isSelected: crossFilterVariable === s.variable
        };
    }).sort((a, b) => b.range - a.range);

    const handleBarClick = (variable: string) => {
        if (crossFilterVariable === variable) {
            setCrossFilter(null);
        } else {
            setCrossFilter(variable);
        }
    };

    return (
        <div className={cn(
            "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
            className
        )}>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                <Tornado className="w-4 h-4" />
                Sensitivity Analysis (Tornado)
            </h3>

            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                    >
                        <XAxis
                            type="number"
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickLine={false}
                            tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
                            domain={['auto', 'auto']}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            width={75}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'rgba(15, 23, 42, 0.9)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '12px'
                            }}
                            formatter={((value: any, name: any) => [
                                `${typeof value === 'number' && value > 0 ? '+' : ''}${typeof value === 'number' ? value.toFixed(1) : '0'}%`,
                                name === 'lowImpact' ? '-10% Change' : '+10% Change'
                            ]) as any}
                        />
                        <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />

                        {/* Low impact (negative) bars */}
                        <Bar
                            dataKey="lowImpact"
                            fill="#ef4444"
                            radius={[4, 0, 0, 4]}
                            onClick={(_, index) => handleBarClick(data[index].variable)}
                            cursor="pointer"
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={index}
                                    fill={entry.isSelected ? '#dc2626' : '#ef4444'}
                                    opacity={entry.isSelected ? 1 : 0.7}
                                />
                            ))}
                        </Bar>

                        {/* High impact (positive) bars */}
                        <Bar
                            dataKey="highImpact"
                            fill="#10b981"
                            radius={[0, 4, 4, 0]}
                            onClick={(_, index) => handleBarClick(data[index].variable)}
                            cursor="pointer"
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={index}
                                    fill={entry.isSelected ? '#059669' : '#10b981'}
                                    opacity={entry.isSelected ? 1 : 0.7}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span>-10% Parameter Change</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>+10% Parameter Change</span>
                </div>
            </div>
        </div>
    );
};

export default TornadoChart;
