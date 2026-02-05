import { useEffect } from 'react';
import { useNodesState, useEdgesState, MarkerType } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { useStore } from '../store/useStore';

export const useFlowNodes = () => {
    const { model, selectNode } = useStore();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        if (!model) return;

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        let entityX = 0;
        const ENTITY_WIDTH = 300;
        const ENTITY_GAP = 50;

        // Build a map of all component names to their full paths
        const componentMap = new Map<string, string>();
        Object.entries(model.entities).forEach(([entityName, entity]) => {
            Object.keys(entity.components).forEach(compName => {
                const fullPath = `${entityName}.${compName}`;
                componentMap.set(compName, fullPath); // short name -> full path
                componentMap.set(fullPath, fullPath);  // full path -> full path
            });
        });

        Object.entries(model.entities).forEach(([entityName, entity]) => {
            // Parent Node for Entity
            const entityId = entityName;
            newNodes.push({
                id: entityId,
                type: 'group',
                position: { x: entityX, y: 0 },
                style: { 
                    width: ENTITY_WIDTH,
                    height: 400,
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    borderRadius: 8,
                    border: '1px dashed #ccc',
                    minWidth: 200,
                    minHeight: 200,
                },
                data: { 
                    label: entityName,
                    resizable: true 
                },
            });

            // Component Nodes
            let compY = 40;
            const COMP_HEIGHT = 60;
            const COMP_GAP = 20;
            const PADDING = 20;

            Object.entries(entity.components).forEach(([compName, comp]) => {
                const compId = `${entityName}.${compName}`;
                newNodes.push({
                    id: compId,
                    parentId: entityId,
                    extent: 'parent',
                    position: { x: PADDING, y: compY },
                    data: {
                        label: compName,
                        type: comp.type,
                        value: comp.initial,
                    },
                    style: {
                        width: ENTITY_WIDTH - (PADDING * 2),
                        height: COMP_HEIGHT,
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        padding: 10,
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    },
                    type: 'default',
                });

                compY += COMP_HEIGHT + COMP_GAP;

                // Update parent height based on children
                const parentNode = newNodes.find(n => n.id === entityId);
                if (parentNode && parentNode.style) {
                    parentNode.style.height = compY + 20;
                }

                // Create Edges for influences
                comp.influences.forEach(inf => {
                    let sourceId = inf.from;

                    // Resolve the source ID
                    if (sourceId === compName || sourceId === 'self') {
                        // Self-reference
                        sourceId = compId;
                    } else if (componentMap.has(sourceId)) {
                        // Use the component map to resolve
                        sourceId = componentMap.get(sourceId)!;
                    } else if (!sourceId.includes('.')) {
                        // Try prefixing with current entity
                        const localPath = `${entityName}.${sourceId}`;
                        if (componentMap.has(localPath)) {
                            sourceId = localPath;
                        }
                    }

                    // Only create edge if source exists
                    if (!componentMap.has(sourceId) && sourceId !== compId) {
                        console.warn(`Source not found: ${inf.from} -> ${sourceId}`);
                        return;
                    }

                    // Color code edges
                    const color = inf.kind === 'positive' ? '#10b981' :
                        inf.kind === 'negative' ? '#ef4444' : '#f59e0b';

                    const edgeId = `e-${sourceId}-${compId}-${inf.kind}`;
                    
                    newEdges.push({
                        id: edgeId,
                        source: sourceId,
                        target: compId,
                        animated: inf.enabled,
                        style: { 
                            stroke: color,
                            strokeWidth: 2,
                            opacity: inf.enabled ? 1 : 0.3
                        },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: color
                        },
                        label: `${inf.coef > 0 ? '+' : ''}${inf.coef.toFixed(2)}`,
                        labelStyle: { fontSize: 10, fill: color },
                    });
                });
            });

            entityX += ENTITY_WIDTH + ENTITY_GAP;
        });

        setNodes(newNodes);
        setEdges(newEdges);

    }, [model]);

    return { nodes, edges, onNodesChange, onEdgesChange };
};
