import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
    Send, 
    Bot, 
    User, 
    Sparkles, 
    Plus, 
    Trash2, 
    Link2, 
    AtSign,
    Loader2,
    CheckCircle,
    AlertCircle,
    Info
} from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

// Types
interface AIAction {
    id: string;
    type: 'thinking' | 'action' | 'success' | 'error' | 'info';
    message: string;
    timestamp: Date;
    details?: string;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    actions?: AIAction[];
}

interface Mention {
    type: 'entity' | 'component' | 'influence';
    name: string;
    fullPath?: string;
}

export const AIChatPanel: React.FC = () => {
    const { 
        model, 
        setModel, 
        selectedNode,
        addEntity,
        removeEntity,
        addComponent,
        removeComponent,
        addInfluence,
        removeInfluence
    } = useStore();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showMentionMenu, setShowMentionMenu] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const [mentionCursorPos, setMentionCursorPos] = useState(0);
    const [currentActions, setCurrentActions] = useState<AIAction[]>([]);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentActions]);

    // Get all mentionable items from model
    const getMentionableItems = (): Mention[] => {
        if (!model) return [];
        
        const items: Mention[] = [];
        
        // Add entities
        Object.keys(model.entities).forEach(entityName => {
            items.push({ type: 'entity', name: entityName });
            
            // Add components
            const entity = model.entities[entityName];
            Object.keys(entity.components).forEach(compName => {
                items.push({ 
                    type: 'component', 
                    name: compName,
                    fullPath: `${entityName}.${compName}`
                });
            });
        });
        
        return items;
    };

    const filteredMentions = getMentionableItems().filter(item => 
        item.name.toLowerCase().includes(mentionFilter.toLowerCase()) ||
        (item.fullPath && item.fullPath.toLowerCase().includes(mentionFilter.toLowerCase()))
    );

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;
        setInput(value);

        // Check for @ mention
        const textBeforeCursor = value.slice(0, cursorPos);
        const atIndex = textBeforeCursor.lastIndexOf('@');
        
        if (atIndex !== -1 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === ' ')) {
            const filterText = textBeforeCursor.slice(atIndex + 1);
            if (!filterText.includes(' ')) {
                setShowMentionMenu(true);
                setMentionFilter(filterText);
                setMentionCursorPos(cursorPos);
                return;
            }
        }
        
        setShowMentionMenu(false);
    };

    // Insert mention
    const insertMention = (mention: Mention) => {
        const textBeforeCursor = input.slice(0, mentionCursorPos);
        const atIndex = textBeforeCursor.lastIndexOf('@');
        const textBefore = input.slice(0, atIndex);
        const textAfter = input.slice(mentionCursorPos);
        
        const mentionText = mention.fullPath || mention.name;
        const newInput = `${textBefore}@${mentionText} ${textAfter}`;
        
        setInput(newInput);
        setShowMentionMenu(false);
        inputRef.current?.focus();
    };

    // Execute an action from the AI
    const executeAction = async (action: any) => {
        const { type, target, details } = action;
        
        switch (type) {
            case 'add_entity': {
                const entityName = details?.name || target;
                const description = details?.description || '';
                addEntity(entityName, description);
                break;
            }
            
            case 'remove_entity': {
                const entityName = details?.name || target;
                removeEntity(entityName);
                break;
            }
            
            case 'add_component': {
                // target format: "EntityName.componentName" or from details
                let entityName = details?.entity;
                let componentName = details?.name || details?.componentName;
                
                if (!entityName && target) {
                    const parts = target.split('.');
                    entityName = parts[0];
                    componentName = parts[1] || componentName;
                }
                
                console.log('add_component action:', { entityName, componentName, details, target });
                
                if (entityName && componentName) {
                    // First ensure entity exists
                    if (!model?.entities[entityName]) {
                        console.log(`Entity ${entityName} doesn't exist, creating it first`);
                        addEntity(entityName, `Entity for ${componentName}`);
                    }
                    
                    // Prepare component data with realistic defaults
                    const componentData = {
                        type: (details?.type || details?.component?.type || 'state') as 'state' | 'computed' | 'constant',
                        initial: details?.initial ?? details?.value ?? details?.component?.initial ?? 100,
                        min: details?.min ?? details?.component?.min ?? null,
                        max: details?.max ?? details?.component?.max ?? null,
                        influences: (details?.influences || details?.component?.influences || []).map((inf: any) => ({
                            from: inf.from,
                            coef: inf.coef ?? 0.1,
                            kind: inf.kind || 'positive',
                            function: inf.function || 'linear',
                            enabled: inf.enabled !== false
                        }))
                    };
                    
                    console.log(`Adding component ${entityName}.${componentName}:`, componentData);
                    
                    // Use a small delay to ensure entity is created first
                    setTimeout(() => {
                        addComponent(entityName!, componentName!, componentData);
                    }, 50);
                } else {
                    console.error('Missing entity or component name for add_component action', { entityName, componentName, details });
                }
                break;
            }
            
            case 'remove_component': {
                let entityName = details?.entity;
                let componentName = details?.name;
                
                if (!entityName && target) {
                    const parts = target.split('.');
                    entityName = parts[0];
                    componentName = parts[1];
                }
                
                if (entityName && componentName) {
                    removeComponent(entityName, componentName);
                }
                break;
            }
            
            case 'add_relation':
            case 'add_influence': {
                // Add influence from source to target
                const targetComponent = details?.target || target;
                const sourceComponent = details?.source;
                const coef = details?.coef ?? 0.1;
                const kind = details?.kind || 'linear';
                
                if (targetComponent && sourceComponent) {
                    addInfluence(targetComponent, {
                        from: sourceComponent,
                        coef: coef,
                        kind: kind as any,
                        enabled: true,
                        function: kind as any
                    });
                }
                break;
            }
            
            case 'remove_relation':
            case 'remove_influence': {
                const targetComponent = details?.target || target;
                const sourceComponent = details?.source;
                
                if (targetComponent && sourceComponent && model) {
                    const [entityName, compName] = targetComponent.split('.');
                    const comp = model.entities[entityName]?.components[compName];
                    if (comp) {
                        const influenceIndex = comp.influences.findIndex(
                            (inf) => inf.from === sourceComponent
                        );
                        if (influenceIndex >= 0) {
                            removeInfluence(targetComponent, influenceIndex);
                        }
                    }
                }
                break;
            }
            
            case 'modify': {
                // Generic modify - could update initial values, etc.
                const targetPath = details?.target || target;
                if (targetPath && model) {
                    const newModel = JSON.parse(JSON.stringify(model));
                    const [entityName, compName] = targetPath.split('.');
                    
                    // Create entity if it doesn't exist
                    if (entityName && !newModel.entities[entityName]) {
                        console.log(`Creating entity ${entityName} for modify action`);
                        newModel.entities[entityName] = {
                            description: '',
                            components: {}
                        };
                    }
                    
                    // Create component if it doesn't exist
                    if (entityName && compName && !newModel.entities[entityName]?.components[compName]) {
                        console.log(`Creating component ${entityName}.${compName} for modify action`);
                        newModel.entities[entityName].components[compName] = {
                            type: details?.type || 'state',
                            initial: details?.initial ?? 100,
                            min: details?.min ?? null,
                            max: details?.max ?? null,
                            influences: details?.influences || []
                        };
                    }
                    
                    if (newModel.entities[entityName]?.components[compName]) {
                        if (details?.initial !== undefined) {
                            newModel.entities[entityName].components[compName].initial = details.initial;
                        }
                        if (details?.min !== undefined) {
                            newModel.entities[entityName].components[compName].min = details.min;
                        }
                        if (details?.max !== undefined) {
                            newModel.entities[entityName].components[compName].max = details.max;
                        }
                        setModel(newModel);
                    }
                }
                break;
            }
            
            default:
                console.log('Unknown action type:', type);
        }
    };

    // Add action to current stream
    const addAction = (type: AIAction['type'], message: string, details?: string) => {
        setCurrentActions(prev => [...prev, {
            id: `action-${Date.now()}`,
            type,
            message,
            timestamp: new Date(),
            details
        }]);
    };

    // Process chat message
    const handleSend = async () => {
        if (!input.trim() || isProcessing) return;

        const userMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsProcessing(true);
        setCurrentActions([]);

        try {
            // Parse mentions from input
            const mentionRegex = /@([\w.]+)/g;
            const mentions = [...input.matchAll(mentionRegex)].map(m => m[1]);
            
            addAction('thinking', 'Analyzing your request...');
            
            // Simulate AI processing with actions
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (mentions.length > 0) {
                addAction('info', `Found references: ${mentions.join(', ')}`);
            }

            // Call the API
            addAction('thinking', 'Processing with AI...');
            
            const response = await axios.post(`${API_URL}/chat`, {
                message: input,
                model: model,
                context: {
                    selectedNode,
                    mentions
                }
            });

            if (response.data.success) {
                // Process AI response
                const aiResponse = response.data;
                
                // Execute the actions returned by the AI
                if (aiResponse.actions && aiResponse.actions.length > 0) {
                    for (const action of aiResponse.actions) {
                        addAction('action', action.description || `Executing: ${action.type}`);
                        await new Promise(resolve => setTimeout(resolve, 300));
                        
                        // Actually execute the action
                        try {
                            await executeAction(action);
                            addAction('success', `Done: ${action.type} on ${action.target || 'model'}`);
                        } catch (err: any) {
                            addAction('error', `Failed: ${err.message}`);
                        }
                    }
                }

                const assistantMessage: ChatMessage = {
                    id: `msg-${Date.now()}`,
                    role: 'assistant',
                    content: aiResponse.message || 'Done!',
                    timestamp: new Date(),
                    actions: [...currentActions]
                };

                setMessages(prev => [...prev, assistantMessage]);
            } else {
                throw new Error(response.data.error || 'Unknown error');
            }

        } catch (error: any) {
            addAction('error', error.message || 'Failed to process request');
            
            // Fallback: try to handle locally for simple operations
            const localResult = await handleLocalCommand(input);
            
            const assistantMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: localResult || "I couldn't process that request. Please try again.",
                timestamp: new Date(),
                actions: [...currentActions]
            };

            setMessages(prev => [...prev, assistantMessage]);
        } finally {
            setIsProcessing(false);
            setCurrentActions([]);
        }
    };

    // Handle simple commands locally
    const handleLocalCommand = async (input: string): Promise<string | null> => {
        const lowerInput = input.toLowerCase();
        
        // Delete entity
        if (lowerInput.includes('delete') || lowerInput.includes('remove') || lowerInput.includes('supprimer')) {
            const mentionRegex = /@([\w.]+)/g;
            const mentions = [...input.matchAll(mentionRegex)].map(m => m[1]);
            
            if (mentions.length > 0 && model) {
                const newModel = JSON.parse(JSON.stringify(model));
                let deleted = false;
                
                for (const mention of mentions) {
                    if (mention.includes('.')) {
                        // It's a component
                        const [entityName, compName] = mention.split('.');
                        if (newModel.entities[entityName]?.components[compName]) {
                            delete newModel.entities[entityName].components[compName];
                            addAction('action', `Deleted component: ${mention}`);
                            deleted = true;
                        }
                    } else {
                        // It's an entity
                        if (newModel.entities[mention]) {
                            delete newModel.entities[mention];
                            addAction('action', `Deleted entity: ${mention}`);
                            deleted = true;
                        }
                    }
                }
                
                if (deleted) {
                    setModel(newModel);
                    addAction('success', 'Changes applied');
                    return `Successfully deleted: ${mentions.join(', ')}`;
                }
            }
        }
        
        // Modify coefficient
        if ((lowerInput.includes('coefficient') || lowerInput.includes('coef') || lowerInput.includes('modifier')) && model) {
            const numberMatch = input.match(/-?\d+\.?\d*/);
            const mentionRegex = /@([\w.]+)/g;
            const mentions = [...input.matchAll(mentionRegex)].map(m => m[1]);
            
            if (numberMatch && mentions.length > 0) {
                const newCoef = parseFloat(numberMatch[0]);
                // This would need more sophisticated parsing
                addAction('info', `Would set coefficient to ${newCoef} for ${mentions.join(', ')}`);
                return `To modify coefficients, please use the Inspector panel for precise control.`;
            }
        }

        return null;
    };

    // Handle key press
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        
        if (e.key === 'Escape') {
            setShowMentionMenu(false);
        }
    };

    // Render action icon
    const getActionIcon = (type: AIAction['type']) => {
        switch (type) {
            case 'thinking': return <Loader2 className="w-3 h-3 animate-spin text-blue-500" />;
            case 'action': return <Sparkles className="w-3 h-3 text-purple-500" />;
            case 'success': return <CheckCircle className="w-3 h-3 text-green-500" />;
            case 'error': return <AlertCircle className="w-3 h-3 text-red-500" />;
            case 'info': return <Info className="w-3 h-3 text-gray-500" />;
        }
    };

    return (
        <div className="h-full flex flex-col bg-card">
            {/* Header */}
            <div className="p-3 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-sm">AI Assistant</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Use @entity or @entity.component to reference elements
                </p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {messages.length === 0 && !isProcessing && (
                    <div className="text-center py-8 text-muted-foreground">
                        <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">Start a conversation</p>
                        <p className="text-xs mt-1">
                            Ask me to modify, add, or analyze your model
                        </p>
                        <div className="mt-4 space-y-2 text-xs">
                            <p className="text-muted-foreground">Try:</p>
                            <button 
                                onClick={() => setInput("Add a new component 'Growth_Rate' to @")}
                                className="block w-full text-left px-3 py-2 rounded bg-accent/50 hover:bg-accent"
                            >
                                "Add a new component 'Growth_Rate' to @Entity"
                            </button>
                            <button 
                                onClick={() => setInput("Delete @")}
                                className="block w-full text-left px-3 py-2 rounded bg-accent/50 hover:bg-accent"
                            >
                                "Delete @Component"
                            </button>
                            <button 
                                onClick={() => setInput("Increase the influence coefficient between @")}
                                className="block w-full text-left px-3 py-2 rounded bg-accent/50 hover:bg-accent"
                            >
                                "Increase the influence between @A and @B"
                            </button>
                        </div>
                    </div>
                )}

                {messages.map(msg => (
                    <div 
                        key={msg.id}
                        className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            msg.role === 'user' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-purple-100 text-purple-600'
                        }`}>
                            {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                            <div className={`inline-block p-3 rounded-lg max-w-[85%] text-sm ${
                                msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-accent'
                            }`}>
                                {msg.content}
                            </div>
                            
                            {/* Show actions for assistant messages */}
                            {msg.role === 'assistant' && msg.actions && msg.actions.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {msg.actions.map(action => (
                                        <div 
                                            key={action.id}
                                            className="flex items-center gap-2 text-xs text-muted-foreground"
                                        >
                                            {getActionIcon(action.type)}
                                            <span>{action.message}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <div className="text-[10px] text-muted-foreground mt-1">
                                {msg.timestamp.toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Current processing actions */}
                {isProcessing && currentActions.length > 0 && (
                    <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                            {currentActions.map(action => (
                                <div 
                                    key={action.id}
                                    className="flex items-center gap-2 text-xs text-muted-foreground animate-fade-in"
                                >
                                    {getActionIcon(action.type)}
                                    <span>{action.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t bg-background relative">
                {/* Mention Menu */}
                {showMentionMenu && filteredMentions.length > 0 && (
                    <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredMentions.map((mention, idx) => (
                            <button
                                key={idx}
                                onClick={() => insertMention(mention)}
                                className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2 text-sm"
                            >
                                <span className={`w-2 h-2 rounded-full ${
                                    mention.type === 'entity' ? 'bg-blue-500' : 'bg-green-500'
                                }`} />
                                <span className="font-medium">{mention.name}</span>
                                {mention.fullPath && (
                                    <span className="text-xs text-muted-foreground">
                                        ({mention.fullPath})
                                    </span>
                                )}
                                <span className="ml-auto text-xs text-muted-foreground capitalize">
                                    {mention.type}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Selected Node Badge */}
                {selectedNode && (
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Context:</span>
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                            @{selectedNode}
                        </span>
                    </div>
                )}

                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask AI to modify your model... (use @ to mention)"
                            className="w-full px-3 py-2 pr-10 border rounded-lg resize-none text-sm focus:ring-2 ring-primary outline-none"
                            rows={2}
                            disabled={isProcessing}
                        />
                        <button
                            onClick={() => {
                                setShowMentionMenu(!showMentionMenu);
                                setMentionCursorPos(input.length);
                                setMentionFilter('');
                            }}
                            className="absolute right-2 top-2 p-1 rounded hover:bg-accent text-muted-foreground"
                            title="Insert mention (@)"
                        >
                            <AtSign className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isProcessing}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </div>
                
                {/* Quick Actions */}
                <div className="flex gap-2 mt-2">
                    <button 
                        onClick={() => setInput('Add a new entity called ')}
                        className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" />
                        Entity
                    </button>
                    <button 
                        onClick={() => setInput('Add a new component to @')}
                        className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-600 hover:bg-green-100 flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" />
                        Component
                    </button>
                    <button 
                        onClick={() => setInput('Add an influence from @ to @')}
                        className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center gap-1"
                    >
                        <Link2 className="w-3 h-3" />
                        Relation
                    </button>
                    <button 
                        onClick={() => setInput('Delete @')}
                        className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
                    >
                        <Trash2 className="w-3 h-3" />
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};
