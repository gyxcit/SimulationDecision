import React, { useState } from 'react';
import { Box, Settings, ChevronRight, ChevronLeft, ChevronDown, Circle, Layers, Activity, Search, X, Play, BarChart3 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import type { Entity } from '../types';
import { SimulationConfig } from './SimulationConfig';
import { SimulationsPanel } from './SimulationsPanel';
import { VisualizationPanel } from './VisualizationPanel';

type Section = 'entities' | 'simulation' | 'simulations' | 'visualization' | null;

interface NavigatorProps {
    onViewChange?: (view: 'canvas' | 'simulations' | 'visualization') => void;
    currentView?: 'canvas' | 'simulations' | 'visualization';
}

export const Navigator: React.FC<NavigatorProps> = ({ onViewChange, currentView = 'canvas' }) => {
    const [activeSection, setActiveSection] = useState<Section>('entities');
    const [isPanelExpanded, setIsPanelExpanded] = useState(true);

    const toggleSection = (section: Section) => {
        setActiveSection(activeSection === section ? null : section);
        if (!isPanelExpanded && section) {
            setIsPanelExpanded(true);
        }

        // Notify App of view change
        if (onViewChange) {
            if (section === 'simulations') {
                onViewChange('simulations');
            } else if (section === 'visualization') {
                onViewChange('visualization');
            } else {
                onViewChange('canvas');
            }
        }
    };

    return (
        <div className="h-full flex">
            {/* Icon Bar - Always Visible */}
            <div className="w-12 bg-card flex flex-col">
                <div className="px-2 py-2 border-b flex items-center justify-center">
                    {activeSection && (
                        <button
                            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                            className="p-1 hover:bg-accent rounded transition-colors"
                            title={isPanelExpanded ? "Réduire le panneau" : "Étendre le panneau"}
                        >
                            {isPanelExpanded ? (
                                <ChevronLeft className="w-4 h-4" />
                            ) : (
                                <ChevronRight className="w-4 h-4" />
                            )}
                        </button>
                    )}
                </div>

                {/* Section Icons */}
                <div className="flex-1 flex flex-col gap-1 p-2">
                    <IconButton
                        icon={<Box className="w-5 h-5" />}
                        title="Entités"
                        isActive={activeSection === 'entities'}
                        onClick={() => toggleSection('entities')}
                    />
                    <IconButton
                        icon={<Settings className="w-5 h-5" />}
                        title="Simulation & Unités"
                        isActive={activeSection === 'simulation'}
                        onClick={() => toggleSection('simulation')}
                    />
                    <IconButton
                        icon={<Play className="w-5 h-5" />}
                        title="Multi-Simulations"
                        isActive={activeSection === 'simulations'}
                        onClick={() => toggleSection('simulations')}
                    />
                    <IconButton
                        icon={<BarChart3 className="w-5 h-5" />}
                        title="Visualisation & Analyse"
                        isActive={activeSection === 'visualization'}
                        onClick={() => toggleSection('visualization')}
                    />
                </div>
            </div>

            {/* Side Panel - Slides in when section is active */}
            {activeSection && isPanelExpanded && 
             !(activeSection === 'simulations' && currentView === 'simulations') &&
             !(activeSection === 'visualization' && currentView === 'visualization') && (
                <div className={cn(
                    "w-64 border-r bg-card flex flex-col transition-all duration-300",
                    "animate-in slide-in-from-left resize-x overflow-auto"
                )}
                    style={{ minWidth: '150px', maxWidth: '500px' }}
                >
                    {activeSection === 'entities' && <EntitiesPanel />}
                    {activeSection === 'simulation' && <SimulationPanel />}
                    {activeSection === 'simulations' && <SimulationsPanel />}
                    {activeSection === 'visualization' && <VisualizationPanel />}
                </div>
            )}
        </div>
    );
};

interface IconButtonProps {
    icon: React.ReactNode;
    title: string;
    isActive: boolean;
    onClick: () => void;
}

const IconButton: React.FC<IconButtonProps> = ({ icon, title, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            title={title}
            className={cn(
                "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground"
            )}
        >
            {icon}
        </button>
    );
};

// ============ PANELS ============

const EntitiesPanel: React.FC = () => {
    const { model, selectedNode, selectNode } = useStore();
    const [expandedEntities, setExpandedEntities] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');

    const toggleEntity = (name: string) => {
        setExpandedEntities(prev => ({ ...prev, [name]: !prev[name] }));
    };

    if (!model) {
        return (
            <div className="p-4 text-sm text-muted-foreground text-center">
                No model loaded
            </div>
        );
    }

    const filteredEntities = Object.entries(model.entities).filter(([name, entity]) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        if (name.toLowerCase().includes(query)) return true;
        return Object.keys(entity.components).some(compName =>
            compName.toLowerCase().includes(query)
        );
    });

    return (
        <>
            {/* Header */}
            <div className="px-3 py-2 border-b">
                <h2 className="text-sm font-semibold">Entités</h2>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-full pl-8 pr-2 py-1.5 text-sm rounded-md border bg-background focus:ring-2 ring-primary outline-none"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Entity List */}
            <div className="flex-1 overflow-y-auto py-2">
                <div className="space-y-1">
                    {filteredEntities.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground text-center italic">
                            No entities found
                        </div>
                    ) : (
                        filteredEntities.map(([name, entity]) => (
                            <EntityItem
                                key={name}
                                name={name}
                                entity={entity}
                                isExpanded={!!expandedEntities[name]}
                                onToggle={() => toggleEntity(name)}
                                selectedId={selectedNode}
                                onSelect={selectNode}
                                searchQuery={searchQuery}
                            />
                        ))
                    )}
                </div>
            </div>
        </>
    );
};

const SimulationPanel: React.FC = () => {
    return (
        <>
            <div className="px-3 py-2 border-b">
                <h2 className="text-sm font-semibold">Paramètres de Simulation</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
                <SimulationConfig />
            </div>
        </>
    );
};



// ============ ENTITY ITEM ============

interface EntityItemProps {
    name: string;
    entity: Entity;
    isExpanded: boolean;
    onToggle: () => void;
    selectedId: string | null;
    onSelect: (id: string) => void;
    searchQuery: string;
}

const EntityItem: React.FC<EntityItemProps> = ({
    name, entity, isExpanded, onToggle, selectedId, onSelect, searchQuery
}) => {
    const isActive = selectedId === name || selectedId?.startsWith(name + '.');

    const highlightText = (text: string) => {
        if (!searchQuery) return text;
        const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === searchQuery.toLowerCase() ? (
                <mark key={i} className="bg-yellow-200 text-foreground">{part}</mark>
            ) : part
        );
    };

    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-2 px-4 py-1.5 cursor-pointer hover:bg-accent/50 text-sm",
                    selectedId === name && "bg-accent text-accent-foreground font-medium",
                    isActive && selectedId !== name && "bg-accent/30"
                )}
                onClick={() => onSelect(name)}
            >
                <button
                    onClick={(e) => { e.stopPropagation(); onToggle(); }}
                    className="p-0.5 hover:bg-black/10 rounded"
                >
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                <Box className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="truncate">{highlightText(name)}</span>
            </div>

            {isExpanded && (
                <div className="pl-4">
                    {Object.entries(entity.components).map(([compName, comp]) => (
                        <div
                            key={compName}
                            className={cn(
                                "flex items-center gap-2 px-6 py-1 cursor-pointer hover:bg-accent/50 text-sm",
                                selectedId === `${name}.${compName}` && "bg-accent text-accent-foreground"
                            )}
                            onClick={() => onSelect(`${name}.${compName}`)}
                        >
                            {comp.type === 'state' && <Circle className="w-3 h-3 text-green-500 fill-current flex-shrink-0" />}
                            {comp.type === 'computed' && <Activity className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                            {comp.type === 'constant' && <Layers className="w-3 h-3 text-gray-500 flex-shrink-0" />}
                            <span className="truncate flex-1">{highlightText(compName)}</span>
                            <span className="text-xs text-muted-foreground">
                                {comp.initial.toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
