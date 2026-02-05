import React from 'react';
import { ChevronRight, ChevronDown, Circle, Box, Layers, Activity, Search, Menu, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import type { Entity } from '../types';

export const Navigator: React.FC = () => {
    const { model, selectedNode, selectNode } = useStore();
    const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = React.useState('');
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    const toggleExpand = (name: string) => {
        setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
    };

    if (!model) return (
        <div className={cn(
            "h-full overflow-y-auto py-2 transition-all duration-300 border-r bg-card",
            isCollapsed ? "w-12" : "w-64"
        )}>
            {isCollapsed ? (
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="p-3 hover:bg-accent rounded-md mx-2"
                    title="Expand"
                >
                    <Menu className="w-5 h-5" />
                </button>
            ) : (
                <div className="p-4 text-sm text-muted-foreground text-center">
                    Generate a model to see the navigation tree.
                </div>
            )}
        </div>
    );

    // Filter entities based on search
    const filteredEntities = Object.entries(model.entities).filter(([name, entity]) => {
        if (!searchQuery) return true;
        
        const query = searchQuery.toLowerCase();
        // Search in entity name
        if (name.toLowerCase().includes(query)) return true;
        
        // Search in component names
        return Object.keys(entity.components).some(compName => 
            compName.toLowerCase().includes(query)
        );
    });

    return (
        <div className={cn(
            "h-full flex flex-col transition-all duration-300 border-r bg-card",
            isCollapsed ? "w-12" : "w-64"
        )}>
            {/* Header with burger and search */}
            <div className="px-2 py-2 border-b flex items-center gap-2">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 hover:bg-accent rounded-md flex-shrink-0"
                    title={isCollapsed ? "Expand" : "Collapse"}
                >
                    {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
                
                {!isCollapsed && (
                    <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                        Navigator
                    </div>
                )}
            </div>

            {!isCollapsed && (
                <>
                    {/* Search Bar */}
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
                                    No results found
                                </div>
                            ) : (
                                filteredEntities.map(([name, entity]) => (
                                    <EntityItem
                                        key={name}
                                        name={name}
                                        entity={entity}
                                        isExpanded={!!expanded[name]}
                                        onToggle={() => toggleExpand(name)}
                                        selectedId={selectedNode}
                                        onSelect={selectNode}
                                        searchQuery={searchQuery}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

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
    
    // Highlight matching text
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
