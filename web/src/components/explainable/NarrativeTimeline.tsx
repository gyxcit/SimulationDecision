/**
 * Narrative Timeline (Analyst View)
 * 
 * Annotated timeline showing key events during simulation
 */

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import {
    Clock,
    ArrowUp,
    ArrowDown,
    AlertTriangle,
    Info,
    XCircle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import type { TimelineEvent } from '../../types/explainability';

interface NarrativeTimelineProps {
    className?: string;
}

export const NarrativeTimeline: React.FC<NarrativeTimelineProps> = ({ className }) => {
    const { explainableResult } = useStore();
    const [expanded, setExpanded] = useState(false);

    if (!explainableResult || explainableResult.timeline.length === 0) {
        return (
            <div className={cn(
                "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
                className
            )}>
                <div className="text-center text-slate-500 dark:text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No significant events detected</p>
                </div>
            </div>
        );
    }

    const events = explainableResult.timeline;
    const displayEvents = expanded ? events : events.slice(0, 5);

    const getEventConfig = (event: TimelineEvent) => {
        const baseConfig = {
            peak: { icon: ArrowUp, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
            trough: { icon: ArrowDown, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
            threshold_cross: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
            inflection: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
            stability: { icon: Info, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-700' },
            divergence: { icon: XCircle, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' }
        };

        const severityOverride = {
            critical: { border: 'border-l-red-500', pulse: true },
            warning: { border: 'border-l-amber-500', pulse: false },
            info: { border: 'border-l-blue-500', pulse: false }
        };

        return {
            ...baseConfig[event.event],
            ...severityOverride[event.severity]
        };
    };

    const formatTime = (time: number) => {
        if (time < 1) return `${(time * 1000).toFixed(0)}ms`;
        if (time < 60) return `${time.toFixed(1)}s`;
        return `${(time / 60).toFixed(1)}m`;
    };

    return (
        <div className={cn(
            "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
            className
        )}>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Simulation Timeline
            </h3>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />

                {/* Events */}
                <div className="space-y-4">
                    {displayEvents.map((event, idx) => {
                        const config = getEventConfig(event);
                        const Icon = config.icon;

                        return (
                            <div
                                key={idx}
                                className={cn(
                                    "relative pl-10 border-l-4 ml-2",
                                    config.border,
                                    config.pulse && 'animate-pulse'
                                )}
                            >
                                {/* Icon dot */}
                                <div className={cn(
                                    "absolute left-[-10px] w-5 h-5 rounded-full flex items-center justify-center",
                                    config.bg
                                )}>
                                    <Icon className={cn("w-3 h-3", config.color)} />
                                </div>

                                {/* Content */}
                                <div className="pb-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                                            t={formatTime(event.time)}
                                        </span>
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full",
                                            config.bg,
                                            config.color,
                                            'font-medium'
                                        )}>
                                            {event.event.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <p className="text-sm text-slate-700 dark:text-slate-200">
                                        {event.annotation}
                                    </p>

                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                        <span className="font-medium">{event.displayName}</span>
                                        <span>= {(event.value * 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Expand/Collapse */}
            {events.length > 5 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-4 w-full flex items-center justify-center gap-1 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="w-4 h-4" />
                            Show Less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-4 h-4" />
                            Show {events.length - 5} More Events
                        </>
                    )}
                </button>
            )}
        </div>
    );
};

export default NarrativeTimeline;
