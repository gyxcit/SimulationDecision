/**
 * Live Simulator Widget (Levers View)
 * 
 * Interactive sliders with real-time impact preview
 */

import React, { useState, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { Play, RotateCcw, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface LiveSimulatorProps {
    className?: string;
}

interface SliderState {
    variable: string;
    originalValue: number;
    currentValue: number;
    min: number;
    max: number;
    displayName: string;
}

export const LiveSimulator: React.FC<LiveSimulatorProps> = ({ className }) => {
    const { explainableResult, model, updateParameter, runSimulation, isLoading } = useStore();
    const [sliders, setSliders] = useState<SliderState[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    // Initialize sliders from sensitivities
    React.useEffect(() => {
        if (!explainableResult || sliders.length > 0) return;

        const topSensitivities = explainableResult.sensitivities
            .filter(s => s.controlLevel !== 'low')
            .slice(0, 4);

        setSliders(topSensitivities.map(s => ({
            variable: s.variable,
            originalValue: s.currentValue,
            currentValue: s.currentValue,
            min: s.min,
            max: s.max,
            displayName: s.displayName
        })));
    }, [explainableResult]);

    const handleSliderChange = useCallback((variable: string, value: number) => {
        setSliders(prev => prev.map(s =>
            s.variable === variable ? { ...s, currentValue: value } : s
        ));
        setHasChanges(true);

        // Update the model parameter
        updateParameter(variable, value);
    }, [updateParameter]);

    const handleReset = useCallback(() => {
        setSliders(prev => prev.map(s => {
            updateParameter(s.variable, s.originalValue);
            return { ...s, currentValue: s.originalValue };
        }));
        setHasChanges(false);
    }, [updateParameter]);

    const handleRunSimulation = useCallback(async () => {
        await runSimulation();
        // Update original values after simulation
        setSliders(prev => prev.map(s => ({
            ...s,
            originalValue: s.currentValue
        })));
        setHasChanges(false);
    }, [runSimulation]);

    if (!model || sliders.length === 0) {
        return (
            <div className={cn(
                "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
                className
            )}>
                <div className="text-center text-slate-500 dark:text-slate-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No controllable parameters available</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700",
            className
        )}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Live Simulator
                </h3>
                <div className="flex items-center gap-2">
                    {hasChanges && (
                        <button
                            onClick={handleReset}
                            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset
                        </button>
                    )}
                    <button
                        onClick={handleRunSimulation}
                        disabled={isLoading || !hasChanges}
                        className={cn(
                            "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            hasChanges && !isLoading
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-700 cursor-not-allowed'
                        )}
                    >
                        <Play className="w-3 h-3" />
                        {isLoading ? 'Running...' : 'Run Simulation'}
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {sliders.map(slider => {
                    const delta = slider.currentValue - slider.originalValue;
                    const deltaPercent = slider.originalValue !== 0
                        ? ((delta / slider.originalValue) * 100).toFixed(0)
                        : '0';
                    const hasChange = Math.abs(delta) > 0.001;

                    return (
                        <div key={slider.variable} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    {slider.displayName}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600 dark:text-slate-300">
                                        {(slider.currentValue * 100).toFixed(0)}%
                                    </span>
                                    {hasChange && (
                                        <span className={cn(
                                            "flex items-center gap-0.5 text-xs font-medium",
                                            delta > 0 ? 'text-green-500' : 'text-red-500'
                                        )}>
                                            {delta > 0 ? (
                                                <TrendingUp className="w-3 h-3" />
                                            ) : (
                                                <TrendingDown className="w-3 h-3" />
                                            )}
                                            {delta > 0 ? '+' : ''}{deltaPercent}%
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="relative">
                                <input
                                    type="range"
                                    min={slider.min}
                                    max={slider.max}
                                    step={0.01}
                                    value={slider.currentValue}
                                    onChange={(e) => handleSliderChange(slider.variable, parseFloat(e.target.value))}
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer
                                        [&::-webkit-slider-thumb]:appearance-none
                                        [&::-webkit-slider-thumb]:w-4
                                        [&::-webkit-slider-thumb]:h-4
                                        [&::-webkit-slider-thumb]:bg-blue-500
                                        [&::-webkit-slider-thumb]:rounded-full
                                        [&::-webkit-slider-thumb]:cursor-pointer
                                        [&::-webkit-slider-thumb]:transition-transform
                                        [&::-webkit-slider-thumb]:hover:scale-110
                                        [&::-moz-range-thumb]:w-4
                                        [&::-moz-range-thumb]:h-4
                                        [&::-moz-range-thumb]:bg-blue-500
                                        [&::-moz-range-thumb]:rounded-full
                                        [&::-moz-range-thumb]:cursor-pointer
                                        [&::-moz-range-thumb]:border-0"
                                />

                                {/* Original value marker */}
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-slate-400 dark:bg-slate-500"
                                    style={{
                                        left: `${((slider.originalValue - slider.min) / (slider.max - slider.min)) * 100}%`
                                    }}
                                    title={`Original: ${(slider.originalValue * 100).toFixed(0)}%`}
                                />
                            </div>

                            <div className="flex justify-between text-xs text-slate-400">
                                <span>{(slider.min * 100).toFixed(0)}%</span>
                                <span>{(slider.max * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Impact preview */}
            {hasChanges && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        💡 Click "Run Simulation" to see how these changes affect the system
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveSimulator;
