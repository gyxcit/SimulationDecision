/**
 * AI Insight Card (Executive View)
 * 
 * Natural language explanation generated from analysis
 */

import React from 'react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { Sparkles, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface AIInsightCardProps {
    className?: string;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({ className }) => {
    const { explainableResult } = useStore();

    if (!explainableResult) {
        return (
            <div className={cn(
                "bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 shadow-sm border border-purple-100 dark:border-purple-800",
                className
            )}>
                <div className="text-center text-slate-500 dark:text-slate-400">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>AI insights will appear after simulation</p>
                </div>
            </div>
        );
    }

    const insight = explainableResult.aiInsight || 'No insights generated.';
    const viability = explainableResult.viability;

    // Determine insight type based on content
    const getInsightType = () => {
        if (insight.includes('⚠️') || insight.includes('risk') || insight.includes('at risk')) {
            return 'warning';
        }
        if (viability.score >= 70) {
            return 'success';
        }
        return 'info';
    };

    const insightType = getInsightType();

    const typeConfig = {
        warning: {
            icon: AlertCircle,
            gradient: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
            border: 'border-amber-200 dark:border-amber-800',
            iconColor: 'text-amber-500'
        },
        success: {
            icon: CheckCircle,
            gradient: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
            border: 'border-green-200 dark:border-green-800',
            iconColor: 'text-green-500'
        },
        info: {
            icon: Info,
            gradient: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
            border: 'border-blue-200 dark:border-blue-800',
            iconColor: 'text-blue-500'
        }
    };

    const config = typeConfig[insightType];
    const Icon = config.icon;

    // Parse insight into sentences for better formatting
    const sentences = insight.split('. ').filter(s => s.trim());

    return (
        <div className={cn(
            "rounded-xl p-6 shadow-sm border",
            `bg-gradient-to-br ${config.gradient}`,
            config.border,
            className
        )}>
            <div className="flex items-start gap-3">
                <div className={cn("mt-0.5", config.iconColor)}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            AI Insight
                        </h3>
                    </div>

                    <div className="space-y-2">
                        {sentences.map((sentence, idx) => (
                            <p
                                key={idx}
                                className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                            >
                                {sentence.trim()}{!sentence.endsWith('.') && '.'}
                            </p>
                        ))}
                    </div>

                    {/* Quick stats */}
                    <div className="mt-4 flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <span className="font-medium">Confidence:</span>
                            <span className={cn(
                                "px-2 py-0.5 rounded-full",
                                viability.score >= 70
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : viability.score >= 50
                                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            )}>
                                {viability.score >= 70 ? 'High' : viability.score >= 50 ? 'Medium' : 'Low'}
                            </span>
                        </div>
                        <div className="text-slate-400 dark:text-slate-500">
                            Based on {explainableResult.mainDrivers.length} drivers analyzed
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIInsightCard;
