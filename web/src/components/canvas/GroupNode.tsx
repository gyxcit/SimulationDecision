import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { MoreVertical, Plus, Wand2, Pencil, Trash2, AlertTriangle, Check, Code } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Component, Entity } from '../../types';

// ============================================================================
// Entity Menu
// ============================================================================
interface EntityMenuProps {
    onAddComponent: () => void;
    onAIEdit: () => void;
    onViewJSON: () => void;
    onDelete: () => void;
    onClose: () => void;
    buttonRef: React.RefObject<HTMLButtonElement>;
}

const EntityMenu: React.FC<EntityMenuProps> = ({ onAddComponent, onAIEdit, onViewJSON, onDelete, onClose, buttonRef }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 4,
                left: rect.right - 192, // 192 = w-48 = 12rem
            });
        }
    }, [buttonRef]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return createPortal(
        <div
            ref={menuRef}
            className="fixed w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
            style={{ top: position.top, left: position.left, zIndex: 9999 }}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                onClick={() => { onAddComponent(); onClose(); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Add Component
            </button>
            <button
                onClick={() => { onAIEdit(); onClose(); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
                <Wand2 className="w-4 h-4" />
                AI Edit Entity
            </button>
            <div className="border-t my-1" />
            <button
                onClick={() => { onViewJSON(); onClose(); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
                <Code className="w-4 h-4" />
                View/Edit JSON
            </button>
            <div className="border-t my-1" />
            <button
                onClick={() => { onDelete(); onClose(); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
                <Trash2 className="w-4 h-4" />
                Delete Entity
            </button>
        </div>,
        document.body
    );
};

// ============================================================================
// Add Component Modal
// ============================================================================
interface AddComponentModalProps {
    entityName: string;
    onAddManual: (name: string, component: Component) => void;
    onAddAI: (prompt: string) => void;
    onClose: () => void;
}

const AddComponentModal: React.FC<AddComponentModalProps> = ({ entityName, onAddManual, onAddAI, onClose }) => {
    const [mode, setMode] = useState<'choose' | 'manual' | 'ai'>('choose');
    const [componentName, setComponentName] = useState('');
    const [componentType, setComponentType] = useState<'state' | 'computed' | 'constant'>('state');
    const [initialValue, setInitialValue] = useState(0.5);
    const [minValue, setMinValue] = useState<string>('0');
    const [maxValue, setMaxValue] = useState<string>('1');
    const [aiPrompt, setAIPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleManualAdd = () => {
        if (!componentName.trim()) return;
        onAddManual(componentName, {
            type: componentType,
            initial: initialValue,
            min: minValue === '' ? null : parseFloat(minValue),
            max: maxValue === '' ? null : parseFloat(maxValue),
            influences: [],
        });
        onClose();
    };

    const handleAIAdd = async () => {
        if (!aiPrompt.trim()) return;
        setIsLoading(true);
        // In a real implementation, this would call the AI API
        // For now, we'll just add a placeholder component
        setTimeout(() => {
            onAddManual(`AI_${Date.now()}`, {
                type: 'state',
                initial: 0.5,
                min: 0,
                max: 1,
                influences: [],
            });
            setIsLoading(false);
            onClose();
        }, 1000);
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }} onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-lg mb-1">Add Component</h3>
                <p className="text-sm text-gray-500 mb-4">to {entityName}</p>

                {mode === 'choose' && (
                    <div className="space-y-3">
                        <button
                            onClick={() => setMode('manual')}
                            className="w-full p-4 border rounded-lg hover:bg-gray-50 text-left flex items-center gap-3"
                        >
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Pencil className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="font-medium">Manual</div>
                                <div className="text-sm text-gray-500">Define all parameters yourself</div>
                            </div>
                        </button>
                        <button
                            onClick={() => setMode('ai')}
                            className="w-full p-4 border rounded-lg hover:bg-gray-50 text-left flex items-center gap-3"
                        >
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Wand2 className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="font-medium">AI Generated</div>
                                <div className="text-sm text-gray-500">Describe what you need</div>
                            </div>
                        </button>
                    </div>
                )}

                {mode === 'manual' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Component Name</label>
                            <input
                                type="text"
                                value={componentName}
                                onChange={(e) => setComponentName(e.target.value)}
                                placeholder="e.g., Population, Growth_Rate"
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Type</label>
                            <select
                                value={componentType}
                                onChange={(e) => setComponentType(e.target.value as 'state' | 'computed' | 'constant')}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="state">State (variable)</option>
                                <option value="computed">Computed (derived)</option>
                                <option value="constant">Constant (fixed)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Initial Value</label>
                            <input
                                type="number"
                                step="0.01"
                                value={initialValue}
                                onChange={(e) => setInitialValue(parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border rounded-md font-mono"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Min</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={minValue}
                                    onChange={(e) => setMinValue(e.target.value)}
                                    placeholder="No limit"
                                    className="w-full px-3 py-2 border rounded-md font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Max</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={maxValue}
                                    onChange={(e) => setMaxValue(e.target.value)}
                                    placeholder="No limit"
                                    className="w-full px-3 py-2 border rounded-md font-mono"
                                />
                            </div>
                        </div>
                        <div className="flex justify-between gap-2 mt-6">
                            <button onClick={() => setMode('choose')} className="px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                                ← Back
                            </button>
                            <div className="flex gap-2">
                                <button onClick={onClose} className="px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleManualAdd}
                                    disabled={!componentName.trim()}
                                    className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                                >
                                    Add Component
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {mode === 'ai' && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Describe the component you want to add. The AI will generate appropriate parameters.
                        </p>
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => setAIPrompt(e.target.value)}
                            placeholder="e.g., A growth rate that increases when resources are abundant and decreases under stress..."
                            className="w-full h-28 p-3 border rounded-md text-sm resize-none"
                            disabled={isLoading}
                        />
                        <div className="flex justify-between gap-2 mt-6">
                            <button onClick={() => setMode('choose')} className="px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                                ← Back
                            </button>
                            <div className="flex gap-2">
                                <button onClick={onClose} className="px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAIAdd}
                                    disabled={!aiPrompt.trim() || isLoading}
                                    className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="animate-spin">⏳</span>
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-4 h-4" />
                                            Generate
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {mode === 'choose' && (
                    <div className="flex justify-end mt-4">
                        <button onClick={onClose} className="px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

// ============================================================================
// Entity AI Edit Modal
// ============================================================================
interface EntityAIEditModalProps {
    entityName: string;
    entity: Entity;
    onClose: () => void;
}

interface EntityAIProposal {
    changes: {
        type: 'add_component' | 'modify_component' | 'delete_component' | 'add_influence' | 'modify_influence';
        target: string;
        description: string;
        reason: string;
    }[];
    affectsOtherEntities: boolean;
    otherEntityChanges?: {
        entity: string;
        description: string;
        reason: string;
    }[];
}

const EntityAIEditModal: React.FC<EntityAIEditModalProps> = ({ entityName, entity, onClose }) => {
    const { model, setModel } = useStore();
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [proposal, setProposal] = useState<EntityAIProposal | null>(null);
    const [approvedOtherChanges, setApprovedOtherChanges] = useState<Set<number>>(new Set());

    const handleAnalyze = async () => {
        if (!prompt.trim() || !model) return;
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8000/ai-edit/entity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    entity: entityName,
                    instruction: prompt,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setProposal(data.proposal);
            } else {
                // Demo fallback
                setProposal({
                    changes: [
                        {
                            type: 'add_component',
                            target: `${entityName}.NewVariable`,
                            description: 'Add a new state variable based on your request',
                            reason: prompt,
                        }
                    ],
                    affectsOtherEntities: false,
                });
            }
        } catch (error) {
            console.error('AI analysis failed:', error);
            setProposal({
                changes: [
                    {
                        type: 'modify_component',
                        target: entityName,
                        description: 'Modify entity based on request',
                        reason: prompt,
                    }
                ],
                affectsOtherEntities: false,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = () => {
        // In a real implementation, this would apply the changes
        console.log('Applying changes:', proposal);
        onClose();
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }} onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-1">
                    <Wand2 className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-lg">AI Edit Entity</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">{entityName} ({Object.keys(entity.components).length} components)</p>

                {!proposal ? (
                    <>
                        <p className="text-sm text-gray-600 mb-3">
                            Describe how you want to modify this entity. The AI will analyze the impact on the system.
                        </p>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Add a decay component, increase sensitivity to external factors, simplify the model..."
                            className="w-full h-28 p-3 border rounded-md text-sm resize-none"
                            disabled={isLoading}
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={onClose} className="px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                                Cancel
                            </button>
                            <button
                                onClick={handleAnalyze}
                                disabled={!prompt.trim() || isLoading}
                                className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4" />
                                        Analyze Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-3 mb-4">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600" />
                                Proposed Changes
                            </h4>
                            {proposal.changes.map((change, i) => (
                                <div key={i} className="p-3 bg-green-50 border border-green-200 rounded-md text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-0.5 bg-green-200 rounded">{change.type.replace('_', ' ')}</span>
                                        <span className="font-medium">{change.target}</span>
                                    </div>
                                    <div className="text-gray-600 mt-1">{change.description}</div>
                                    <div className="text-xs text-gray-500 mt-1">Reason: {change.reason}</div>
                                </div>
                            ))}
                        </div>

                        {proposal.affectsOtherEntities && proposal.otherEntityChanges && (
                            <div className="space-y-3 mb-4">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    Changes to Other Entities
                                </h4>
                                <p className="text-xs text-gray-500">
                                    These changes affect other entities. Approve the ones you want to apply.
                                </p>
                                {proposal.otherEntityChanges.map((change, i) => (
                                    <div
                                        key={i}
                                        className={`p-3 border rounded-md text-sm cursor-pointer transition-colors ${
                                            approvedOtherChanges.has(i) ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 hover:border-amber-200'
                                        }`}
                                        onClick={() => toggleOtherChange(i)}
                                    >
                                        <div className="flex items-start gap-2">
                                            <input
                                                type="checkbox"
                                                checked={approvedOtherChanges.has(i)}
                                                onChange={() => toggleOtherChange(i)}
                                                className="mt-0.5"
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium">{change.entity}</div>
                                                <div className="text-gray-600 mt-1">{change.description}</div>
                                                <div className="text-xs text-gray-500 mt-1">Why: {change.reason}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between gap-2 mt-4">
                            <button onClick={() => setProposal(null)} className="px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                                ← Back
                            </button>
                            <div className="flex gap-2">
                                <button onClick={onClose} className="px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApply}
                                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    Apply Changes
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};

// ============================================================================
// Entity JSON Editor Modal
// ============================================================================
interface EntityJSONEditorModalProps {
    entityName: string;
    entity: Entity;
    onSave: (entity: Entity) => void;
    onClose: () => void;
}

const EntityJSONEditorModal: React.FC<EntityJSONEditorModalProps> = ({ entityName, entity, onSave, onClose }) => {
    const [json, setJson] = useState(JSON.stringify(entity, null, 2));
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        try {
            const parsed = JSON.parse(json);
            onSave(parsed);
            onClose();
        } catch {
            setError('Invalid JSON format');
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }} onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-lg mb-1">Entity JSON</h3>
                <p className="text-sm text-gray-500 mb-4">{entityName}</p>

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
// Delete Entity Confirmation Modal
// ============================================================================
interface DeleteEntityConfirmModalProps {
    entityName: string;
    componentCount: number;
    influenceCount: number;
    onConfirm: () => void;
    onClose: () => void;
}

const DeleteEntityConfirmModal: React.FC<DeleteEntityConfirmModalProps> = ({
    entityName,
    componentCount,
    influenceCount,
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
                        <h3 className="font-bold text-lg">Delete Entity?</h3>
                        <p className="text-sm text-gray-500">{entityName}</p>
                    </div>
                </div>

                <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
                    <div className="text-red-700 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4" />
                            <strong>This will delete:</strong>
                        </div>
                        <ul className="ml-6 list-disc">
                            <li>{componentCount} component(s)</li>
                            <li>{influenceCount} influence(s)</li>
                        </ul>
                    </div>
                </div>

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
                        Delete Entity
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ============================================================================
// Main Group Node (Entity)
// ============================================================================
export const GroupNode: React.FC<NodeProps> = ({ data, selected }) => {
    const { model, setModel, selectNode } = useStore();
    const [showMenu, setShowMenu] = useState(false);
    const [showAddComponent, setShowAddComponent] = useState(false);
    const [showAIEdit, setShowAIEdit] = useState(false);
    const [showJSONEditor, setShowJSONEditor] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const entityName = (data as { label: string }).label;
    const entity = model?.entities[entityName];

    // Count influences
    let influenceCount = 0;
    if (entity) {
        Object.values(entity.components).forEach(comp => {
            influenceCount += comp.influences.length;
        });
        // Count outgoing influences
        if (model) {
            Object.entries(model.entities).forEach(([ent, e]) => {
                if (ent !== entityName) {
                    Object.values(e.components).forEach(comp => {
                        comp.influences.forEach(inf => {
                            if (inf.from.startsWith(`${entityName}.`)) {
                                influenceCount++;
                            }
                        });
                    });
                }
            });
        }
    }

    const handleAddComponent = () => {
        setShowMenu(false);
        setShowAddComponent(true);
    };

    const handleAIEdit = () => {
        setShowMenu(false);
        setShowAIEdit(true);
    };

    const handleViewJSON = () => {
        setShowMenu(false);
        setShowJSONEditor(true);
    };

    const handleDelete = () => {
        setShowMenu(false);
        setShowDeleteConfirm(true);
    };

    const handleAddManualComponent = (name: string, component: Component) => {
        if (!model) return;
        const newModel = JSON.parse(JSON.stringify(model));
        newModel.entities[entityName].components[name] = component;
        setModel(newModel);
    };

    const handleSaveEntity = (updatedEntity: Entity) => {
        if (!model) return;
        const newModel = JSON.parse(JSON.stringify(model));
        newModel.entities[entityName] = updatedEntity;
        setModel(newModel);
    };

    const handleConfirmDelete = () => {
        if (!model) return;
        const newModel = JSON.parse(JSON.stringify(model));

        // Remove all influences that reference this entity
        Object.values(newModel.entities).forEach((e: unknown) => {
            Object.values((e as Entity).components).forEach((comp: unknown) => {
                (comp as Component).influences = (comp as Component).influences.filter(
                    inf => !inf.from.startsWith(`${entityName}.`)
                );
            });
        });

        // Delete the entity
        delete newModel.entities[entityName];

        setModel(newModel);
        selectNode(null);
    };

    const menuButtonRef = useRef<HTMLButtonElement>(null);

    return (
        <>
            <NodeResizer
                color="#3b82f6"
                isVisible={selected}
                minWidth={200}
                minHeight={200}
            />
            <div className="w-full h-full flex flex-col">
                <div className="bg-primary text-primary-foreground px-3 py-2 font-bold text-sm rounded-t flex items-center justify-between">
                    <span>{entityName}</span>
                    <button
                        ref={menuButtonRef}
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className="p-1 rounded hover:bg-white/20 transition-colors"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
                
                {showMenu && (
                    <EntityMenu
                        onAddComponent={handleAddComponent}
                        onAIEdit={handleAIEdit}
                        onViewJSON={handleViewJSON}
                        onDelete={handleDelete}
                        onClose={() => setShowMenu(false)}
                        buttonRef={menuButtonRef}
                    />
                )}
            </div>

            {/* Modals */}
            {showAddComponent && (
                <AddComponentModal
                    entityName={entityName}
                    onAddManual={handleAddManualComponent}
                    onAddAI={(prompt) => console.log('AI add:', prompt)}
                    onClose={() => setShowAddComponent(false)}
                />
            )}

            {showAIEdit && entity && (
                <EntityAIEditModal
                    entityName={entityName}
                    entity={entity}
                    onClose={() => setShowAIEdit(false)}
                />
            )}

            {showJSONEditor && entity && (
                <EntityJSONEditorModal
                    entityName={entityName}
                    entity={entity}
                    onSave={handleSaveEntity}
                    onClose={() => setShowJSONEditor(false)}
                />
            )}

            {showDeleteConfirm && entity && (
                <DeleteEntityConfirmModal
                    entityName={entityName}
                    componentCount={Object.keys(entity.components).length}
                    influenceCount={influenceCount}
                    onConfirm={handleConfirmDelete}
                    onClose={() => setShowDeleteConfirm(false)}
                />
            )}
        </>
    );
};
