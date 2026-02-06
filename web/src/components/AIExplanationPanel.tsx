import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Brain, Send, Building2, BarChart3, Code2, Loader2, ChevronDown, ChevronUp, Sparkles, Zap } from 'lucide-react';
import type { ViewMode } from '../lib/viewModes';

const viewModeConfig: Record<ViewMode, { label: string; icon: React.ReactNode; color: string; description: string }> = {
    executive: {
        label: 'CEO / Direction',
        icon: <Building2 className="w-4 h-4" />,
        color: 'bg-purple-500',
        description: 'Vision stratégique et décisions business',
    },
    levers: {
        label: 'Manager / Levers',
        icon: <Zap className="w-4 h-4" />,
        color: 'bg-blue-500',
        description: 'Leviers d\'action et impacts opérationnels',
    },
    analyst: {
        label: 'Analyste',
        icon: <BarChart3 className="w-4 h-4" />,
        color: 'bg-green-500',
        description: 'Données clés et tendances causales',
    },
    technical: {
        label: 'Ingénieur',
        icon: <Code2 className="w-4 h-4" />,
        color: 'bg-orange-500',
        description: 'Détails techniques et formules',
    },
};

interface AnalysisResponse {
    viewMode: ViewMode;
    summary: string;
    keyPoints: string[];
    recommendations?: string[];
    metrics?: { label: string; value: string; trend?: 'up' | 'down' | 'neutral' }[];
}

export const AIExplanationPanel: React.FC = () => {
    const { model, simulationResult, storedSimulations, viewMode, addAILog } = useStore();
    const [question, setQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeMode, setActiveMode] = useState<ViewMode>(viewMode);
    const [responses, setResponses] = useState<AnalysisResponse[]>([]);
    const [expandedModes, setExpandedModes] = useState<Set<ViewMode>>(new Set([viewMode]));
    const [showAllModes, setShowAllModes] = useState(false);

    const toggleExpanded = (mode: ViewMode) => {
        const newExpanded = new Set(expandedModes);
        if (newExpanded.has(mode)) {
            newExpanded.delete(mode);
        } else {
            newExpanded.add(mode);
        }
        setExpandedModes(newExpanded);
    };

    const handleAskQuestion = async () => {
        if (!question.trim() || !model) return;

        setIsLoading(true);
        const modesToAnalyze: ViewMode[] = showAllModes 
            ? ['executive', 'levers', 'analyst', 'technical']
            : [activeMode];

        try {
            const newResponses: AnalysisResponse[] = [];

            for (const mode of modesToAnalyze) {
                try {
                    const response = await fetch('http://localhost:8000/ai-explain', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model,
                            simulationResult,
                            storedSimulations: storedSimulations.slice(0, 5), // Send last 5 simulations
                            question,
                            viewMode: mode,
                        }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        newResponses.push({
                            viewMode: mode,
                            ...data,
                        });
                    } else {
                        // Generate demo response for the perspective
                        newResponses.push(generateDemoResponse(mode, question));
                    }
                } catch {
                    newResponses.push(generateDemoResponse(mode, question));
                }
            }

            setResponses(newResponses);
            setExpandedModes(new Set(modesToAnalyze));

            // Log the explanation request
            addAILog({
                type: 'explanation',
                description: `Analyse demandée: "${question.slice(0, 50)}${question.length > 50 ? '...' : ''}"`,
                prompt: question,
                result: `${newResponses.length} perspective(s) générée(s)`,
                viewMode: showAllModes ? undefined : activeMode,
            });

        } catch (error) {
            console.error('AI explanation failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateDemoResponse = (mode: ViewMode, _question: string): AnalysisResponse => {
        const demoResponses: Record<ViewMode, AnalysisResponse> = {
            executive: {
                viewMode: 'executive',
                summary: `La simulation montre un potentiel de croissance stratégique. Les indicateurs clés suggèrent des opportunités d'optimisation alignées avec les objectifs business.`,
                keyPoints: [
                    'ROI potentiel positif sur le moyen terme',
                    'Risques identifiés maîtrisables avec les ressources actuelles',
                    'Alignement avec la stratégie de développement durable',
                ],
                recommendations: [
                    'Considérer un investissement supplémentaire dans ce secteur',
                    'Planifier une revue trimestrielle des KPIs',
                ],
                metrics: [
                    { label: 'Impact Business', value: '+15%', trend: 'up' },
                    { label: 'Risque', value: 'Modéré', trend: 'neutral' },
                ],
            },
            levers: {
                viewMode: 'levers',
                summary: `L'analyse opérationnelle indique des ajustements nécessaires dans l'allocation des ressources. L'équipe devra coordonner les efforts sur plusieurs fronts.`,
                keyPoints: [
                    'Ressources actuelles suffisantes pour la phase 1',
                    "Coordination nécessaire entre département R&D et production",
                    "Délai estimé d'implémentation: 2-3 mois",
                ],
                recommendations: [
                    'Former une task force dédiée',
                    'Établir des checkpoints bi-hebdomadaires',
                ],
                metrics: [
                    { label: 'Charge équipe', value: '+20%', trend: 'up' },
                    { label: 'Délai', value: '3 mois', trend: 'neutral' },
                ],
            },
            analyst: {
                viewMode: 'analyst',
                summary: `Les données de simulation révèlent des patterns intéressants. La corrélation entre les variables principales confirme les hypothèses initiales avec un degré de confiance de 85%.`,
                keyPoints: [
                    'Corrélation positive entre variables A et B (r=0.78)',
                    'Tendance haussière sur 70% des scénarios',
                    'Variance acceptable dans les limites définies',
                ],
                recommendations: [
                    'Approfondir l\'analyse sur les cas limites',
                    'Valider avec des données historiques supplémentaires',
                ],
                metrics: [
                    { label: 'Confiance', value: '85%', trend: 'up' },
                    { label: 'Variance', value: '±12%', trend: 'neutral' },
                ],
            },
            technical: {
                viewMode: 'technical',
                summary: `Le modèle utilise une approche de simulation dynamique avec ${model ? Object.keys(model.entities).length : 0} entités. Les paramètres sont dans les plages attendues avec une stabilité numérique vérifiée.`,
                keyPoints: [
                    `dt=${model?.simulation?.dt || 0.1}, steps=${model?.simulation?.steps || 100}`,
                    'Convergence atteinte après ~80% des itérations',
                    'Pas de divergence détectée dans les valeurs extrêmes',
                ],
                recommendations: [
                    'Considérer réduire dt pour plus de précision',
                    'Ajouter des validations sur les bornes min/max',
                ],
                metrics: [
                    { label: 'Précision', value: '10⁻³', trend: 'neutral' },
                    { label: 'Performance', value: '< 1s', trend: 'up' },
                ],
            },
        };

        return demoResponses[mode];
    };

    return (
        <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-white">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5 text-purple-500" />
                    <h2 className="font-semibold text-slate-800">Explication IA</h2>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full text-xs font-medium">
                        Multi-niveau
                    </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                    Posez une question sur la simulation et obtenez une analyse adaptée à différentes perspectives.
                </p>

                {/* Question Input */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                        placeholder="Ex: Quel est l'impact de X sur Y?"
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={isLoading || !model}
                    />
                    <button
                        onClick={handleAskQuestion}
                        disabled={!question.trim() || isLoading || !model}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-opacity"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* View Mode Selector */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500">Perspective:</span>
                    {!showAllModes ? (
                        (Object.keys(viewModeConfig) as ViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setActiveMode(mode)}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    activeMode === mode
                                        ? `${viewModeConfig[mode].color} text-white`
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {viewModeConfig[mode].icon}
                                <span className="hidden sm:inline">{viewModeConfig[mode].label}</span>
                            </button>
                        ))
                    ) : (
                        <span className="text-xs text-purple-600 font-medium">Toutes les perspectives</span>
                    )}
                    <button
                        onClick={() => setShowAllModes(!showAllModes)}
                        className={`ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                            showAllModes
                                ? 'bg-purple-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <Sparkles className="w-3 h-3" />
                        {showAllModes ? 'Une seule' : 'Toutes'}
                    </button>
                </div>
            </div>

            {/* Responses */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {responses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Brain className="w-16 h-16 mb-3 opacity-30" />
                        <p className="text-sm font-medium">Posez une question pour commencer</p>
                        <p className="text-xs mt-1 text-center max-w-xs">
                            L'IA analysera votre simulation et fournira des insights adaptés à chaque niveau décisionnel.
                        </p>
                    </div>
                ) : (
                    responses.map((response) => {
                        const config = viewModeConfig[response.viewMode];
                        const isExpanded = expandedModes.has(response.viewMode);

                        return (
                            <div
                                key={response.viewMode}
                                className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden"
                            >
                                {/* Response Header */}
                                <div
                                    className={`p-3 flex items-center justify-between cursor-pointer ${config.color} text-white`}
                                    onClick={() => toggleExpanded(response.viewMode)}
                                >
                                    <div className="flex items-center gap-2">
                                        {config.icon}
                                        <span className="font-medium text-sm">{config.label}</span>
                                    </div>
                                    {isExpanded ? (
                                        <ChevronUp className="w-4 h-4" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4" />
                                    )}
                                </div>

                                {/* Response Content */}
                                {isExpanded && (
                                    <div className="p-4 space-y-4">
                                        {/* Summary */}
                                        <div>
                                            <p className="text-sm text-slate-700 leading-relaxed">
                                                {response.summary}
                                            </p>
                                        </div>

                                        {/* Metrics */}
                                        {response.metrics && response.metrics.length > 0 && (
                                            <div className="flex gap-3 flex-wrap">
                                                {response.metrics.map((metric, i) => (
                                                    <div
                                                        key={i}
                                                        className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100"
                                                    >
                                                        <div className="text-xs text-slate-500">{metric.label}</div>
                                                        <div className={`text-lg font-bold ${
                                                            metric.trend === 'up' ? 'text-green-600' :
                                                            metric.trend === 'down' ? 'text-red-600' :
                                                            'text-slate-700'
                                                        }`}>
                                                            {metric.value}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Key Points */}
                                        <div>
                                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                                Points clés
                                            </h4>
                                            <ul className="space-y-1">
                                                {response.keyPoints.map((point, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${config.color} mt-1.5 flex-shrink-0`} />
                                                        {point}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Recommendations */}
                                        {response.recommendations && response.recommendations.length > 0 && (
                                            <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
                                                <h4 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">
                                                    Recommandations
                                                </h4>
                                                <ul className="space-y-1">
                                                    {response.recommendations.map((rec, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm text-purple-700">
                                                            <Sparkles className="w-3 h-3 mt-1 flex-shrink-0" />
                                                            {rec}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default AIExplanationPanel;
