/**
 * Performance Scorecard Widget (Executive View)
 * 
 * Displays at-a-glance system health metrics:
 * - Viability score with trend
 * - Risk level indicator
 * - Stability badge
 */

import React from 'react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Activity,
    Shield
} from 'lucide-react';

interface PerformanceScorecardProps {
    className?: string;
}

export const PerformanceScorecard: React.FC<PerformanceScorecardProps> = ({ className }) => {
    const { explainableResult } = useStore();

    if (!explainableResult) {
        return (
            <div className={cn(
                "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
                className
            )}>
                <div className="text-center text-slate-500 dark:text-slate-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Run a simulation to see performance metrics</p>
                </div>
            </div>
        );
    }

    const { viability } = explainableResult;

    // Determine viability color
    const getViabilityColor = (score: number) => {
        if (score >= 70) return 'text-green-500';
        if (score >= 50) return 'text-yellow-500';
        if (score >= 30) return 'text-orange-500';
        return 'text-red-500';
    };

    const getViabilityBgColor = (score: number) => {
        if (score >= 70) return 'bg-green-500/10';
        if (score >= 50) return 'bg-yellow-500/10';
        if (score >= 30) return 'bg-orange-500/10';
        return 'bg-red-500/10';
    };

    // Risk level configuration
    const riskConfig = {
        low: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Low Risk' },
        medium: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Medium Risk' },
        high: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'High Risk' },
        critical: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Critical Risk' }
    };

    // Stability configuration
    const stabilityConfig = {
        good: { color: 'text-green-500', bg: 'bg-green-500/10', label: 'Stable' },
        moderate: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Moderate' },
        unstable: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Unstable' }
    };

    const risk = riskConfig[viability.riskLevel];
    const stability = stabilityConfig[viability.stability];
    const RiskIcon = risk.icon;

    // Trend icon
    const TrendIcon = viability.trend === 'up' ? TrendingUp :
        viability.trend === 'down' ? TrendingDown : Minus;

    const trendColor = viability.trend === 'up' ? 'text-green-500' :
        viability.trend === 'down' ? 'text-red-500' : 'text-slate-400';

    // Calculate delta
    const delta = viability.previousScore
        ? viability.score - viability.previousScore
        : 0;

    return (
        <div className={cn(
            "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
            className
        )}>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Performance Scorecard
            </h3>

            <div className="grid grid-cols-3 gap-4">
                {/* Viability Score */}
                <div className={cn(
                    "rounded-lg p-4 text-center",
                    getViabilityBgColor(viability.score)
                )}>
                    <div className={cn(
                        "text-4xl font-bold mb-1",
                        getViabilityColor(viability.score)
                    )}>
                        {viability.score}%
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                        Project Viability
                    </div>
                    {delta !== 0 && (
                        <div className={cn(
                            "flex items-center justify-center gap-1 mt-2 text-sm",
                            trendColor
                        )}>
                            <TrendIcon className="w-4 h-4" />
                            <span>{delta > 0 ? '+' : ''}{delta}%</span>
                        </div>
                    )}
                </div>

                {/* Risk Level */}
                <div className={cn(
                    "rounded-lg p-4 text-center",
                    risk.bg
                )}>
                    <div className={cn("flex justify-center mb-2", risk.color)}>
                        <RiskIcon className="w-10 h-10" />
                    </div>
                    <div className={cn("text-lg font-bold", risk.color)}>
                        {risk.label}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                        Risk Level
                    </div>
                </div>

                {/* Stability */}
                <div className={cn(
                    "rounded-lg p-4 text-center",
                    stability.bg
                )}>
                    <div className={cn("flex justify-center mb-2", stability.color)}>
                        <Shield className="w-10 h-10" />
                    </div>
                    <div className={cn("text-lg font-bold", stability.color)}>
                        {stability.label}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                        System Stability
                    </div>
                </div>
            </div>

            {/* Key Factors Summary */}
            {viability.factors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                        Key Factors
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {viability.factors.slice(0, 4).map((factor, idx) => (
                            <span
                                key={idx}
                                className={cn(
                                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                                    factor.direction === 'positive'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                )}
                            >
                                {factor.direction === 'positive' ? '↑' : '↓'}
                                {factor.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceScorecard;
