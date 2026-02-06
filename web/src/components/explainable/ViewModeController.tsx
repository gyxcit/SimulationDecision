/**
 * View Mode Controller
 * 
 * Tab/button group for switching between visualization pyramid levels
 */

import React from 'react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { VIEW_MODE_CONFIGS, type ViewMode } from '../../lib/viewModes';
import {
    Briefcase,
    Sliders,
    Search,
    Code
} from 'lucide-react';

interface ViewModeControllerProps {
    className?: string;
    variant?: 'tabs' | 'pills' | 'compact';
}

const iconMap = {
    briefcase: Briefcase,
    sliders: Sliders,
    search: Search,
    code: Code
};

export const ViewModeController: React.FC<ViewModeControllerProps> = ({
    className,
    variant = 'tabs'
}) => {
    const { viewMode, setViewMode, computeExplainability, simulationResult } = useStore();

    const modes: ViewMode[] = ['executive', 'levers', 'analyst', 'technical'];

    const handleModeChange = (mode: ViewMode) => {
        setViewMode(mode);
        // Recompute explainability when mode changes (for mode-specific calculations)
        if (simulationResult) {
            computeExplainability();
        }
    };

    if (variant === 'compact') {
        return (
            <div className={cn("flex items-center gap-1", className)}>
                {modes.map(mode => {
                    const config = VIEW_MODE_CONFIGS[mode];
                    const Icon = iconMap[config.icon as keyof typeof iconMap] || Briefcase;
                    const isActive = viewMode === mode;

                    return (
                        <button
                            key={mode}
                            onClick={() => handleModeChange(mode)}
                            title={config.description}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                isActive
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                            )}
                        >
                            <Icon className="w-4 h-4" />
                        </button>
                    );
                })}
            </div>
        );
    }

    if (variant === 'pills') {
        return (
            <div className={cn(
                "inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl",
                className
            )}>
                {modes.map(mode => {
                    const config = VIEW_MODE_CONFIGS[mode];
                    const Icon = iconMap[config.icon as keyof typeof iconMap] || Briefcase;
                    const isActive = viewMode === mode;

                    return (
                        <button
                            key={mode}
                            onClick={() => handleModeChange(mode)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                isActive
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{config.name}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    // Default: tabs
    return (
        <div className={cn("", className)}>
            <div className="flex border-b border-slate-200 dark:border-slate-700">
                {modes.map(mode => {
                    const config = VIEW_MODE_CONFIGS[mode];
                    const Icon = iconMap[config.icon as keyof typeof iconMap] || Briefcase;
                    const isActive = viewMode === mode;

                    return (
                        <button
                            key={mode}
                            onClick={() => handleModeChange(mode)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px",
                                isActive
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300'
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{config.name}</span>
                            <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full",
                                isActive
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700'
                            )}>
                                L{config.level}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Description */}
            <div className="py-2 px-4 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400">
                {VIEW_MODE_CONFIGS[viewMode].description}
            </div>
        </div>
    );
};

export default ViewModeController;
