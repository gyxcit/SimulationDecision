/**
 * Scenario Projection Widget (Executive View)
 * 
 * Compare baseline vs alternative scenarios with timeline projections
 */

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { GitCompare, ChevronRight, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ScenarioResult } from '../../types/explainability';

interface ScenarioProjectionProps {
    className?: string;
}

export const ScenarioProjection: React.FC<ScenarioProjectionProps> = ({ className }) => {
    const { explainableResult } = useStore();
    const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

    if (!explainableResult || explainableResult.scenarios.length === 0) {
        return (
            <div className={cn(
                "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
                className
            )}>
                <div className="text-center text-slate-500 dark:text-slate-400">
                    <GitCompare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No scenarios available</p>
                </div>
            </div>
        );
    }

    const scenarios = explainableResult.scenarios;
    const baseline = scenarios.find(s => s.id === 'baseline');
    const alternatives = scenarios.filter(s => s.id !== 'baseline');

    const getTrendIcon = (delta: number) => {
        if (delta > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
        if (delta < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
        return <Minus className="w-4 h-4 text-slate-400" />;
    };

    const getScenarioDetails = (scenario: ScenarioResult) => {
        if (!selectedScenario || selectedScenario !== scenario.id) return null;

        return (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {scenario.description}
                </p>
                {scenario.parameters.length > 0 && (
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            Parameter Changes:
                        </div>
                        {scenario.parameters.map((param, idx) => (
                            <div key={idx} className="text-xs text-slate-500 flex items-center gap-2">
                                <span>{param.variable.split('.').pop()}</span>
                                <ChevronRight className="w-3 h-3" />
                                <span>{param.originalValue.toFixed(2)}</span>
                                <span>→</span>
                                <span className="font-medium text-blue-600">{param.newValue.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={cn(
            "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
            className
        )}>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                <GitCompare className="w-4 h-4" />
                Scenario Projections
            </h3>

            {/* Baseline */}
            {baseline && (
                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                {baseline.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                Current trajectory
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                                {baseline.projected.toFixed(0)}%
                            </div>
                            <div className="text-xs text-slate-500">Viability</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alternative Scenarios */}
            <div className="space-y-2">
                {alternatives.map(scenario => {
                    const isSelected = selectedScenario === scenario.id;
                    const isPositive = scenario.delta > 0;

                    return (
                        <div
                            key={scenario.id}
                            className={cn(
                                "p-3 rounded-lg border-2 cursor-pointer transition-all",
                                isSelected
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-transparent bg-slate-50 dark:bg-slate-700/30 hover:border-slate-200 dark:hover:border-slate-600'
                            )}
                            onClick={() => setSelectedScenario(isSelected ? null : scenario.id)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: scenario.color }}
                                    />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                        {scenario.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Delta */}
                                    <div className={cn(
                                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                                        isPositive
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : scenario.delta < 0
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                    )}>
                                        {getTrendIcon(scenario.delta)}
                                        <span>{isPositive ? '+' : ''}{scenario.deltaPercent}%</span>
                                    </div>

                                    {/* Projected */}
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-slate-700 dark:text-slate-200">
                                            {scenario.projected.toFixed(0)}%
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded details */}
                            {getScenarioDetails(scenario)}
                        </div>
                    );
                })}
            </div>

            {/* Timeline indicator */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Click a scenario to see details</span>
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Projected over simulation timeline</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScenarioProjection;
