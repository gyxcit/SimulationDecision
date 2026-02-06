/**
 * Key Drivers Panel (Executive View)
 * 
 * Horizontal bar chart showing top drivers with impact percentages
 */

import React from 'react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

interface KeyDriversPanelProps {
    className?: string;
    maxDrivers?: number;
}

export const KeyDriversPanel: React.FC<KeyDriversPanelProps> = ({
    className,
    maxDrivers = 5
}) => {
    const { explainableResult, setCrossFilter, crossFilterVariable } = useStore();

    if (!explainableResult || explainableResult.mainDrivers.length === 0) {
        return (
            <div className={cn(
                "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
                className
            )}>
                <div className="text-center text-slate-500 dark:text-slate-400">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No drivers detected</p>
                </div>
            </div>
        );
    }

    const drivers = explainableResult.mainDrivers.slice(0, maxDrivers);
    const maxImpact = Math.max(...drivers.map(d => d.impact));

    const handleDriverClick = (variable: string) => {
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
                <BarChart3 className="w-4 h-4" />
                Key Drivers
            </h3>

            <div className="space-y-3">
                {drivers.map((driver, _idx) => {
                    const barWidth = (driver.impact / maxImpact) * 100;
                    const isSelected = crossFilterVariable === driver.variable;
                    const isPositive = driver.direction === 'positive';

                    return (
                        <div
                            key={driver.variable}
                            className={cn(
                                "cursor-pointer transition-all rounded-lg p-2 -mx-2",
                                isSelected
                                    ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            )}
                            onClick={() => handleDriverClick(driver.variable)}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                        {driver.displayName}
                                    </span>
                                    {isPositive ? (
                                        <TrendingUp className="w-3 h-3 text-green-500" />
                                    ) : (
                                        <TrendingDown className="w-3 h-3 text-red-500" />
                                    )}
                                </div>
                                <span className={cn(
                                    "text-sm font-bold",
                                    isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                )}>
                                    {driver.impact}%
                                </span>
                            </div>

                            {/* Bar */}
                            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        isPositive
                                            ? 'bg-gradient-to-r from-green-400 to-green-600'
                                            : 'bg-gradient-to-r from-red-400 to-red-600'
                                    )}
                                    style={{ width: `${barWidth}%` }}
                                />
                            </div>

                            {/* Explanation on hover/select */}
                            {isSelected && driver.explanation && (
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
                                    {driver.explanation}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Positive Impact</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Negative Impact</span>
                </div>
            </div>
        </div>
    );
};

export default KeyDriversPanel;
