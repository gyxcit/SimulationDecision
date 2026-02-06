/**
 * Waterfall Chart (Analyst View)
 * 
 * Shows contribution breakdown for a selected variable
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
import { Layers } from 'lucide-react';

interface WaterfallChartProps {
    className?: string;
    targetVariable?: string;
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
    className,
    targetVariable
}) => {
    const { explainableResult, crossFilterVariable } = useStore();

    if (!explainableResult || explainableResult.contributions.length === 0) {
        return (
            <div className={cn(
                "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
                className
            )}>
                <div className="text-center text-slate-500 dark:text-slate-400">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No contribution data available</p>
                </div>
            </div>
        );
    }

    // Find the contribution to display
    const target = targetVariable || crossFilterVariable;
    let contribution = target
        ? explainableResult.contributions.find(c => c.target === target)
        : explainableResult.contributions[0];

    if (!contribution) {
        contribution = explainableResult.contributions[0];
    }

    // Build waterfall data
    interface WaterfallItem {
        name: string;
        value: number;
        displayValue: number;
        isStart: boolean;
        isEnd: boolean;
        color: string;
        start: number;
    }

    const data: WaterfallItem[] = [];

    // Start bar
    data.push({
        name: 'Initial',
        value: contribution.initialValue,
        displayValue: contribution.initialValue,
        isStart: true,
        isEnd: false,
        color: '#6366f1',
        start: 0
    });

    // Contribution bars
    let runningTotal = contribution.initialValue;
    contribution.contributors.forEach(c => {
        const value = c.sign === '+' ? c.contribution : -c.contribution;
        data.push({
            name: c.displayName.split('.').pop() || c.displayName,
            value: value,
            displayValue: Math.abs(value),
            isStart: false,
            isEnd: false,
            color: c.sign === '+' ? '#10b981' : '#ef4444',
            start: runningTotal
        });
        runningTotal += value;
    });

    // End bar
    data.push({
        name: 'Final',
        value: contribution.finalValue,
        displayValue: contribution.finalValue,
        isStart: false,
        isEnd: true,
        color: '#6366f1',
        start: 0
    });

    const CustomBar = (props: {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        payload?: WaterfallItem;
    }) => {
        const { x = 0, y = 0, width = 0, height = 0, payload } = props;
        if (!payload) return null;

        const fill = payload.color;
        const barY = payload.isStart || payload.isEnd ? y : y;

        return (
            <g>
                <rect
                    x={x}
                    y={barY}
                    width={width}
                    height={Math.abs(height)}
                    fill={fill}
                    rx={4}
                    opacity={0.9}
                />
            </g>
        );
    };

    return (
        <div className={cn(
            "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
            className
        )}>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Contribution Waterfall: {contribution.targetDisplayName}
            </h3>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 0, bottom: 30 }}
                    >
                        <XAxis
                            dataKey="name"
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickLine={false}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickLine={false}
                            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'rgba(15, 23, 42, 0.9)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '12px'
                            }}
                            formatter={((value: any, _name: any, props: any) => {
                                const payload = props?.payload as WaterfallItem | undefined;
                                const isChange = !payload?.isStart && !payload?.isEnd;
                                const sign = payload?.color === '#10b981' ? '+' : payload?.color === '#ef4444' ? '-' : '';
                                const numValue = typeof value === 'number' ? value : 0;
                                return [
                                    `${isChange ? sign : ''}${(numValue * 100).toFixed(1)}%`,
                                    isChange ? 'Contribution' : 'Value'
                                ];
                            }) as any}
                        />
                        <ReferenceLine y={0} stroke="#e2e8f0" />
                        <Bar
                            dataKey="displayValue"
                            shape={<CustomBar />}
                        >
                            {data.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Summary */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-4 text-center">
                <div>
                    <div className="text-lg font-bold text-slate-700 dark:text-slate-200">
                        {(contribution.initialValue * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500">Initial</div>
                </div>
                <div>
                    <div className={cn(
                        "text-lg font-bold",
                        contribution.totalChange >= 0 ? 'text-green-500' : 'text-red-500'
                    )}>
                        {contribution.totalChange >= 0 ? '+' : ''}{(contribution.totalChange * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500">Change</div>
                </div>
                <div>
                    <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {(contribution.finalValue * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500">Final</div>
                </div>
            </div>
        </div>
    );
};

export default WaterfallChart;
