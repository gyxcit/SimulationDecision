import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store/useStore';
import { X, ArrowRight } from 'lucide-react';
import type { Influence, InfluenceKind, InfluenceFunction } from '../../types';

interface AddInfluenceModalProps {
    from: string;
    to: string; // "Entity.Component"
    onClose: () => void;
}

export const AddInfluenceModal: React.FC<AddInfluenceModalProps> = ({ from, to, onClose }) => {
    const { model, addInfluence } = useStore();
    const [coef, setCoef] = useState(1.0);
    const [kind, setKind] = useState<InfluenceKind>('positive');
    const [func, setFunc] = useState<InfluenceFunction>('linear');

    // Parse from/to to see if they are Entity or Entity.Component
    const fromParts = from.split('.');
    const toParts = to.split('.');

    const fromEntity = fromParts[0];
    const toEntity = toParts[0];

    // If only entity provided, we need to select component
    const [selectedFromComp, setSelectedFromComp] = useState(fromParts[1] || '');
    const [selectedToComp, setSelectedToComp] = useState(toParts[1] || '');

    // Get available components
    const fromComponents = model?.entities[fromEntity]?.components ? Object.keys(model.entities[fromEntity].components) : [];
    const toComponents = model?.entities[toEntity]?.components ? Object.keys(model.entities[toEntity].components) : [];

    // Auto-select first component if not set
    React.useEffect(() => {
        if (!selectedFromComp && fromComponents.length > 0) setSelectedFromComp(fromComponents[0]);
    }, [fromComponents, selectedFromComp]);

    React.useEffect(() => {
        if (!selectedToComp && toComponents.length > 0) setSelectedToComp(toComponents[0]);
    }, [toComponents, selectedToComp]);

    const handleSave = () => {
        if (!selectedFromComp || !selectedToComp) return;

        const finalFrom = `${fromEntity}.${selectedFromComp}`;
        const finalTo = `${toEntity}.${selectedToComp}`;

        const influence: Influence = {
            from: finalFrom,
            coef,
            kind,
            function: func,
            enabled: true
        };
        addInfluence(finalTo, influence);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5 relative">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-4 h-4" />
                </button>

                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    Add Connection
                </h3>

                <div className="bg-gray-50 p-3 rounded-md mb-4 space-y-2">
                    {/* From Section */}
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500 uppercase">From</span>
                        {fromParts.length === 2 ? (
                            <span className="font-mono font-medium">{from}</span>
                        ) : (
                            <div className="flex items-center gap-1">
                                <span className="font-mono text-gray-600">{fromEntity}.</span>
                                <select
                                    value={selectedFromComp}
                                    onChange={(e) => setSelectedFromComp(e.target.value)}
                                    className="border rounded px-2 py-1 text-sm flex-1 font-mono"
                                >
                                    {fromComponents.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>

                    {/* To Section */}
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500 uppercase">To</span>
                        {toParts.length === 2 ? (
                            <span className="font-mono font-medium">{to}</span>
                        ) : (
                            <div className="flex items-center gap-1">
                                <span className="font-mono text-gray-600">{toEntity}.</span>
                                <select
                                    value={selectedToComp}
                                    onChange={(e) => setSelectedToComp(e.target.value)}
                                    className="border rounded px-2 py-1 text-sm flex-1 font-mono"
                                >
                                    {toComponents.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Coefficient</label>
                        <input
                            type="number"
                            step="0.1"
                            value={coef}
                            onChange={(e) => setCoef(parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Kind</label>
                        <select
                            value={kind}
                            onChange={(e) => setKind(e.target.value as InfluenceKind)}
                            className="w-full px-3 py-2 border rounded-md"
                        >
                            <option value="positive">Positive (+)</option>
                            <option value="negative">Negative (-)</option>
                            <option value="decay">Decay</option>
                            <option value="ratio">Ratio</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Function</label>
                        <select
                            value={func}
                            onChange={(e) => setFunc(e.target.value as InfluenceFunction)}
                            className="w-full px-3 py-2 border rounded-md"
                        >
                            <option value="linear">Linear</option>
                            <option value="sigmoid">Sigmoid</option>
                            <option value="threshold">Threshold</option>
                            <option value="division">Division</option>
                            <option value="square">Square (x²)</option>
                            <option value="cubic">Cubic (x³)</option>
                            <option value="sqrt">Square Root (√x)</option>
                            <option value="exponential">Exponential (eˣ)</option>
                            <option value="logarithmic">Logarithmic (ln x)</option>
                            <option value="inverse_square">Inverse Square (1/x²)</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-sm hover:bg-gray-100 rounded-md">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90">
                        Create Connection
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
