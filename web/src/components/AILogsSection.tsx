import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import type { AILogEntry } from '../store/useStore';
import { ScrollText, Trash2, ChevronDown, ChevronUp, Wand2, FileText, BarChart3, Brain, Clock } from 'lucide-react';

const LogTypeIcon: React.FC<{ type: AILogEntry['type'] }> = ({ type }) => {
    switch (type) {
        case 'edit':
            return <Wand2 className="w-4 h-4 text-purple-500" />;
        case 'generation':
            return <FileText className="w-4 h-4 text-blue-500" />;
        case 'explanation':
            return <Brain className="w-4 h-4 text-green-500" />;
        case 'analysis':
            return <BarChart3 className="w-4 h-4 text-orange-500" />;
        default:
            return <ScrollText className="w-4 h-4 text-gray-500" />;
    }
};

const LogTypeLabel: React.FC<{ type: AILogEntry['type'] }> = ({ type }) => {
    const colors: Record<string, string> = {
        edit: 'bg-purple-100 text-purple-700',
        generation: 'bg-blue-100 text-blue-700',
        explanation: 'bg-green-100 text-green-700',
        analysis: 'bg-orange-100 text-orange-700',
    };
    const labels: Record<string, string> = {
        edit: 'Édition',
        generation: 'Génération',
        explanation: 'Explication',
        analysis: 'Analyse',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
            {labels[type] || type}
        </span>
    );
};

const LogEntry: React.FC<{ log: AILogEntry }> = ({ log }) => {
    const [expanded, setExpanded] = useState(false);
    
    const formatTime = (date: Date) => {
        const d = new Date(date);
        return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="border border-slate-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
            <div 
                className="p-3 flex items-start gap-3 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <LogTypeIcon type={log.type} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <LogTypeLabel type={log.type} />
                        {log.target && (
                            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                {log.target}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">{log.description}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(log.timestamp)}</span>
                    </div>
                </div>
                <button className="p-1 hover:bg-slate-100 rounded">
                    {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
            </div>
            
            {expanded && (
                <div className="px-3 pb-3 pt-0 border-t border-slate-100 mt-0">
                    <div className="mt-3 space-y-2 text-xs">
                        {log.prompt && (
                            <div>
                                <span className="font-medium text-slate-500">Prompt:</span>
                                <p className="mt-1 p-2 bg-slate-50 rounded text-slate-600 font-mono whitespace-pre-wrap">
                                    {log.prompt}
                                </p>
                            </div>
                        )}
                        
                        {log.changes && log.changes.length > 0 && (
                            <div>
                                <span className="font-medium text-slate-500">Changements:</span>
                                <ul className="mt-1 space-y-1">
                                    {log.changes.map((change, i) => (
                                        <li key={i} className="p-2 bg-slate-50 rounded flex items-center gap-2">
                                            <span className="font-mono text-slate-600">{change.field}:</span>
                                            <span className="text-red-500 line-through">{String(change.oldValue)}</span>
                                            <span className="text-slate-400">→</span>
                                            <span className="text-green-600 font-semibold">{String(change.newValue)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        {log.result && (
                            <div>
                                <span className="font-medium text-slate-500">Résultat:</span>
                                <p className="mt-1 p-2 bg-green-50 rounded text-green-700 whitespace-pre-wrap">
                                    {log.result}
                                </p>
                            </div>
                        )}

                        {log.viewMode && (
                            <div className="text-slate-400">
                                Mode de vue: <span className="font-medium">{log.viewMode}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const AILogsSection: React.FC = () => {
    const { aiLogs, clearAILogs } = useStore();
    const [filter, setFilter] = useState<AILogEntry['type'] | 'all'>('all');

    const filteredLogs = filter === 'all' 
        ? aiLogs 
        : aiLogs.filter(log => log.type === filter);

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <ScrollText className="w-5 h-5 text-slate-600" />
                        <h2 className="font-semibold text-slate-800">Logs IA</h2>
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs text-slate-500">
                            {aiLogs.length} entrées
                        </span>
                    </div>
                    {aiLogs.length > 0 && (
                        <button
                            onClick={clearAILogs}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                            <Trash2 className="w-3 h-3" />
                            Effacer
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex gap-1">
                    {(['all', 'edit', 'generation', 'explanation', 'analysis'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                filter === type 
                                    ? 'bg-slate-700 text-white' 
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {type === 'all' ? 'Tous' : type === 'edit' ? 'Éditions' : type === 'generation' ? 'Générations' : type === 'explanation' ? 'Explications' : 'Analyses'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <ScrollText className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm">Aucun log IA</p>
                        <p className="text-xs mt-1">Les actions IA seront enregistrées ici</p>
                    </div>
                ) : (
                    filteredLogs.map((log) => (
                        <LogEntry key={log.id} log={log} />
                    ))
                )}
            </div>
        </div>
    );
};

export default AILogsSection;
