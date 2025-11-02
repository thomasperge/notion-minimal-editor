"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useTheme } from "next-themes";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  MarkerType,
  NodeTypes,
  useReactFlow,
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { EditableNode } from "./editable-node";
import { TextInputNode } from "./nodes/text-input-node";
import { ImageInputNode } from "./nodes/image-input-node";
import { NumberInputNode } from "./nodes/number-input-node";
import { TodoListNode } from "./nodes/todo-list-node";
import { PropertiesPanel } from "./properties-panel";
import { BlockSearchMenu } from "./block-search-menu";
import { useAlignmentGuides } from "./alignment-guides";
import { PanelRightClose, PanelRight } from "lucide-react";

interface CanvasEditorProps {
  onChange?: (nodesJson: string) => void;
  initialContent?: string;
  editable?: boolean;
  onEditorReady?: (nodes: Node[], edges: Edge[]) => void;
}

const CanvasEditor = ({
  onChange,
  initialContent,
  editable = true,
  onEditorReady,
}: CanvasEditorProps) => {
  const { resolvedTheme } = useTheme();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [blockMenuPosition, setBlockMenuPosition] = useState<{ x: number; y: number } | undefined>();
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(true);
  const viewportRef = useRef({ x: 0, y: 0, zoom: 1 });

  // Define node types
  const nodeTypes = useMemo<NodeTypes>(() => ({
    default: EditableNode as any,
    textInput: TextInputNode as any,
    imageInput: ImageInputNode as any,
    numberInput: NumberInputNode as any,
    todoList: TodoListNode as any,
  }), []);

  // Parse initial content
  const parsedContent = useMemo(() => {
    if (initialContent && initialContent.trim() !== "") {
      try {
        const parsed = JSON.parse(initialContent);
        if (parsed.nodes && parsed.edges) {
          // Filter out edges with invalid handle IDs
          const validEdges = parsed.edges.filter((edge: Edge) => {
            // Only allow connections between valid handle IDs
            const validSourceHandles = ['text-output', 'image-output', 'number-output', 'todo-output', 'default-output'];
            const validTargetHandles = ['text-input', 'image-input', 'number-input', 'todo-input', 'default-input'];

            const hasValidSource = !edge.sourceHandle || validSourceHandles.includes(edge.sourceHandle);
            const hasValidTarget = !edge.targetHandle || validTargetHandles.includes(edge.targetHandle);

            return hasValidSource && hasValidTarget;
          });

          return { initialNodes: parsed.nodes, initialEdges: validEdges };
        }
      } catch (error) {
        console.error("Failed to parse initialContent:", error);
      }
    }
    // Default initial state with a welcome node
    return {
      initialNodes: [
        {
          id: "welcome-1",
          type: "textInput",
          data: { text: "Welcome to your canvas! 👋\n\nStart by adding nodes using the '+' button or press '/' to search." },
          position: { x: 250, y: 250 },
        },
      ],
      initialEdges: [],
    };
  }, [initialContent]);

  const [nodes, setNodes, onNodesChange] = useNodesState(parsedContent.initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(parsedContent.initialEdges);

  // Handle node selection
  useEffect(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (selectedNodes.length === 1) {
      setSelectedNode(selectedNodes[0]);
    } else {
      setSelectedNode(null);
    }
  }, [nodes]);

  // Notify parent when content changes (debounced)
  useEffect(() => {
    if (onChange) {
      const timer = setTimeout(() => {
        const content = JSON.stringify({ nodes, edges }, null, 2);
        onChange(content);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [nodes, edges, onChange]);

  // Notify parent when editor is ready
  useEffect(() => {
    if (onEditorReady) {
      onEditorReady(nodes, edges);
    }
  }, []); // Only on mount

  // Validate connections - allow all connections
  const isValidConnection = useCallback((connection: Connection | Edge) => {
    return true;
  }, []);

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Handle block search menu (triggered by "/" or other shortcut) and node deletion
  useEffect(() => {
    if (!editable) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when user is editing text
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      // Open block menu with "/"
      if (e.key === "/" && !showBlockMenu) {
        e.preventDefault();
        // Center the menu on screen
        setBlockMenuPosition({
          x: window.innerWidth / 2 - 150,
          y: window.innerHeight / 2 - 200,
        });
        setShowBlockMenu(true);
      }

      // Delete selected nodes with Delete or Backspace
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNode) {
        e.preventDefault();
        // Remove the node
        setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
        // Remove connected edges
        setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
        setSelectedNode(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editable, showBlockMenu, selectedNode, setNodes, setEdges]);

  // Handle paste image (Ctrl+V or Cmd+V) - will be handled in CanvasContent
  const handlePasteImageRef = useRef<((imageUrl: string) => void) | null>(null);

  // Global paste handler - delegates to ref
  useEffect(() => {
    if (!editable) return;

    const handlePaste = async (e: ClipboardEvent) => {
      // Don't handle paste if user is editing text in an input/textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items || !handlePasteImageRef.current) return;

      // Look for image in clipboard
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();

          const file = items[i].getAsFile();
          if (!file) continue;

          // Convert file to data URL
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageUrl = event.target?.result as string;
            if (handlePasteImageRef.current) {
              handlePasteImageRef.current(imageUrl);
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [editable]);

  // Handle node data change from properties panel
  const handleNodeChange = useCallback(
    (nodeId: string, newData: any) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
        )
      );
    },
    [setNodes]
  );

  // Handle node deletion from properties panel
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }
    },
    [setNodes, setEdges, selectedNode]
  );

  const isDark = resolvedTheme === "dark";

  // Zoom Controls Component - separate to access ReactFlow hooks
  const ZoomControlsStatic = ({ hasSelectedNode }: { hasSelectedNode: boolean }) => {
    const { getZoom, zoomIn, zoomOut } = useReactFlow();
    const [zoomLevel, setZoomLevel] = useState(100);

    // Update zoom level display
    useEffect(() => {
      const updateZoom = () => {
        const currentZoom = getZoom();
        const roundedZoom = Math.round(currentZoom * 100);
        setZoomLevel(roundedZoom);
      };

      updateZoom();
      const interval = setInterval(updateZoom, 100);
      return () => clearInterval(interval);
    }, [getZoom]);

    const handleZoomIn = () => {
      zoomIn();
    };

    const handleZoomOut = () => {
      zoomOut();
    };

    return (
      <div className="flex items-center gap-1 bg-white/95 dark:bg-[#191919] dark:border-stone-700 backdrop-blur-sm border border-stone-300 rounded-xl px-1.5 py-1">
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-full transition-colors hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
          aria-label="Zoom out"
        >
          <svg
            className="w-4 h-4 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
            />
          </svg>
        </button>
        <span className="text-sm font-normal min-w-[3rem] text-center text-gray-900 dark:text-gray-100">
          {zoomLevel}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-full transition-colors hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
          aria-label="Zoom in"
        >
          <svg
            className="w-4 h-4 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
            />
          </svg>
        </button>
      </div>
    );
  };

  // Inner component to use ReactFlow hooks
  const CanvasContent = ({ hasSelectedNode, propertiesPanelOpen, onTogglePropertiesPanel }: { hasSelectedNode: boolean; propertiesPanelOpen: boolean; onTogglePropertiesPanel: () => void }) => {
    const { screenToFlowPosition, getViewport, flowToScreenPosition } = useReactFlow();
    const { guides, snapPosition, handleNodeDrag, handleNodeDragStop } = useAlignmentGuides(nodes);
    
    // Enhanced onNodesChange avec snap
    const onNodesChangeWithSnap = useCallback((changes: any) => {
      // Mettre à jour les nodes localement pour que snapPosition ait les dernières positions
      const updatedNodes = nodes.map(node => {
        const change = changes.find((c: any) => c.id === node.id && c.type === "position");
        if (change && change.position) {
          return { ...node, position: change.position };
        }
        return node;
      });
      
      changes.forEach((change: any) => {
        if (change.type === "position" && change.position && change.dragging) {
          const node = updatedNodes.find((n) => n.id === change.id);
          if (node) {
            const snappedPos = snapPosition(node, change.position);
            change.position = snappedPos;
          }
        }
      });
      onNodesChange(changes);
    }, [nodes, onNodesChange, snapPosition]);

    const handleSelectBlockWithPosition = useCallback(
      (blockType: string) => {
        // Get center of viewport in flow coordinates
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const flowPosition = screenToFlowPosition({ x: centerX, y: centerY });

        // Default data based on block type
        let defaultData: any = {};
        if (blockType === "textInput") {
          defaultData = { text: "" };
        } else if (blockType === "imageInput") {
          defaultData = { imageUrl: "" };
        } else if (blockType === "numberInput") {
          defaultData = { number: undefined };
        } else if (blockType === "todoList") {
          defaultData = { items: [] };
        }

        const newNode: Node = {
          id: `${blockType}-${Date.now()}`,
          type: blockType,
          data: defaultData,
          position: flowPosition,
        };
        setNodes((nds) => [...nds, newNode]);
        setShowBlockMenu(false);
      },
      [setNodes, screenToFlowPosition]
    );

    // Handle paste image with proper positioning
    useEffect(() => {
      handlePasteImageRef.current = (imageUrl: string) => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const flowPosition = screenToFlowPosition({ x: centerX, y: centerY });

        const newNode: Node = {
          id: `imageInput-${Date.now()}`,
          type: "imageInput",
          data: { imageUrl },
          position: flowPosition,
        };
        setNodes((nds) => [...nds, newNode]);
      };

      return () => {
        handlePasteImageRef.current = null;
      };
    }, [setNodes, screenToFlowPosition]);

    return (
      <div
        className="relative h-full overflow-hidden"
        style={{
          width: propertiesPanelOpen ? 'calc(100% - 320px)' : '100%', // Make space for sidebar if open
        }}
      >
        {/* Properties Panel Toggle Button - Top Right */}
        <button
          onClick={onTogglePropertiesPanel}
          className="absolute top-4 right-4 z-[100] p-2 rounded-md bg-white/95 dark:bg-[#191919] backdrop-blur-sm border border-stone-300 dark:border-stone-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
          aria-label={propertiesPanelOpen ? "Hide properties panel" : "Show properties panel"}
          title={propertiesPanelOpen ? "Hide properties panel" : "Show properties panel"}
        >
          {propertiesPanelOpen ? (
            <PanelRightClose className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          ) : (
            <PanelRight className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          )}
        </button>
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChangeWithSnap}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          nodesDraggable={editable}
          nodesConnectable={editable}
          elementsSelectable={editable}
          connectionMode={ConnectionMode.Loose}
          isValidConnection={isValidConnection}
          minZoom={0.1}
          maxZoom={2}
          zoomOnScroll={true}
          panOnDrag={true}
          autoPanOnNodeDrag={true}
          fitView={false}
          proOptions={{ hideAttribution: true }}
          defaultViewport={viewportRef.current}
          onMove={(event, newViewport) => {
            viewportRef.current = newViewport;
          }}
        >
          <Background gap={12} color={isDark ? "#444" : "#d4d4d4"} size={1} />
          
          {/* Alignment Guides */}
          <Panel position="top-left" className="pointer-events-none z-10">
            {guides.length > 0 && (
              <div className="absolute inset-0" style={{ width: '100vw', height: '100vh' }}>
                {guides.map((guide) => {
                  const viewport = getViewport();
                  
                  if (guide.orientation === "horizontal") {
                    const screenPos = flowToScreenPosition({ x: 0, y: guide.position });
                    return (
                      <div
                        key={guide.id}
                        className="absolute left-0 right-0"
                        style={{
                          top: `${screenPos.y}px`,
                          height: '2px',
                          background: 'linear-gradient(to right, transparent, #3b82f6 20%, #3b82f6 80%, transparent)',
                          pointerEvents: 'none',
                        }}
                      />
                    );
                  } else {
                    const screenPos = flowToScreenPosition({ x: guide.position, y: 0 });
                    return (
                      <div
                        key={guide.id}
                        className="absolute top-0 bottom-0"
                        style={{
                          left: `${screenPos.x}px`,
                          width: '2px',
                          background: 'linear-gradient(to bottom, transparent, #3b82f6 20%, #3b82f6 80%, transparent)',
                          pointerEvents: 'none',
                        }}
                      />
                    );
                  }
                })}
              </div>
            )}
          </Panel>
        </ReactFlow>

        {/* Add Node Button - Bottom Center */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[100] pointer-events-auto">
          <button
            onClick={() => {
              setBlockMenuPosition({
                x: window.innerWidth / 2 - 150,
                y: window.innerHeight / 2 - 200,
              });
              setShowBlockMenu(true);
            }}
            className="flex items-center gap-2 bg-white/95 dark:bg-[#191919] dark:border-stone-700 backdrop-blur-sm border border-stone-300 rounded-xl px-4 py-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label="Add node"
          >
            <svg
              className="w-4 h-4 text-gray-700 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-sm font-normal text-gray-900 dark:text-gray-100">
              Add Node
            </span>
          </button>
        </div>

        {/* Block Search Menu */}
        <BlockSearchMenu
          isOpen={showBlockMenu}
          onClose={() => setShowBlockMenu(false)}
          onSelectBlock={handleSelectBlockWithPosition}
          position={blockMenuPosition}
        />
      </div>
    );
  };

  return (
    <div
      className="w-full h-[calc(100vh-3.5rem)] relative overflow-hidden"
      style={{ width: '100%', height: 'calc(100vh - 3.5rem)' }}
      data-testid="canvas-editor-container"
    >
      <ReactFlowProvider>
        <CanvasContent 
          hasSelectedNode={!!selectedNode} 
          propertiesPanelOpen={propertiesPanelOpen}
          onTogglePropertiesPanel={() => setPropertiesPanelOpen(!propertiesPanelOpen)}
        />
        {/* Zoom Controls - Positioned relative to canvas, not sidebar */}
        <div
          className="absolute bottom-4 z-[100] pointer-events-auto"
          style={{
            right: propertiesPanelOpen ? '336px' : '16px', // 320px (sidebar) + 16px margin from canvas edge, or just 16px if closed
            bottom: '16px',
          }}
          data-testid="zoom-controls-fixed"
        >
          <ZoomControlsStatic hasSelectedNode={!!selectedNode} />
        </div>
      </ReactFlowProvider>

      {/* Properties Panel */}
      {propertiesPanelOpen && (
        <PropertiesPanel 
          selectedNode={selectedNode} 
          onNodeChange={handleNodeChange}
          onNodeDelete={handleNodeDelete}
        />
      )}
    </div>
  );
};

export default CanvasEditor;

