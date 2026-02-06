/**
 * Explainable Panel
 * 
 * Main container that renders widgets based on current view mode
 */

import React, { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { VIEW_MODE_CONFIGS } from '../../lib/viewModes';
import type { WidgetType } from '../../types/explainability';

// Widget imports
import PerformanceScorecard from './PerformanceScorecard';
import KeyDriversPanel from './KeyDriversPanel';
import ScenarioProjection from './ScenarioProjection';
import AIInsightCard from './AIInsightCard';
import LeverageTable from './LeverageTable';
import LiveSimulator from './LiveSimulator';
import WaterfallChart from './WaterfallChart';
import TornadoChart from './TornadoChart';
import CriticalPathDiagram from './CriticalPathDiagram';
import NarrativeTimeline from './NarrativeTimeline';
import ViewModeController from './ViewModeController';

interface ExplainablePanelProps {
    className?: string;
}

// Widget component mapping
const widgetComponents: Partial<Record<WidgetType, React.FC<{ className?: string }>>> = {
    scorecard: PerformanceScorecard,
    keyDrivers: KeyDriversPanel,
    scenarioProjection: ScenarioProjection,
    aiInsight: AIInsightCard,
    leverageTable: LeverageTable,
    liveSimulator: LiveSimulator,
    contributionPlot: WaterfallChart, // Waterfall serves as contribution plot
    criticalPath: CriticalPathDiagram,
    narrativeTimeline: NarrativeTimeline,
    sensitivityHeatmap: TornadoChart, // Tornado serves as sensitivity view
};

// Widget layout configuration
const widgetLayout: Record<WidgetType, { colSpan: number; order: number }> = {
    scorecard: { colSpan: 2, order: 1 },
    keyDrivers: { colSpan: 1, order: 2 },
    scenarioProjection: { colSpan: 1, order: 3 },
    aiInsight: { colSpan: 2, order: 4 },
    leverageTable: { colSpan: 1, order: 1 },
    liveSimulator: { colSpan: 1, order: 2 },
    opportunityMap: { colSpan: 2, order: 3 },
    causalGraph: { colSpan: 2, order: 1 },
    contributionPlot: { colSpan: 1, order: 2 },
    criticalPath: { colSpan: 1, order: 3 },
    narrativeTimeline: { colSpan: 2, order: 4 },
    timeSeries: { colSpan: 2, order: 1 },
    sensitivityHeatmap: { colSpan: 1, order: 2 },
    parameterDistribution: { colSpan: 1, order: 3 },
    equationInspector: { colSpan: 2, order: 4 },
    stabilityIndicator: { colSpan: 1, order: 5 }
};

export const ExplainablePanel: React.FC<ExplainablePanelProps> = ({ className }) => {
    const {
        viewMode,
        simulationResult,
        model,
        computeExplainability,
        explainableResult
    } = useStore();

    // Auto-compute explainability when simulation result changes
    useEffect(() => {
        if (simulationResult && model && !explainableResult) {
            computeExplainability();
        }
    }, [simulationResult, model, explainableResult, computeExplainability]);

    const config = VIEW_MODE_CONFIGS[viewMode];
    const visibleWidgets = config.widgets
        .filter(widget => widgetComponents[widget])
        .sort((a, b) => widgetLayout[a].order - widgetLayout[b].order);

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* View Mode Controller */}
            <ViewModeController variant="pills" className="mb-4" />

            {/* Widgets Grid */}
            <div className="flex-1 overflow-y-auto">
                {!simulationResult ? (
                    <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                        <div className="text-center">
                            <div className="text-4xl mb-2">📊</div>
                            <p className="font-medium">No simulation data</p>
                            <p className="text-sm mt-1">Run a simulation to see explainable insights</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {visibleWidgets.map(widgetType => {
                            const Component = widgetComponents[widgetType];
                            if (!Component) return null;

                            const layout = widgetLayout[widgetType];

                            return (
                                <div
                                    key={widgetType}
                                    className={cn(
                                        layout.colSpan === 2 && 'col-span-2'
                                    )}
                                >
                                    <Component className="h-full" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer info */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div>
                    <span className="font-medium">{config.label}</span>
                    <span className="mx-2">•</span>
                    <span>Data density: {config.dataDensity}</span>
                </div>
                {explainableResult && (
                    <div className="text-right">
                        Analyzed at {explainableResult.computedAt.toLocaleTimeString()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExplainablePanel;
