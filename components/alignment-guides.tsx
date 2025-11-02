"use client";

import { useCallback, useEffect, useState } from "react";
import { Node, useReactFlow } from "@xyflow/react";

interface AlignmentGuide {
  id: string;
  orientation: "horizontal" | "vertical";
  position: number;
  nodes: string[]; // IDs des nœuds alignés
}

const SNAP_THRESHOLD = 5; // Distance en pixels pour activer le snap

export const useAlignmentGuides = (nodes: Node[]) => {
  const { getViewport, screenToFlowPosition, flowToScreenPosition } = useReactFlow();
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  const getNodeBounds = useCallback((node: Node) => {
    // Estimer la taille si non disponible
    const width = node.width || 200;
    const height = node.height || 50;
    
    return {
      left: node.position.x,
      right: node.position.x + width,
      top: node.position.y,
      bottom: node.position.y + height,
      centerX: node.position.x + width / 2,
      centerY: node.position.y + height / 2,
    };
  }, []);

  const calculateGuides = useCallback((draggingNode: Node, otherNodes: Node[]) => {
    if (!draggingNode) return [];

    const draggingBounds = getNodeBounds(draggingNode);
    const alignmentGuides: AlignmentGuide[] = [];
    const alignments: {
      horizontal: number[];
      vertical: number[];
    } = { horizontal: [], vertical: [] };

    // Points d'alignement pour le nœud en cours de déplacement
    const draggingAlignmentPoints = {
      horizontal: [draggingBounds.top, draggingBounds.centerY, draggingBounds.bottom],
      vertical: [draggingBounds.left, draggingBounds.centerX, draggingBounds.right],
    };

    // Vérifier l'alignement avec les autres nœuds
    otherNodes.forEach((node) => {
      const bounds = getNodeBounds(node);
      
      // Points d'alignement pour l'autre nœud
      const otherAlignmentPoints = {
        horizontal: [bounds.top, bounds.centerY, bounds.bottom],
        vertical: [bounds.left, bounds.centerX, bounds.right],
      };

      // Vérifier alignement horizontal (même Y)
      draggingAlignmentPoints.horizontal.forEach((draggingY) => {
        otherAlignmentPoints.horizontal.forEach((otherY) => {
          const diff = Math.abs(draggingY - otherY);
          if (diff < SNAP_THRESHOLD) {
            alignments.horizontal.push(otherY);
          }
        });
      });

      // Vérifier alignement vertical (même X)
      draggingAlignmentPoints.vertical.forEach((draggingX) => {
        otherAlignmentPoints.vertical.forEach((otherX) => {
          const diff = Math.abs(draggingX - otherX);
          if (diff < SNAP_THRESHOLD) {
            alignments.vertical.push(otherX);
          }
        });
      });
    });

    // Créer les guides
    Array.from(new Set(alignments.horizontal)).forEach((y, index) => {
      alignmentGuides.push({
        id: `h-${y}-${index}`,
        orientation: "horizontal",
        position: y,
        nodes: [],
      });
    });

    Array.from(new Set(alignments.vertical)).forEach((x, index) => {
      alignmentGuides.push({
        id: `v-${x}-${index}`,
        orientation: "vertical",
        position: x,
        nodes: [],
      });
    });

    return alignmentGuides;
  }, [getNodeBounds]);

  const snapPosition = useCallback((node: Node, position: { x: number; y: number }) => {
    const otherNodes = nodes.filter((n) => n.id !== node.id && !n.selected);
    if (otherNodes.length === 0) return position;

    const tempNode = { ...node, position };
    const guides = calculateGuides(tempNode, otherNodes);
    
    let snappedX = position.x;
    let snappedY = position.y;
    
    const bounds = getNodeBounds({ ...node, position });

    guides.forEach((guide) => {
      if (guide.orientation === "horizontal") {
        // Snap à une ligne horizontale
        const diff = Math.abs(bounds.top - guide.position);
        if (diff < SNAP_THRESHOLD) {
          snappedY = guide.position;
        } else {
          const diffCenter = Math.abs(bounds.centerY - guide.position);
          if (diffCenter < SNAP_THRESHOLD) {
            snappedY = guide.position - (bounds.bottom - bounds.top) / 2;
          } else {
            const diffBottom = Math.abs(bounds.bottom - guide.position);
            if (diffBottom < SNAP_THRESHOLD) {
              snappedY = guide.position - (bounds.bottom - bounds.top);
            }
          }
        }
      } else {
        // Snap à une ligne verticale
        const diff = Math.abs(bounds.left - guide.position);
        if (diff < SNAP_THRESHOLD) {
          snappedX = guide.position;
        } else {
          const diffCenter = Math.abs(bounds.centerX - guide.position);
          if (diffCenter < SNAP_THRESHOLD) {
            snappedX = guide.position - (bounds.right - bounds.left) / 2;
          } else {
            const diffRight = Math.abs(bounds.right - guide.position);
            if (diffRight < SNAP_THRESHOLD) {
              snappedX = guide.position - (bounds.right - bounds.left);
            }
          }
        }
      }
    });

    return { x: snappedX, y: snappedY };
  }, [nodes, calculateGuides, getNodeBounds]);

  const handleNodeDrag = useCallback((event: any, node: Node) => {
    setDraggedNodeId(node.id);
    // Filtrer les autres nœuds (pas celui qui est en train d'être déplacé)
    const otherNodes = nodes.filter((n) => n.id !== node.id);
    // Utiliser le nœud avec sa position mise à jour
    const calculatedGuides = calculateGuides(node, otherNodes);
    setGuides(calculatedGuides);
  }, [nodes, calculateGuides]);

  const handleNodeDragStop = useCallback(() => {
    setDraggedNodeId(null);
    setGuides([]);
  }, []);

  return {
    guides,
    draggedNodeId,
    snapPosition,
    handleNodeDrag,
    handleNodeDragStop,
  };
};

