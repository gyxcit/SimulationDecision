/**
 * Leverage Table Widget (Levers View)
 * 
 * Table showing controllable parameters with impact indicators
 */

import React from 'react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { Sliders, Flame, ArrowRight } from 'lucide-react';

interface LeverageTableProps {
    className?: string;
}

export const LeverageTable: React.FC<LeverageTableProps> = ({ className }) => {
    const { explainableResult, setCrossFilter, crossFilterVariable } = useStore();

    if (!explainableResult || explainableResult.sensitivities.length === 0) {
        return (
            <div className={cn(
                "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
                className
            )}>
                <div className="text-center text-slate-500 dark:text-slate-400">
                    <Sliders className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No leverage data available</p>
                </div>
            </div>
        );
    }

    const sensitivities = explainableResult.sensitivities.slice(0, 8);

    // Impact indicator (fire icons)
    const getImpactIndicator = (elasticity: number) => {
        const flames = Math.min(3, Math.ceil(elasticity / 33));
        return Array(flames).fill(0).map((_, i) => (
            <Flame key={i} className="w-4 h-4 text-orange-500" />
        ));
    };

    // Control level badge
    const getControlBadge = (level: 'high' | 'medium' | 'low') => {
        const config = {
            high: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
            medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
            low: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' }
        };
        return config[level];
    };

    return (
        <div className={cn(
            "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
            className
        )}>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                Leverage Table
            </h3>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3">
                                Parameter
                            </th>
                            <th className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3">
                                Impact
                            </th>
                            <th className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3">
                                Control
                            </th>
                            <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3">
                                Current
                            </th>
                            <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3">
                                Suggested
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {sensitivities.map((item, _idx) => {
                            const isSelected = crossFilterVariable === item.variable;
                            const badge = getControlBadge(item.controlLevel);

                            return (
                                <tr
                                    key={item.variable}
                                    className={cn(
                                        "cursor-pointer transition-colors",
                                        isSelected
                                            ? 'bg-blue-50 dark:bg-blue-900/20'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                    )}
                                    onClick={() => setCrossFilter(isSelected ? null : item.variable)}
                                >
                                    <td className="py-3">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {item.displayName}
                                        </span>
                                    </td>
                                    <td className="py-3">
                                        <div className="flex items-center justify-center gap-0.5">
                                            {getImpactIndicator(item.elasticity)}
                                        </div>
                                    </td>
                                    <td className="py-3 text-center">
                                        <span className={cn(
                                            "inline-block px-2 py-1 rounded-full text-xs font-medium capitalize",
                                            badge.bg,
                                            badge.text
                                        )}>
                                            {item.controlLevel}
                                        </span>
                                    </td>
                                    <td className="py-3 text-right">
                                        <span className="text-sm text-slate-600 dark:text-slate-300">
                                            {(item.currentValue * 100).toFixed(0)}%
                                        </span>
                                    </td>
                                    <td className="py-3 text-right">
                                        {item.suggestedValue !== undefined ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <ArrowRight className="w-3 h-3 text-blue-500" />
                                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                                    {(item.suggestedValue * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-slate-400">—</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        = High sensitivity
                    </div>
                </div>
                <span>Click row to filter related charts</span>
            </div>
        </div>
    );
};

export default LeverageTable;
