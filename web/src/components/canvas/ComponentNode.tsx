import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

export const ComponentNode: React.FC<NodeProps> = ({ data: rawData }) => {
    const data = rawData as {
        label: string;
        type: 'state' | 'computed' | 'constant';
        value: number;
        min?: number;
        max?: number;
        entityName: string;
    };

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

    return (
        <div className={`p-2 rounded border-2 ${typeColors[data.type]} min-w-[240px]`}>
            <Handle type="target" position={Position.Left} />

            <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{typeIcons[data.type]}</span>
                <div className="flex-1">
                    <div className="font-semibold text-sm">{data.label}</div>
                    <div className="text-xs text-muted-foreground capitalize">{data.type}</div>
                </div>
            </div>

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
    );
};
