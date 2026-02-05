import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFlowNodes } from '../../hooks/useFlowNodes';
import { useStore } from '../../store/useStore';
import { GroupNode } from './GroupNode';
import { ComponentNode } from './ComponentNode';

export const Flow: React.FC = () => {
    const { nodes, edges, onNodesChange, onEdgesChange } = useFlowNodes();
    const { selectNode } = useStore();

    // Register custom node types
    const nodeTypes = useMemo(() => ({
        group: GroupNode,
        component: ComponentNode,
    }), []);

    return (
        <div className="h-full w-full bg-slate-50">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => selectNode(node.id)}
                onPaneClick={() => selectNode(null)} // Deselect when clicking canvas
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-right"
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
                minZoom={0.1}
                maxZoom={4}
            >
                <Background color="#aaa" gap={16} />
                <Controls
                    showZoom
                    showFitView
                    showInteractive
                    position="bottom-left"
                />
                <MiniMap
                    nodeColor={(node) => {
                        if (node.type === 'group') return '#e0e7ff';
                        return '#fff';
                    }}
                    maskColor="rgba(0, 0, 0, 0.1)"
                    position="bottom-right"
                    style={{
                        backgroundColor: 'white',
                        border: '1px solid #ddd'
                    }}
                />
            </ReactFlow>
        </div>
    );
};
