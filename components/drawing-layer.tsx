"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { ChevronDown, ChevronRight, Undo2, Redo2 } from "lucide-react";

interface DrawingPath {
  points: { x: number; y: number }[]; // Flow coordinates
  color: string;
  strokeWidth: number;
}

interface DrawingLayerProps {
  isDrawing: boolean;
  drawings: DrawingPath[]; // Array of drawing paths
  onDrawingsChange: (drawings: DrawingPath[]) => void;
  width: number;
  height: number;
  color?: string;
  strokeWidth?: number;
  onColorChange?: (color: string) => void;
  onStrokeWidthChange?: (width: number) => void;
  onViewportChange?: () => void; // Callback when viewport changes
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const DrawingLayer = ({
  isDrawing,
  drawings,
  onDrawingsChange,
  width,
  height,
  color = "#000000",
  strokeWidth = 2,
  onColorChange,
  onStrokeWidthChange,
  onViewportChange,
  canUndo: canUndoProp,
  canRedo: canRedoProp,
  onUndo: onUndoProp,
  onRedo: onRedoProp,
}: DrawingLayerProps) => {
  const { screenToFlowPosition, getViewport, flowToScreenPosition } = useReactFlow();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<{ x: number; y: number; flowX: number; flowY: number }[]>([]);
  const [showControls, setShowControls] = useState(false);
  const [viewportVersion, setViewportVersion] = useState(0);

  // Utiliser les props undo/redo du parent si disponibles, sinon utiliser l'historique local
  const canUndo = canUndoProp !== undefined ? canUndoProp : false;
  const canRedo = canRedoProp !== undefined ? canRedoProp : false;
  const handleUndo = onUndoProp || (() => {});
  const handleRedo = onRedoProp || (() => {});

  // Function to redraw all drawings
  const redrawDrawings = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const viewport = getViewport();
    drawings.forEach((path) => {
      if (path.points.length < 2) return;

      ctx.save();
      ctx.strokeStyle = path.color;
      // Keep stroke width constant in screen pixels, so multiply by zoom
      ctx.lineWidth = path.strokeWidth * viewport.zoom;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      const firstPoint = flowToScreenPosition({ x: path.points[0].x, y: path.points[0].y });
      ctx.moveTo(firstPoint.x - rect.left, firstPoint.y - rect.top);

      for (let i = 1; i < path.points.length; i++) {
        const screenPoint = flowToScreenPosition({ x: path.points[i].x, y: path.points[i].y });
        ctx.lineTo(screenPoint.x - rect.left, screenPoint.y - rect.top);
      }

      ctx.stroke();
      ctx.restore();
    });
  }, [drawings, getViewport, flowToScreenPosition]);

  // Initialize canvas
  useEffect(() => {
    redrawDrawings();
  }, [width, height, redrawDrawings]);

  // Redraw when viewport changes
  useEffect(() => {
    redrawDrawings();
  }, [viewportVersion, redrawDrawings]);

  // Expose redraw function to parent via ref
  const redrawRef = useRef(redrawDrawings);
  useEffect(() => {
    redrawRef.current = redrawDrawings;
  }, [redrawDrawings]);

  // Expose redraw function globally so parent can call it
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__drawingLayerRedraw = () => redrawRef.current();
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__drawingLayerRedraw;
      }
    };
  }, []);

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const screenX =
        "touches" in e
          ? e.touches[0].clientX
          : e.clientX;
      const screenY =
        "touches" in e
          ? e.touches[0].clientY
          : e.clientY;

      // Convert screen coordinates to flow coordinates
      const flowPos = screenToFlowPosition({ x: screenX, y: screenY });

      // Also store screen coordinates for drawing
      const x = screenX - rect.left;
      const y = screenY - rect.top;

      isDrawingRef.current = true;
      currentPathRef.current = [{ x, y, flowX: flowPos.x, flowY: flowPos.y }];
    },
    [isDrawing, screenToFlowPosition]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !isDrawingRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Update drawing style
      ctx.strokeStyle = color;
      const viewport = getViewport();
      // Keep stroke width constant in screen pixels, so multiply by zoom
      ctx.lineWidth = strokeWidth * viewport.zoom;

      const rect = canvas.getBoundingClientRect();
      const screenX =
        "touches" in e
          ? e.touches[0].clientX
          : e.clientX;
      const screenY =
        "touches" in e
          ? e.touches[0].clientY
          : e.clientY;

      // Convert to flow coordinates
      const flowPos = screenToFlowPosition({ x: screenX, y: screenY });

      // Screen coordinates for drawing
      const x = screenX - rect.left;
      const y = screenY - rect.top;

      const lastPoint = currentPathRef.current[currentPathRef.current.length - 1];
      if (lastPoint) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      currentPathRef.current.push({ x, y, flowX: flowPos.x, flowY: flowPos.y });

      // Draw current path directly on canvas (ctx is already defined above)
      if (currentPathRef.current.length > 1) {
        ctx.save();
        ctx.strokeStyle = color;
        const viewport = getViewport();
        // Keep stroke width constant in screen pixels, so multiply by zoom
        ctx.lineWidth = strokeWidth * viewport.zoom;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        const lastPoint = currentPathRef.current[currentPathRef.current.length - 2];
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
      }
    },
    [isDrawing, color, strokeWidth, screenToFlowPosition, getViewport, redrawDrawings]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current || currentPathRef.current.length === 0) return;

    isDrawingRef.current = false;

    // Save the path in flow coordinates
    const flowPoints = currentPathRef.current.map(p => ({ x: p.flowX, y: p.flowY }));
    if (flowPoints.length < 2) {
      // Not enough points, don't save
      currentPathRef.current = [];
      return;
    }

    const newPath: DrawingPath = {
      points: flowPoints,
      color,
      strokeWidth,
    };

    // Créer le nouvel état avec le nouveau path
    const newDrawings = [...drawings, newPath];
    
    console.log('[UNDO/REDO] stopDrawing: Nouveau dessin créé', {
      drawingsLength: drawings.length,
      newDrawingsLength: newDrawings.length
    });
    
    // L'historique est géré par le parent via setDrawingsWithHistory
    onDrawingsChange(newDrawings);

    // Clear current path and redraw
    currentPathRef.current = [];
    redrawDrawings();
  }, [drawings, onDrawingsChange, color, strokeWidth, redrawDrawings]);

  const clearDrawing = useCallback(() => {
    console.log('[UNDO/REDO] clearDrawing appelé');
    // L'historique est géré par le parent via setDrawingsWithHistory
    onDrawingsChange([]);
  }, [onDrawingsChange]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full ${isDrawing ? "pointer-events-auto" : "pointer-events-none"}`}
        onMouseDown={isDrawing ? startDrawing : undefined}
        onMouseMove={isDrawing ? draw : undefined}
        onMouseUp={isDrawing ? stopDrawing : undefined}
        onMouseLeave={isDrawing ? stopDrawing : undefined}
        onTouchStart={isDrawing ? startDrawing : undefined}
        onTouchMove={isDrawing ? draw : undefined}
        onTouchEnd={isDrawing ? stopDrawing : undefined}
        style={{
          cursor: isDrawing ? "crosshair" : "default",
          touchAction: isDrawing ? "none" : "auto",
        }}
      />
      {isDrawing && (
        <div
          className="absolute top-4 left-4 pointer-events-auto z-[100]"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <div className="flex items-start gap-2">
            <div
              className="bg-white/95 dark:bg-[#191919] backdrop-blur-sm border border-stone-300 dark:border-stone-700 rounded-xl min-w-[240px]"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 w-[238px]">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowControls(!showControls);
                  }}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  {showControls ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  )}
                  <span>Options de dessin</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    clearDrawing();
                  }}
                  className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                >
                  Effacer
                </button>
              </div>

              {/* Controls */}
              {showControls && (
                <div className="p-3 space-y-4 border-t border-stone-200 dark:border-stone-700 max-w-[238px]"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  {/* Couleur */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Couleur
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { name: "Noir", value: "#000000" },
                        { name: "Rouge", value: "#ef4444" },
                        { name: "Orange", value: "#f97316" },
                        { name: "Jaune", value: "#eab308" },
                        { name: "Vert", value: "#22c55e" },
                        { name: "Cyan", value: "#06b6d4" },
                        { name: "Bleu", value: "#3b82f6" },
                        { name: "Violet", value: "#8b5cf6" },
                        { name: "Rose", value: "#ec4899" },
                        { name: "Gris", value: "#6b7280" },
                        { name: "Blanc", value: "#ffffff" },
                        { name: "Marron", value: "#a16207" },
                      ].map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          onMouseUp={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onColorChange?.(c.value);
                          }}
                          className={`w-8 h-8 rounded border-2 transition-all ${color === c.value
                            ? "border-gray-700 dark:border-gray-300 ring-1 ring-offset-1 ring-gray-400 dark:ring-gray-500"
                            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                            }`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Épaisseur */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Épaisseur
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[
                        { value: 2 },
                        { value: 4 },
                        { value: 6 },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          onMouseUp={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onStrokeWidthChange?.(option.value);
                          }}
                          className={`flex-1 flex items-center justify-center px-2 py-1.5 h-8 rounded border transition-all ${strokeWidth === option.value
                            ? "bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-500"
                            : "bg-white dark:bg-[#171717] border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900"
                            }`}
                        >
                          <div
                            className="w-8"
                            style={{
                              height: `${option.value}px`,
                              backgroundColor: color,
                              borderRadius: '2px',
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Undo/Redo buttons - Outside header, to the right, aligned to top */}
            <div
              className="flex items-center gap-1 p-2 bg-white/95 dark:bg-[#191919] backdrop-blur-sm border border-stone-300 dark:border-stone-700 rounded-xl self-start"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <button
                type="button"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleUndo();
                }}
                disabled={!canUndo}
                className={`p-1.5 rounded transition-colors ${canUndo
                    ? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  }`}
                title="Annuler"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleRedo();
                }}
                disabled={!canRedo}
                className={`p-1.5 rounded transition-colors ${canRedo
                    ? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  }`}
                title="Refaire"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


