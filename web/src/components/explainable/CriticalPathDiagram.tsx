/**
 * Critical Path Diagram (Analyst View)
 * 
 * Shows causal chains through the system
 */

import React from 'react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { Route, ChevronRight, AlertTriangle, TrendingUp, Minus } from 'lucide-react';
import type { CriticalPath } from '../../types/explainability';

interface CriticalPathDiagramProps {
    className?: string;
}

export const CriticalPathDiagram: React.FC<CriticalPathDiagramProps> = ({ className }) => {
    const { explainableResult, setHighlightedPath, highlightedPath } = useStore();

    if (!explainableResult || explainableResult.criticalPaths.length === 0) {
        return (
            <div className={cn(
                "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
                className
            )}>
                <div className="text-center text-slate-500 dark:text-slate-400">
                    <Route className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No critical paths detected</p>
                </div>
            </div>
        );
    }

    const paths = explainableResult.criticalPaths;

    const getNatureConfig = (nature: CriticalPath['nature']) => {
        switch (nature) {
            case 'risk':
                return {
                    icon: AlertTriangle,
                    color: 'text-red-500',
                    bg: 'bg-red-50 dark:bg-red-900/20',
                    border: 'border-red-200 dark:border-red-800',
                    label: 'Risk Path'
                };
            case 'opportunity':
                return {
                    icon: TrendingUp,
                    color: 'text-green-500',
                    bg: 'bg-green-50 dark:bg-green-900/20',
                    border: 'border-green-200 dark:border-green-800',
                    label: 'Opportunity'
                };
            default:
                return {
                    icon: Minus,
                    color: 'text-slate-500',
                    bg: 'bg-slate-50 dark:bg-slate-700/50',
                    border: 'border-slate-200 dark:border-slate-700',
                    label: 'Neutral'
                };
        }
    };

    const handlePathClick = (path: CriticalPath) => {
        const isCurrentPath = highlightedPath?.join('.') === path.nodes.join('.');
        setHighlightedPath(isCurrentPath ? null : path.nodes);
    };

    return (
        <div className={cn(
            "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
            className
        )}>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                <Route className="w-4 h-4" />
                Critical Paths
            </h3>

            <div className="space-y-3">
                {paths.map((path) => {
                    const config = getNatureConfig(path.nature);
                    const Icon = config.icon;
                    const isSelected = highlightedPath?.join('.') === path.nodes.join('.');

                    return (
                        <div
                            key={path.id}
                            className={cn(
                                "p-4 rounded-lg border-2 cursor-pointer transition-all",
                                isSelected
                                    ? 'ring-2 ring-blue-500 border-blue-500'
                                    : config.border,
                                config.bg
                            )}
                            onClick={() => handlePathClick(path)}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Icon className={cn("w-4 h-4", config.color)} />
                                    <span className={cn("text-xs font-medium", config.color)}>
                                        {config.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs">
                                    <span className="text-slate-500 dark:text-slate-400">Impact:</span>
                                    <span className={cn(
                                        "font-bold",
                                        path.nature === 'risk' ? 'text-red-500' :
                                            path.nature === 'opportunity' ? 'text-green-500' :
                                                'text-slate-600 dark:text-slate-300'
                                    )}>
                                        {path.totalImpact.toFixed(0)}%
                                    </span>
                                </div>
                            </div>

                            {/* Path visualization */}
                            <div className="flex items-center flex-wrap gap-1">
                                {path.nodeDisplayNames.map((nodeName, idx) => (
                                    <React.Fragment key={idx}>
                                        <div className={cn(
                                            "px-3 py-1.5 rounded-lg text-sm font-medium",
                                            idx === 0
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                : idx === path.nodeDisplayNames.length - 1
                                                    ? path.nature === 'risk'
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                                        : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                    : 'bg-white text-slate-700 dark:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                                        )}>
                                            {nodeName}
                                        </div>
                                        {idx < path.nodeDisplayNames.length - 1 && (
                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* Description */}
                            {isSelected && (
                                <p className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-400">
                                    This path shows how changes in <strong>{path.nodeDisplayNames[0]}</strong> propagate through the system
                                    to affect <strong>{path.nodeDisplayNames[path.nodeDisplayNames.length - 1]}</strong>.
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 text-center">
                Click a path to highlight it on the graph
            </div>
        </div>
    );
};

export default CriticalPathDiagram;
