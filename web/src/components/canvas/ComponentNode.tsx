import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { MoreVertical, Pencil, Wand2, Code, Trash2, AlertTriangle, Check, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Component, Influence, Entity } from '../../types';
import { AddInfluenceModal } from './AddInfluenceModal';
import { MentionInput } from '../MentionInput';

// ============================================================================
// Component Menu
// ============================================================================
interface ComponentMenuProps {
    onManualEdit: () => void;
    onAIEdit: () => void;
    onViewJSON: () => void;
    onDelete: () => void;
    onClose: () => void;
}

const ComponentMenu: React.FC<ComponentMenuProps> = ({ onManualEdit, onAIEdit, onViewJSON, onDelete, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="absolute right-0 top-6 z-50 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
            onClick={(e) => e.stopPropagation()}
        >
            <button
                onClick={onManualEdit}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
                <Pencil className="w-4 h-4" />
                Manual Edit
            </button>
            <button
                onClick={onAIEdit}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
                <Wand2 className="w-4 h-4" />
                AI Edit
            </button>
            <div className="border-t my-1" />
            <button
                onClick={onViewJSON}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
                <Code className="w-4 h-4" />
                View/Edit JSON
            </button>
            <div className="border-t my-1" />
            <button
                onClick={onDelete}
                className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
                <Trash2 className="w-4 h-4" />
                Delete Component
            </button>
        </div>
    );
};

// ============================================================================
// Manual Edit Modal
// ============================================================================
interface ManualEditModalProps {
    entityName: string;
    componentName: string;
    component: Component;
    onSave: (updates: Partial<Component>) => void;
    onClose: () => void;
}

const ManualEditModal: React.FC<ManualEditModalProps> = ({ entityName, componentName, component, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        type: component.type,
        initial: component.initial,
        min: component.min ?? '',
        max: component.max ?? '',
    });

    const handleSave = () => {
        onSave({
            type: formData.type as 'state' | 'computed' | 'constant',
            initial: Number(formData.initial),
            min: formData.min === '' ? null : Number(formData.min),
            max: formData.max === '' ? null : Number(formData.max),
        });
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }} onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-lg mb-1">Edit Component</h3>
                <p className="text-sm text-gray-500 mb-4">{entityName}.{componentName}</p>

                <div className="space-y-4">
                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'state' | 'computed' | 'constant' })}
                            className="w-full px-3 py-2 border rounded-md"
                        >
                            <option value="state">State (variable)</option>
                            <option value="computed">Computed (derived)</option>
                            <option value="constant">Constant (fixed)</option>
                        </select>
                    </div>

                    {/* Initial Value */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Initial Value</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.initial}
                            onChange={(e) => setFormData({ ...formData, initial: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border rounded-md font-mono"
                        />
                    </div>

                    {/* Min/Max */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Minimum</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.min}
                                onChange={(e) => setFormData({ ...formData, min: e.target.value })}
                                placeholder="No limit"
                                className="w-full px-3 py-2 border rounded-md font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Maximum</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.max}
                                onChange={(e) => setFormData({ ...formData, max: e.target.value })}
                                placeholder="No limit"
                                className="w-full px-3 py-2 border rounded-md font-mono"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ============================================================================
// Full JSON Editor Modal (includes influences and all data)
// ============================================================================
interface FullJSONEditorModalProps {
    entityName: string;
    componentName: string;
    component: Component;
    allInfluencesTo: Array<{ from: string; toEntity: string; toComponent: string; influence: Influence }>;
    onSave: (component: Component) => void;
    onClose: () => void;
}

const FullJSONEditorModal: React.FC<FullJSONEditorModalProps> = ({
    entityName,
    componentName,
    component,
    allInfluencesTo,
    onSave,
    onClose
}) => {
    // Build complete data object
    const fullData = {
        path: `${entityName}.${componentName}`,
        component: {
            type: component.type,
            initial: component.initial,
            min: component.min,
            max: component.max,
        },
        incomingInfluences: component.influences,
        outgoingInfluences: allInfluencesTo.map(inf => ({
            to: `${inf.toEntity}.${inf.toComponent}`,
            coef: inf.influence.coef,
            kind: inf.influence.kind,
            function: inf.influence.function,
            enabled: inf.influence.enabled,
        })),
    };

    const [json, setJson] = useState(JSON.stringify(fullData, null, 2));
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        try {
            const parsed = JSON.parse(json);
            // Reconstruct component from parsed data
            const updatedComponent: Component = {
                type: parsed.component.type,
                initial: parsed.component.initial,
                min: parsed.component.min,
                max: parsed.component.max,
                influences: parsed.incomingInfluences || [],
            };
            onSave(updatedComponent);
            onClose();
        } catch {
            setError('Invalid JSON format');
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }} onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-lg mb-1">Component JSON</h3>
                <p className="text-sm text-gray-500 mb-4">{entityName}.{componentName}</p>

                <textarea
                    value={json}
                    onChange={(e) => { setJson(e.target.value); setError(null); }}
                    className="w-full h-96 font-mono text-xs p-3 border rounded-md bg-gray-50"
                    spellCheck={false}
                />

                {error && (
                    <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ============================================================================
// AI Edit Floating Panel (positioned next to component)
// ============================================================================
interface AIEditPanelProps {
    entityName: string;
    componentName: string;
    component: Component;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLDivElement | null>;
}

interface AIProposal {
    changes: {
        target: string;
        field: string;
        oldValue: unknown;
        newValue: unknown;
        reason: string;
    }[];
    requiresOtherChanges: boolean;
    otherChanges?: {
        target: string;
        description: string;
        reason: string;
    }[];
}

const AIEditPanel: React.FC<AIEditPanelProps> = ({ entityName, componentName, component, onClose, anchorRef }) => {
    const { model, setModel, addAILog } = useStore();
    const [prompt, setPrompt] = useState('');
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const panelRef = useRef<HTMLDivElement>(null);

    // Calculate position based on anchor element
    useEffect(() => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setPosition({
                top: rect.top,
                left: rect.right + 12, // 12px gap to the right
            });
        }
    }, [anchorRef]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Don't close if clicking on mention suggestions
            if (target.closest('[data-mention-suggestions="true"]')) {
                return;
            }
            if (panelRef.current && !panelRef.current.contains(target) &&
                anchorRef.current && !anchorRef.current.contains(target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, anchorRef]);

    const [isLoading, setIsLoading] = useState(false);
    const [proposal, setProposal] = useState<AIProposal | null>(null);
    const [approvedOtherChanges, setApprovedOtherChanges] = useState<Set<number>>(new Set());

    // Prepare options for MentionInput
    const mentionOptions = React.useMemo(() => {
        if (!model) return [];
        const opts: string[] = [];
        Object.keys(model.entities).forEach(e => {
            opts.push(e);
            Object.keys(model.entities[e].components).forEach(c => {
                opts.push(`${e}.${c}`);
            });
        });
        return opts;
    }, [model]);

    const handleAnalyze = async () => {
        if (!prompt.trim() || !model) return;
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8000/ai-edit/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    target: `${entityName}.${componentName}`,
                    instruction: prompt,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setProposal(data.proposal);
            } else {
                // Simulate proposal for demo
                setProposal({
                    changes: [
                        {
                            target: `${entityName}.${componentName}`,
                            field: 'initial',
                            oldValue: component.initial,
                            newValue: component.initial * 1.5,
                            reason: 'Based on your request to modify the component',
                        }
                    ],
                    requiresOtherChanges: false,
                });
            }
        } catch (error) {
            console.error('AI analysis failed:', error);
            // Demo fallback
            setProposal({
                changes: [
                    {
                        target: `${entityName}.${componentName}`,
                        field: 'initial',
                        oldValue: component.initial,
                        newValue: component.initial * 1.2,
                        reason: prompt,
                    }
                ],
                requiresOtherChanges: false,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = () => {
        if (!proposal || !model) return;

        try {
            const newModel = JSON.parse(JSON.stringify(model));
            const appliedChanges: { field: string; oldValue: unknown; newValue: unknown }[] = [];
            const createdEntities: string[] = [];
            const createdComponents: string[] = [];
            const addedInfluences: string[] = [];

            // First, apply approved otherChanges (create entities/components/influences)
            if (proposal.otherChanges) {
                for (let i = 0; i < proposal.otherChanges.length; i++) {
                    if (!approvedOtherChanges.has(i)) continue;
                    
                    const otherChange = proposal.otherChanges[i];
                    const action = otherChange.action || 'create';
                    
                    // Handle create_entity action
                    if (action === 'create_entity') {
                        const entityName = otherChange.target;
                        if (entityName && !newModel.entities[entityName]) {
                            console.log(`Creating entity ${entityName} from otherChanges`);
                            newModel.entities[entityName] = {
                                description: otherChange.entityDescription || otherChange.description || '',
                                components: {}
                            };
                            createdEntities.push(entityName);
                        }
                        continue;
                    }
                    
                    // Handle add_influence action
                    if (action === 'add_influence' && otherChange.influence) {
                        const parts = otherChange.target.split('.');
                        const [targetEntity, targetComponent] = parts;
                        
                        if (targetEntity && targetComponent && newModel.entities[targetEntity]?.components[targetComponent]) {
                            const targetComp = newModel.entities[targetEntity].components[targetComponent];
                            const influence = otherChange.influence;
                            
                            // Check if influence already exists
                            const exists = targetComp.influences.some(
                                (inf: any) => inf.from === influence.from
                            );
                            
                            if (!exists) {
                                console.log(`Adding influence ${influence.from} → ${otherChange.target}`);
                                targetComp.influences.push({
                                    from: influence.from,
                                    coef: influence.coef ?? 0.1,
                                    kind: influence.kind || 'positive',
                                    function: influence.function || 'linear',
                                    enabled: influence.enabled !== false
                                });
                                addedInfluences.push(`${influence.from} → ${otherChange.target}`);
                            }
                        }
                        continue;
                    }
                    
                    // Handle create component action (default)
                    const parts = otherChange.target.split('.');
                    const [targetEntity, targetComponent] = parts;
                    
                    // Create entity if it doesn't exist
                    if (targetEntity && !newModel.entities[targetEntity]) {
                        console.log(`Creating entity ${targetEntity} from otherChanges`);
                        newModel.entities[targetEntity] = {
                            description: otherChange.entityDescription || '',
                            components: {}
                        };
                        createdEntities.push(targetEntity);
                    }
                    
                    // Create component if specified and doesn't exist
                    if (targetEntity && targetComponent && !newModel.entities[targetEntity]?.components[targetComponent]) {
                        console.log(`Creating component ${targetEntity}.${targetComponent} from otherChanges`);
                        newModel.entities[targetEntity].components[targetComponent] = {
                            type: otherChange.componentType || 'state',
                            initial: otherChange.initial ?? 100,
                            min: otherChange.min ?? null,
                            max: otherChange.max ?? null,
                            influences: otherChange.influences || []
                        };
                        createdComponents.push(`${targetEntity}.${targetComponent}`);
                    }
                }
            }
            
            // Second pass: Add influences that reference newly created components
            if (proposal.otherChanges) {
                for (let i = 0; i < proposal.otherChanges.length; i++) {
                    if (!approvedOtherChanges.has(i)) continue;
                    
                    const otherChange = proposal.otherChanges[i];
                    if (otherChange.action === 'add_influence' && otherChange.influence) {
                        const parts = otherChange.target.split('.');
                        const [targetEntity, targetComponent] = parts;
                        
                        if (targetEntity && targetComponent && newModel.entities[targetEntity]?.components[targetComponent]) {
                            const targetComp = newModel.entities[targetEntity].components[targetComponent];
                            const influence = otherChange.influence;
                            
                            // Check if influence already exists
                            const exists = targetComp.influences.some(
                                (inf: any) => inf.from === influence.from
                            );
                            
                            if (!exists) {
                                console.log(`Adding influence ${influence.from} → ${otherChange.target}`);
                                targetComp.influences.push({
                                    from: influence.from,
                                    coef: influence.coef ?? 0.1,
                                    kind: influence.kind || 'positive',
                                    function: influence.function || 'linear',
                                    enabled: influence.enabled !== false
                                });
                                addedInfluences.push(`${influence.from} → ${otherChange.target}`);
                            }
                        }
                    }
                }
            }

            // Apply main changes with validation
            for (const change of proposal.changes) {
                const parts = change.target.split('.');
                if (parts.length !== 2) {
                    console.warn(`Invalid target format: ${change.target}, expected "Entity.Component"`);
                    continue;
                }
                const [ent, comp] = parts;

                // Create entity if it doesn't exist
                if (!newModel.entities[ent]) {
                    console.log(`Creating entity ${ent} for change target`);
                    newModel.entities[ent] = {
                        description: '',
                        components: {}
                    };
                    createdEntities.push(ent);
                }

                // Create component if it doesn't exist
                if (!newModel.entities[ent].components[comp]) {
                    console.log(`Creating component ${ent}.${comp} for change target`);
                    newModel.entities[ent].components[comp] = {
                        type: 'state',
                        initial: 0,
                        min: null,
                        max: null,
                        influences: []
                    };
                    createdComponents.push(`${ent}.${comp}`);
                }

                // Handle influence coefficient changes
                if (change.field === 'influence_coef' && change.influenceFrom) {
                    const comp_obj = newModel.entities[ent].components[comp];
                    const inf = comp_obj.influences.find((i: any) => i.from === change.influenceFrom);
                    if (inf) {
                        inf.coef = change.newValue;
                        appliedChanges.push({
                            field: `influence_coef(${change.influenceFrom})`,
                            oldValue: change.oldValue,
                            newValue: change.newValue,
                        });
                    }
                    continue;
                }

                const allowedFields = ['initial', 'min', 'max', 'type'];
                if (!allowedFields.includes(change.field)) continue;

                (newModel.entities[ent].components[comp] as Record<string, unknown>)[change.field] = change.newValue;
                appliedChanges.push({
                    field: change.field,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                });
            }

            if (!newModel.entities || typeof newModel.entities !== 'object') {
                throw new Error('Model structure corrupted');
            }

            setModel(newModel);

            // Log the AI edit with creation info
            const description = [
                `Modification AI appliquée sur ${entityName}.${componentName}`,
                createdEntities.length > 0 ? `Entités créées: ${createdEntities.join(', ')}` : '',
                createdComponents.length > 0 ? `Composants créés: ${createdComponents.join(', ')}` : '',
                addedInfluences.length > 0 ? `Influences ajoutées: ${addedInfluences.join(', ')}` : ''
            ].filter(Boolean).join('. ');

            addAILog({
                type: 'edit',
                target: `${entityName}.${componentName}`,
                description,
                prompt,
                changes: appliedChanges,
            });

            onClose();
        } catch (error) {
            console.error('Failed to apply AI changes:', error);
        }
    };

    const toggleOtherChange = (index: number) => {
        const newSet = new Set(approvedOtherChanges);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        setApprovedOtherChanges(newSet);
    };

    return createPortal(
        <div
            ref={panelRef}
            className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 w-80 max-h-[500px] overflow-hidden flex flex-col animate-in slide-in-from-left-2 duration-200"
            style={{
                top: Math.max(10, Math.min(position.top, window.innerHeight - 520)),
                left: Math.min(position.left, window.innerWidth - 340),
                zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4" />
                    <span className="font-semibold text-sm">AI Edit</span>
                </div>
                <button onClick={onClose} className="hover:bg-white/20 rounded p-1 transition-colors">
                    <span className="text-lg leading-none">&times;</span>
                </button>
            </div>

            {/* Target info */}
            <div className="px-4 py-2 bg-gray-50 border-b text-xs text-gray-600">
                Editing <span className="font-mono font-semibold text-gray-800">{entityName}.{componentName}</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {!proposal ? (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-500">
                            Décrivez ce que vous voulez modifier. Utilisez <span className="font-mono bg-blue-100 px-1 rounded">@</span> pour référencer d'autres éléments.
                        </p>
                        <MentionInput
                            value={prompt}
                            onChange={setPrompt}
                            options={mentionOptions}
                            placeholder="Ex: Doubler la valeur initiale, lier à @Entity.Comp..."
                            className="min-h-[80px] text-sm"
                            disabled={isLoading}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleAnalyze}
                                disabled={!prompt.trim() || isLoading}
                                className="flex-1 py-2 text-sm bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <span className="animate-spin">⏳</span>
                                ) : (
                                    <Wand2 className="w-4 h-4" />
                                )}
                                {isLoading ? 'Analyse...' : 'Analyser'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Proposed Changes */}
                        <div className="space-y-2">
                            <h4 className="font-medium text-xs flex items-center gap-1 text-green-700">
                                <Check className="w-3 h-3" />
                                Changements proposés
                            </h4>
                            {proposal.changes.map((change, i) => (
                                <div key={i} className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                                    <div className="font-mono font-medium text-green-800">{change.target}</div>
                                    <div className="text-gray-600 mt-1">
                                        <span className="font-mono">{change.field}</span>:{' '}
                                        <span className="text-red-500 line-through">{String(change.oldValue)}</span>
                                        {' → '}
                                        <span className="text-green-600 font-bold">{String(change.newValue)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Other Changes */}
                        {proposal.requiresOtherChanges && proposal.otherChanges && proposal.otherChanges.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="font-medium text-xs flex items-center gap-1 text-amber-700">
                                    <AlertTriangle className="w-3 h-3" />
                                    Changements additionnels
                                </h4>
                                {proposal.otherChanges.map((change, i) => (
                                    <div
                                        key={i}
                                        className={`p-2 border rounded text-xs cursor-pointer ${approvedOtherChanges.has(i) ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}
                                        onClick={() => toggleOtherChange(i)}
                                    >
                                        <div className="flex items-start gap-2">
                                            <input
                                                type="checkbox"
                                                checked={approvedOtherChanges.has(i)}
                                                onChange={() => toggleOtherChange(i)}
                                                className="mt-0.5"
                                            />
                                            <div>
                                                <div className="font-medium">{change.target}</div>
                                                <div className="text-gray-500">{change.description}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setProposal(null)}
                                className="flex-1 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                ← Retour
                            </button>
                            <button
                                onClick={handleApply}
                                className="flex-1 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-1"
                            >
                                <Check className="w-3 h-3" />
                                Appliquer
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

// ============================================================================
// Delete Confirmation Modal
// ============================================================================
interface DeleteConfirmModalProps {
    entityName: string;
    componentName: string;
    affectedInfluences: number;
    onConfirm: () => void;
    onClose: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    entityName,
    componentName,
    affectedInfluences,
    onConfirm,
    onClose
}) => {
    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }} onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Delete Component?</h3>
                        <p className="text-sm text-gray-500">{entityName}.{componentName}</p>
                    </div>
                </div>

                {affectedInfluences > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-4">
                        <div className="flex items-center gap-2 text-amber-700 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            <span>This will also remove {affectedInfluences} influence(s) connected to this component.</span>
                        </div>
                    </div>
                )}

                <p className="text-sm text-gray-600 mb-4">
                    This action cannot be undone.
                </p>

                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                        Cancel
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ============================================================================
// Main Component Node
// ============================================================================
export const ComponentNode: React.FC<NodeProps> = ({ data: rawData }) => {
    const { model, setModel, selectNode, connectionMode, startConnection, cancelConnection } = useStore();
    const [showMenu, setShowMenu] = useState(false);
    const [showManualEdit, setShowManualEdit] = useState(false);
    const [showJSONEditor, setShowJSONEditor] = useState(false);
    const [showAIEditor, setShowAIEditor] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showAddInfluence, setShowAddInfluence] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);

    const data = rawData as {
        label: string;
        type: 'state' | 'computed' | 'constant';
        value: number;
        min?: number;
        max?: number;
        entityName: string;
    };

    // Get full component data from model
    const entityName = data.entityName;
    const componentName = data.label;
    const fullPath = `${entityName}.${componentName}`;
    const component = model?.entities[entityName]?.components[componentName];

    // Find all influences that go TO other components FROM this one
    const outgoingInfluences: Array<{ from: string; toEntity: string; toComponent: string; influence: Influence }> = [];
    if (model) {
        Object.entries(model.entities).forEach(([ent, entity]) => {
            Object.entries(entity.components).forEach(([comp, compData]) => {
                compData.influences.forEach(inf => {
                    if (inf.from === `${entityName}.${componentName}`) {
                        outgoingInfluences.push({
                            from: inf.from,
                            toEntity: ent,
                            toComponent: comp,
                            influence: inf,
                        });
                    }
                });
            });
        });
    }

    const typeColors = {
        state: 'bg-blue-100 border-blue-300',
        computed: 'bg-green-100 border-green-300',
        constant: 'bg-gray-100 border-gray-300',
    };

    const typeIcons = {
        state: '📊',
        computed: '🔄',
        constant: '📌',
    };

    const handleManualEdit = () => {
        setShowMenu(false);
        setShowManualEdit(true);
    };

    const handleAIEdit = () => {
        setShowMenu(false);
        setShowAIEditor(true);
    };

    const handleViewJSON = () => {
        setShowMenu(false);
        setShowJSONEditor(true);
    };

    const handleDelete = () => {
        setShowMenu(false);
        setShowDeleteConfirm(true);
    };

    const handleSaveManual = (updates: Partial<Component>) => {
        if (!model) return;
        const newModel = JSON.parse(JSON.stringify(model));
        if (newModel.entities[entityName]?.components[componentName]) {
            Object.assign(newModel.entities[entityName].components[componentName], updates);
        }
        setModel(newModel);
    };

    const handleSaveJSON = (updatedComponent: Component) => {
        if (!model) return;
        const newModel = JSON.parse(JSON.stringify(model));
        newModel.entities[entityName].components[componentName] = updatedComponent;
        setModel(newModel);
    };

    const handleConfirmDelete = () => {
        if (!model) return;
        const newModel = JSON.parse(JSON.stringify(model));
        const path = `${entityName}.${componentName}`;

        // Remove component
        delete newModel.entities[entityName].components[componentName];

        // Remove all influences that reference this component
        Object.values(newModel.entities).forEach((entity: unknown) => {
            Object.values((entity as Entity).components).forEach((comp: unknown) => {
                (comp as Component).influences = (comp as Component).influences.filter(inf => inf.from !== path);
            });
        });

        setModel(newModel);
        selectNode(null);
    };

    // Count affected influences for delete warning
    const affectedInfluences = outgoingInfluences.length + (component?.influences.length || 0);

    return (
        <>
            <div
                ref={nodeRef}
                className={`p-2 rounded border-2 ${typeColors[data.type]} min-w-[240px] relative transition-all ${connectionMode.active && connectionMode.from !== fullPath
                    ? 'cursor-crosshair ring-2 ring-blue-400 border-blue-400 shadow-lg scale-105 z-10'
                    : ''
                    }`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={(e) => {
                    if (connectionMode.active && connectionMode.from && connectionMode.from !== fullPath) {
                        e.stopPropagation();
                        setShowAddInfluence(true);
                    }
                }}
            >
                <Handle type="target" position={Position.Left} />

                <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{typeIcons[data.type]}</span>
                    <div className="flex-1">
                        <div className="font-semibold text-sm">{data.label}</div>
                        <div className="text-xs text-muted-foreground capitalize">{data.type}</div>
                    </div>

                    {!connectionMode.active && isHovered && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                startConnection(fullPath);
                            }}
                            className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Connect to parameter"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}

                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className="p-1 rounded hover:bg-black/10 transition-colors"
                    >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {showMenu && (
                    <ComponentMenu
                        onManualEdit={handleManualEdit}
                        onAIEdit={handleAIEdit}
                        onViewJSON={handleViewJSON}
                        onDelete={handleDelete}
                        onClose={() => setShowMenu(false)}
                    />
                )}

                <div className="text-xs text-gray-600 mt-1 bg-white px-2 py-1 rounded">
                    <div className="flex justify-between">
                        <span>Value:</span>
                        <span className="font-mono font-bold">{data.value.toFixed(2)}</span>
                    </div>
                    {data.min !== undefined && data.min !== null && (
                        <div className="flex justify-between">
                            <span>Min:</span>
                            <span className="font-mono">{data.min.toFixed(2)}</span>
                        </div>
                    )}
                    {data.max !== undefined && data.max !== null && (
                        <div className="flex justify-between">
                            <span>Max:</span>
                            <span className="font-mono">{data.max.toFixed(2)}</span>
                        </div>
                    )}
                </div>

                <Handle type="source" position={Position.Right} />
            </div>

            {/* Modals */}
            {showManualEdit && component && (
                <ManualEditModal
                    entityName={entityName}
                    componentName={componentName}
                    component={component}
                    onSave={handleSaveManual}
                    onClose={() => setShowManualEdit(false)}
                />
            )}

            {showJSONEditor && component && (
                <FullJSONEditorModal
                    entityName={entityName}
                    componentName={componentName}
                    component={component}
                    allInfluencesTo={outgoingInfluences}
                    onSave={handleSaveJSON}
                    onClose={() => setShowJSONEditor(false)}
                />
            )}

            {showAIEditor && component && (
                <AIEditPanel
                    entityName={entityName}
                    componentName={componentName}
                    component={component}
                    onClose={() => setShowAIEditor(false)}
                    anchorRef={nodeRef}
                />
            )}

            {showDeleteConfirm && (
                <DeleteConfirmModal
                    entityName={entityName}
                    componentName={componentName}
                    affectedInfluences={affectedInfluences}
                    onConfirm={handleConfirmDelete}
                    onClose={() => setShowDeleteConfirm(false)}
                />
            )}

            {showAddInfluence && connectionMode.from && (
                <AddInfluenceModal
                    from={connectionMode.from}
                    to={fullPath}
                    onClose={() => {
                        setShowAddInfluence(false);
                        cancelConnection();
                    }}
                />
            )}
        </>
    );
};
