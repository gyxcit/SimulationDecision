import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import type { AILogEntry } from '../store/useStore';
import { 
    ScrollText, Trash2, ChevronDown, ChevronUp, Wand2, FileText, 
    BarChart3, Brain, Clock, Search, Filter, Download, Calendar 
} from 'lucide-react';

const LogTypeIcon: React.FC<{ type: AILogEntry['type'] }> = ({ type }) => {
    switch (type) {
        case 'edit':
            return <Wand2 className="w-5 h-5 text-purple-500" />;
        case 'generation':
            return <FileText className="w-5 h-5 text-blue-500" />;
        case 'explanation':
            return <Brain className="w-5 h-5 text-green-500" />;
        case 'analysis':
            return <BarChart3 className="w-5 h-5 text-orange-500" />;
        default:
            return <ScrollText className="w-5 h-5 text-gray-500" />;
    }
};

const LogTypeLabel: React.FC<{ type: AILogEntry['type'] }> = ({ type }) => {
    const colors: Record<string, string> = {
        edit: 'bg-purple-100 text-purple-700 border-purple-200',
        generation: 'bg-blue-100 text-blue-700 border-blue-200',
        explanation: 'bg-green-100 text-green-700 border-green-200',
        analysis: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    const labels: Record<string, string> = {
        edit: 'Édition IA',
        generation: 'Génération',
        explanation: 'Explication',
        analysis: 'Analyse',
    };
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[type] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
            {labels[type] || type}
        </span>
    );
};

const LogEntry: React.FC<{ log: AILogEntry; isLarge?: boolean }> = ({ log, isLarge = false }) => {
    const [expanded, setExpanded] = useState(false);
    
    const formatTime = (date: Date) => {
        const d = new Date(date);
        return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatDate = (date: Date) => {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className={`border border-slate-200 rounded-xl bg-white hover:shadow-md transition-all ${isLarge ? 'p-5' : 'p-4'}`}>
            <div 
                className="flex items-start gap-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className={`p-3 rounded-xl bg-slate-50 ${isLarge ? '' : ''}`}>
                    <LogTypeIcon type={log.type} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <LogTypeLabel type={log.type} />
                        {log.target && (
                            <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded-lg text-slate-700 border border-slate-200">
                                {log.target}
                            </span>
                        )}
                    </div>
                    <p className={`text-slate-700 ${isLarge ? 'text-base' : 'text-sm'} ${expanded ? '' : 'line-clamp-2'}`}>
                        {log.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(log.timestamp)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(log.timestamp)}</span>
                        </div>
                        {log.viewMode && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-500">
                                Mode: {log.viewMode}
                            </span>
                        )}
                    </div>
                </div>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    {expanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                </button>
            </div>
            
            {expanded && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                    {log.prompt && (
                        <div>
                            <span className="font-semibold text-sm text-slate-600 block mb-2">
                                Prompt utilisé:
                            </span>
                            <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 font-mono whitespace-pre-wrap border border-slate-200">
                                {log.prompt}
                            </div>
                        </div>
                    )}
                    
                    {log.changes && log.changes.length > 0 && (
                        <div>
                            <span className="font-semibold text-sm text-slate-600 block mb-2">
                                Changements appliqués:
                            </span>
                            <div className="space-y-2">
                                {log.changes.map((change, i) => (
                                    <div key={i} className="p-3 bg-slate-50 rounded-xl flex items-center gap-3 border border-slate-200">
                                        <span className="font-mono text-sm text-slate-600 bg-white px-2 py-1 rounded border">
                                            {change.field}
                                        </span>
                                        <span className="text-red-500 line-through text-sm">{String(change.oldValue)}</span>
                                        <span className="text-slate-400">→</span>
                                        <span className="text-green-600 font-semibold text-sm">{String(change.newValue)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {log.result && (
                        <div>
                            <span className="font-semibold text-sm text-slate-600 block mb-2">
                                Résultat:
                            </span>
                            <div className="p-4 bg-green-50 rounded-xl text-sm text-green-700 whitespace-pre-wrap border border-green-200">
                                {log.result}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const AILogsPage: React.FC = () => {
    const { aiLogs, clearAILogs } = useStore();
    const [filter, setFilter] = useState<AILogEntry['type'] | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredLogs = aiLogs
        .filter(log => filter === 'all' || log.type === filter)
        .filter(log => 
            searchQuery === '' || 
            log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.target?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const exportLogs = () => {
        const data = JSON.stringify(aiLogs, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const stats = {
        total: aiLogs.length,
        edits: aiLogs.filter(l => l.type === 'edit').length,
        generations: aiLogs.filter(l => l.type === 'generation').length,
        explanations: aiLogs.filter(l => l.type === 'explanation').length,
        analyses: aiLogs.filter(l => l.type === 'analysis').length,
    };

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl shadow-lg">
                                <ScrollText className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">Logs IA</h1>
                                <p className="text-sm text-slate-500">Historique des interactions avec l'IA</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={exportLogs}
                                disabled={aiLogs.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Exporter
                            </button>
                            {aiLogs.length > 0 && (
                                <button
                                    onClick={clearAILogs}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Effacer tout
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-5 gap-4 mb-6">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
                            <div className="text-xs text-slate-500 mt-1">Total</div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                            <div className="text-3xl font-bold text-purple-700">{stats.edits}</div>
                            <div className="text-xs text-purple-500 mt-1">Éditions</div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <div className="text-3xl font-bold text-blue-700">{stats.generations}</div>
                            <div className="text-xs text-blue-500 mt-1">Générations</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                            <div className="text-3xl font-bold text-green-700">{stats.explanations}</div>
                            <div className="text-xs text-green-500 mt-1">Explications</div>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                            <div className="text-3xl font-bold text-orange-700">{stats.analyses}</div>
                            <div className="text-xs text-orange-500 mt-1">Analyses</div>
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="flex gap-4 items-center">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher dans les logs..."
                                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-slate-400" />
                            {(['all', 'edit', 'generation', 'explanation', 'analysis'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFilter(type)}
                                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                                        filter === type 
                                            ? 'bg-slate-800 text-white' 
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {type === 'all' ? 'Tous' : 
                                     type === 'edit' ? 'Éditions' : 
                                     type === 'generation' ? 'Générations' : 
                                     type === 'explanation' ? 'Explications' : 'Analyses'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto space-y-4">
                    {filteredLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <ScrollText className="w-20 h-20 mb-4 opacity-30" />
                            <p className="text-lg font-medium">Aucun log IA</p>
                            <p className="text-sm mt-2">Les interactions avec l'IA seront enregistrées ici</p>
                        </div>
                    ) : (
                        filteredLogs.map((log) => (
                            <LogEntry key={log.id} log={log} isLarge />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AILogsPage;
