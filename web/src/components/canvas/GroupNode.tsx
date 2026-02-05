import React from 'react';
import { NodeResizer } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

export const GroupNode: React.FC<NodeProps> = ({ data, selected }) => {
    return (
        <>
            <NodeResizer
                color="#3b82f6"
                isVisible={selected}
                minWidth={200}
                minHeight={200}
            />
            <div className="w-full h-full flex flex-col">
                <div className="bg-primary text-primary-foreground px-3 py-2 font-bold text-sm rounded-t">
                    {(data as { label: string }).label}
                </div>
            </div>
        </>
    );
};
