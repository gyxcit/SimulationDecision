import React, { useEffect, useMemo } from 'react';
import { useNodesState, useEdgesState, MarkerType } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { useStore } from '../store/useStore';

export const useFlowNodes = () => {
    const { model, selectedNode, showEntityBoxes } = useStore();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Store entity dimensions to preserve resizing
    const entityDimensionsRef = React.useRef<Map<string, { width: number, height: number }>>(new Map());
    // Store component positions when entity boxes are hidden
    const componentPositionsRef = React.useRef<Map<string, { x: number, y: number }>>(new Map());

    useEffect(() => {
        if (!model) return;

        // Capture current dimensions before updating
        nodes.forEach(node => {
            if (node.type === 'group' && node.style?.width && node.style?.height) {
                entityDimensionsRef.current.set(node.id, {
                    width: node.style.width as number,
                    height: node.style.height as number,
                });
            }
            // Save component positions when they are free-floating
            if (node.type === 'component' && !node.parentId) {
                componentPositionsRef.current.set(node.id, {
                    x: node.position.x,
                    y: node.position.y,
                });
            }
        });

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        let entityX = 0;
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

            // Calculate dynamic dimensions based on component count
            const componentCount = Object.keys(entity.components).length;
            const COMP_HEIGHT = 60;
            const COMP_GAP = 20;
            const PADDING = 30;
            const HEADER_HEIGHT = 50;

            // Formula: taille de base pour 4 composants minimum
            // Scaling plus agressif pour les entités avec beaucoup de composants
            const baseComponentCount = Math.max(4, componentCount);

            // Largeur: augmente linéairement avec le nombre de composants
            // Base: 450px pour 4 composants, +60px par composant supplémentaire
            const BASE_WIDTH = 450;
            const WIDTH_PER_COMPONENT = componentCount > 4 ? (componentCount - 4) * 60 : 0;
            const calculatedWidth = BASE_WIDTH + WIDTH_PER_COMPONENT;

            // Hauteur: basée sur le nombre réel de composants à afficher
            const calculatedHeight = HEADER_HEIGHT + (COMP_HEIGHT + COMP_GAP) * baseComponentCount + PADDING * 2;

            // Check if we have saved dimensions for this entity (from manual resizing)
            const savedDimensions = entityDimensionsRef.current.get(entityId);

            // Only add entity group node if showEntityBoxes is true
            if (showEntityBoxes) {
                newNodes.push({
                    id: entityId,
                    type: 'group',
                    position: { x: entityX, y: 0 },
                    style: {
                        width: savedDimensions?.width || calculatedWidth,
                        height: savedDimensions?.height || calculatedHeight,
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
            }

            // Component Nodes
            let compY = HEADER_HEIGHT;
            const parentWidth = savedDimensions?.width || calculatedWidth;

            Object.entries(entity.components).forEach(([compName, comp]) => {
                const compId = `${entityName}.${compName}`;
                
                // Calculate position based on whether entity boxes are shown
                let nodePosition;
                if (showEntityBoxes) {
                    nodePosition = { x: PADDING, y: compY };
                } else {
                    // Use saved position or calculate based on entity position
                    const savedPos = componentPositionsRef.current.get(compId);
                    nodePosition = savedPos || { 
                        x: entityX + PADDING, 
                        y: compY 
                    };
                }

                const nodeConfig: Node = {
                    id: compId,
                    position: nodePosition,
                    data: {
                        label: compName,
                        type: comp.type,
                        value: comp.initial,
                        min: comp.min,
                        max: comp.max,
                        entityName,
                    },
                    style: {
                        width: parentWidth - (PADDING * 2),
                        height: COMP_HEIGHT,
                    },
                    type: 'component',
                };

                // Only set parent if entity boxes are shown
                if (showEntityBoxes) {
                    nodeConfig.parentId = entityId;
                    nodeConfig.extent = 'parent';
                }

                newNodes.push(nodeConfig);

                compY += COMP_HEIGHT + COMP_GAP;

                // Update parent height based on children (only if entity boxes are shown)
                if (showEntityBoxes) {
                    const parentNode = newNodes.find(n => n.id === entityId);
                    if (parentNode && parentNode.style) {
                        parentNode.style.height = compY + 20;
                    }
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

            entityX += (savedDimensions?.width || calculatedWidth) + ENTITY_GAP;
        });

        setNodes(newNodes);
        setEdges(newEdges);

    }, [model, showEntityBoxes]);

    // Apply highlighting based on selected node
    const highlightedNodes = useMemo(() => {
        if (!selectedNode) return nodes;

        // Get all connected node IDs
        const connectedNodeIds = new Set<string>();

        edges.forEach(edge => {
            if (edge.source === selectedNode || edge.target === selectedNode) {
                connectedNodeIds.add(edge.source);
                connectedNodeIds.add(edge.target);
            }
        });

        return nodes.map(node => {
            const isConnected = connectedNodeIds.has(node.id);
            const isSelected = node.id === selectedNode;

            if (node.type === 'component') {
                return {
                    ...node,
                    style: {
                        ...node.style,
                        opacity: (isConnected || isSelected) ? 1 : 0.4,
                        border: isConnected ? '3px solid #3b82f6' : undefined,
                    },
                };
            }

            return node;
        });
    }, [nodes, edges, selectedNode]);

    const highlightedEdges = useMemo(() => {
        if (!selectedNode) return edges;

        return edges.map(edge => {
            const isConnected = edge.source === selectedNode || edge.target === selectedNode;

            return {
                ...edge,
                style: {
                    ...edge.style,
                    stroke: isConnected ? '#3b82f6' : edge.style?.stroke,
                    strokeWidth: isConnected ? 4 : 2,
                    opacity: isConnected ? 1 : 0.2,
                },
                markerEnd: isConnected ? {
                    type: MarkerType.ArrowClosed,
                    color: '#3b82f6',
                } : edge.markerEnd,
            };
        });
    }, [edges, selectedNode]);

    return {
        nodes: highlightedNodes,
        edges: highlightedEdges,
        onNodesChange,
        onEdgesChange
    };
};
