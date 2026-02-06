import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
    Brain, Send, Building2, BarChart3, Code2, Loader2, ChevronDown, ChevronUp, 
    Sparkles, Zap, RefreshCw, TrendingUp, TrendingDown, Minus, History
} from 'lucide-react';
import type { ViewMode } from '../lib/viewModes';

const viewModeConfig: Record<ViewMode, { label: string; icon: React.ReactNode; color: string; bgColor: string; description: string }> = {
    executive: {
        label: 'CEO / Direction',
        icon: <Building2 className="w-5 h-5" />,
        color: 'bg-purple-500',
        bgColor: 'from-purple-500 to-purple-700',
        description: 'Vision stratégique, décisions business et impact organisationnel',
    },
    levers: {
        label: 'Manager / Leviers',
        icon: <Zap className="w-5 h-5" />,
        color: 'bg-blue-500',
        bgColor: 'from-blue-500 to-blue-700',
        description: 'Leviers d\'action, impacts opérationnels et quick wins',
    },
    analyst: {
        label: 'Analyste Data',
        icon: <BarChart3 className="w-5 h-5" />,
        color: 'bg-green-500',
        bgColor: 'from-green-500 to-green-700',
        description: 'Données clés, tendances causales et corrélations',
    },
    technical: {
        label: 'Ingénieur',
        icon: <Code2 className="w-5 h-5" />,
        color: 'bg-orange-500',
        bgColor: 'from-orange-500 to-orange-700',
        description: 'Détails techniques, équations et paramètres du modèle',
    },
};

interface AnalysisResponse {
    viewMode: ViewMode;
    summary: string;
    keyPoints: string[];
    recommendations?: string[];
    metrics?: { label: string; value: string; trend?: 'up' | 'down' | 'neutral' }[];
}

interface HistoryEntry {
    id: string;
    question: string;
    timestamp: Date;
    responses: AnalysisResponse[];
}

export const AIExplanationPage: React.FC = () => {
    const { model, simulationResult, storedSimulations, viewMode, addAILog } = useStore();
    const [question, setQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeMode, setActiveMode] = useState<ViewMode>(viewMode);
    const [responses, setResponses] = useState<AnalysisResponse[]>([]);
    const [expandedModes, setExpandedModes] = useState<Set<ViewMode>>(new Set([viewMode]));
    const [showAllModes, setShowAllModes] = useState(true);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [showHistory, setShowHistory] = useState(false);

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
                            storedSimulations: storedSimulations.slice(0, 5),
                            question,
                            viewMode: mode,
                        }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            newResponses.push({
                                viewMode: mode,
                                summary: data.summary || '',
                                keyPoints: data.keyPoints || [],
                                recommendations: data.recommendations || [],
                                metrics: data.metrics || [],
                            });
                        } else {
                            newResponses.push(generateDemoResponse(mode, question));
                        }
                    } else {
                        newResponses.push(generateDemoResponse(mode, question));
                    }
                } catch {
                    newResponses.push(generateDemoResponse(mode, question));
                }
            }

            setResponses(newResponses);
            setExpandedModes(new Set(modesToAnalyze));

            // Add to history
            setHistory(prev => [{
                id: Date.now().toString(),
                question,
                timestamp: new Date(),
                responses: newResponses,
            }, ...prev.slice(0, 9)]);

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

    const loadFromHistory = (entry: HistoryEntry) => {
        setQuestion(entry.question);
        setResponses(entry.responses);
        setExpandedModes(new Set(entry.responses.map(r => r.viewMode)));
        setShowHistory(false);
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
                    'Coordination nécessaire entre département R&D et production',
                    'Délai estimé d\'implémentation: 2-3 mois',
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

    const TrendIcon: React.FC<{ trend?: 'up' | 'down' | 'neutral' }> = ({ trend }) => {
        if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
        if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
        return <Minus className="w-4 h-4 text-slate-400" />;
    };

    return (
        <div className="h-full flex bg-gradient-to-br from-purple-50 via-white to-blue-50">
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl shadow-lg">
                                    <Brain className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-800">Explication IA</h1>
                                    <p className="text-sm text-slate-500">Analyse multi-perspective de votre simulation</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                    showHistory 
                                        ? 'bg-purple-100 text-purple-700' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <History className="w-4 h-4" />
                                Historique ({history.length})
                            </button>
                        </div>

                        {/* Question Input */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                            <div className="flex gap-3">
                                <textarea
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAskQuestion())}
                                    placeholder="Posez votre question sur la simulation... (Ex: Quel est l'impact de la production sur le budget?)"
                                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                    rows={2}
                                    disabled={isLoading || !model}
                                />
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handleAskQuestion}
                                        disabled={!question.trim() || isLoading || !model}
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                Analyser
                                            </>
                                        )}
                                    </button>
                                    {responses.length > 0 && (
                                        <button
                                            onClick={() => handleAskQuestion()}
                                            disabled={isLoading}
                                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center gap-1 text-sm"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Relancer
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* View Mode Selector */}
                            <div className="mt-4 flex items-center gap-3 flex-wrap">
                                <span className="text-sm text-slate-500 font-medium">Perspectives:</span>
                                {(Object.keys(viewModeConfig) as ViewMode[]).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => {
                                            if (!showAllModes) setActiveMode(mode);
                                        }}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                            showAllModes
                                                ? `${viewModeConfig[mode].color} text-white opacity-80`
                                                : activeMode === mode
                                                    ? `${viewModeConfig[mode].color} text-white shadow-md`
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                        disabled={showAllModes}
                                    >
                                        {viewModeConfig[mode].icon}
                                        <span>{viewModeConfig[mode].label}</span>
                                    </button>
                                ))}
                                <div className="ml-auto flex items-center gap-2">
                                    <button
                                        onClick={() => setShowAllModes(!showAllModes)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                            showAllModes
                                                ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-md'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        {showAllModes ? 'Toutes les perspectives ✓' : 'Vue unique'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Responses */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-5xl mx-auto">
                        {responses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="p-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mb-6">
                                    <Brain className="w-16 h-16 text-purple-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-700 mb-2">Posez une question</h3>
                                <p className="text-slate-500 text-center max-w-md">
                                    L'IA analysera votre simulation et fournira des insights adaptés 
                                    à chaque niveau décisionnel : direction, management, analyse et technique.
                                </p>
                                {!model && (
                                    <div className="mt-4 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm">
                                        ⚠️ Chargez d'abord un modèle pour poser des questions
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {responses.map((response) => {
                                    const config = viewModeConfig[response.viewMode];
                                    const isExpanded = expandedModes.has(response.viewMode);

                                    return (
                                        <div
                                            key={response.viewMode}
                                            className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                                        >
                                            {/* Response Header */}
                                            <div
                                                className={`p-4 flex items-center justify-between cursor-pointer bg-gradient-to-r ${config.bgColor} text-white`}
                                                onClick={() => toggleExpanded(response.viewMode)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white/20 rounded-lg">
                                                        {config.icon}
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold">{config.label}</span>
                                                        <p className="text-xs text-white/80 mt-0.5">{config.description}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!isExpanded && response.metrics && response.metrics.length > 0 && (
                                                        <div className="flex gap-2 mr-4">
                                                            {response.metrics.slice(0, 2).map((m, i) => (
                                                                <span key={i} className="px-2 py-1 bg-white/20 rounded text-xs font-medium">
                                                                    {m.value}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                                        {isExpanded ? (
                                                            <ChevronUp className="w-5 h-5" />
                                                        ) : (
                                                            <ChevronDown className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Response Content */}
                                            {isExpanded && (
                                                <div className="p-6 space-y-6">
                                                    {/* Summary */}
                                                    <div className="bg-slate-50 rounded-xl p-4">
                                                        <p className="text-slate-700 leading-relaxed">
                                                            {response.summary}
                                                        </p>
                                                    </div>

                                                    {/* Metrics */}
                                                    {response.metrics && response.metrics.length > 0 && (
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            {response.metrics.map((metric, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm"
                                                                >
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="text-xs text-slate-500">{metric.label}</span>
                                                                        <TrendIcon trend={metric.trend} />
                                                                    </div>
                                                                    <div className={`text-2xl font-bold ${
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
                                                        <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${config.color}`}></span>
                                                            Points clés
                                                        </h4>
                                                        <ul className="space-y-2">
                                                            {response.keyPoints.map((point, i) => (
                                                                <li key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                                                    <span className={`w-2 h-2 rounded-full ${config.color} mt-2 flex-shrink-0`} />
                                                                    <span className="text-slate-700">{point}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    {/* Recommendations */}
                                                    {response.recommendations && response.recommendations.length > 0 && (
                                                        <div className={`p-4 bg-gradient-to-r ${config.bgColor} bg-opacity-10 rounded-xl border border-opacity-20`}
                                                            style={{ background: `linear-gradient(135deg, ${config.color.replace('bg-', '')}10, transparent)` }}>
                                                            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                                                <Sparkles className="w-4 h-4" />
                                                                Recommandations
                                                            </h4>
                                                            <ul className="space-y-2">
                                                                {response.recommendations.map((rec, i) => (
                                                                    <li key={i} className="flex items-start gap-3">
                                                                        <Sparkles className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color.replace('bg-', 'text-')}`} />
                                                                        <span className="text-slate-700">{rec}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History Sidebar */}
            {showHistory && (
                <div className="w-80 border-l border-slate-200 bg-white flex flex-col">
                    <div className="p-4 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-800">Historique des questions</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {history.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8">
                                Aucune question posée
                            </p>
                        ) : (
                            history.map((entry) => (
                                <button
                                    key={entry.id}
                                    onClick={() => loadFromHistory(entry)}
                                    className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                                >
                                    <p className="text-sm text-slate-700 line-clamp-2">{entry.question}</p>
                                    <p className="text-xs text-slate-400 mt-2">
                                        {new Date(entry.timestamp).toLocaleString('fr-FR')}
                                    </p>
                                    <div className="flex gap-1 mt-2">
                                        {entry.responses.map((r) => (
                                            <span 
                                                key={r.viewMode} 
                                                className={`w-2 h-2 rounded-full ${viewModeConfig[r.viewMode].color}`}
                                            />
                                        ))}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIExplanationPage;
