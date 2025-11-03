"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { Node } from "@xyflow/react";
import { Play, MoreVertical, Trash2, X } from "lucide-react";
import { compressImage } from "../utils/image-compression";

interface PropertiesPanelProps {
  selectedNode: Node | null;
  onNodeChange?: (nodeId: string, data: any) => void;
  onNodeDelete?: (nodeId: string) => void;
}

// Composant séparé pour les propriétés d'image (pour utiliser des hooks)
const ImageInputProperties = ({
  selectedNode,
  nodeData,
  onNodeChange,
}: {
  selectedNode: Node;
  nodeData: any;
  onNodeChange?: (nodeId: string, data: any) => void;
}) => {
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  const handleImageFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        alert("Veuillez sélectionner un fichier image");
        if (imageFileInputRef.current) {
          imageFileInputRef.current.value = "";
        }
        return;
      }

      setIsLoadingImage(true);

      // Compresser l'image avant de la sauvegarder (compression agressive)
      compressImage(file, {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.65,
        maxSizeKB: 120,
      })
        .then((compressedDataUrl) => {
          if (onNodeChange) {
            onNodeChange(selectedNode.id, { ...nodeData, imageUrl: compressedDataUrl });
          }
          setIsLoadingImage(false);
          if (imageFileInputRef.current) {
            imageFileInputRef.current.value = "";
          }
        })
        .catch((error) => {
          console.error("Erreur lors de la compression du fichier:", error);
          setIsLoadingImage(false);
          if (imageFileInputRef.current) {
            imageFileInputRef.current.value = "";
          }
          // Fallback: utiliser l'image originale si la compression échoue
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result === "string" && onNodeChange) {
              onNodeChange(selectedNode.id, { ...nodeData, imageUrl: result });
            }
          };
          reader.onerror = () => {
            console.error("Erreur lors de la lecture du fichier");
          };
          reader.readAsDataURL(file);
        });
    },
    [selectedNode.id, nodeData, onNodeChange]
  );

  const handleChangeImageClick = useCallback(() => {
    imageFileInputRef.current?.click();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Image
        </label>
        {typeof nodeData.imageUrl === "string" && nodeData.imageUrl ? (
          <div className="space-y-2">
            <img
              src={nodeData.imageUrl}
              alt="Preview"
              className="w-full rounded border border-gray-300 dark:border-gray-600 max-h-48 object-contain bg-gray-50 dark:bg-gray-900"
              onError={() => {
                console.error("Erreur lors de l'affichage de l'image");
              }}
            />
            <button
              type="button"
              onClick={handleChangeImageClick}
              disabled={isLoadingImage}
              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-background hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingImage ? "Chargement..." : "Changer l'image"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleChangeImageClick}
            disabled={isLoadingImage}
            className="w-full px-3 py-2 text-xs border-2 border-dashed border-gray-300 dark:border-gray-600 rounded bg-background hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingImage ? "Chargement..." : "Sélectionner une image"}
          </button>
        )}
        <input
          ref={imageFileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileSelect}
          className="hidden"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Image URL
        </label>
        <input
          type="text"
          value={typeof nodeData.imageUrl === "string" ? nodeData.imageUrl : ""}
          onChange={(e) => {
            if (onNodeChange) {
              onNodeChange(selectedNode.id, { ...nodeData, imageUrl: e.target.value });
            }
          }}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ou entrez une URL d'image..."
        />
      </div>
    </div>
  );
};

export const PropertiesPanel = ({ selectedNode, onNodeChange, onNodeDelete }: PropertiesPanelProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [localText, setLocalText] = useState("");

  // Synchronise localText quand le node change
  useEffect(() => {
    if (selectedNode?.type === "textInput") {
      const initial = selectedNode.data?.text;
      setLocalText(typeof initial === "string" ? initial : "");
    }
  }, [selectedNode?.id, selectedNode?.data?.text]);

  // Auto resize du textarea
  useLayoutEffect(() => {
    if (selectedNode?.type === "textInput" && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [localText]);

  if (!selectedNode) {
    return (
      <aside className="w-80 border-l bg-background fixed right-0 top-14 h-[calc(100vh-3.5rem)] z-[90] flex items-center justify-center">
        <div className="text-sm text-muted-foreground px-4 text-center">
          Select a node to view its properties
        </div>
      </aside>
    );
  }

  const nodeType = selectedNode.type || "default";
  const nodeData = selectedNode.data || {};

  const renderNodeProperties = () => {
    switch (nodeType) {
      case "textInput":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Text type
              </label>
              <select
                value={(typeof nodeData.textType === "string" ? nodeData.textType : "text") as string}
                onChange={(e) => {
                  if (onNodeChange) {
                    onNodeChange(selectedNode.id, { ...nodeData, textType: e.target.value });
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Texte</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Text
              </label>
              <textarea
                ref={textareaRef}
                value={localText}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setLocalText(newValue);
                  if (onNodeChange) {
                    onNodeChange(selectedNode.id, { ...nodeData, text: newValue });
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
                placeholder="Enter a value..."
                rows={1}
              />
            </div>
          </div>
        );

      case "imageInput":
        return (
          <ImageInputProperties
            selectedNode={selectedNode}
            nodeData={nodeData}
            onNodeChange={onNodeChange}
          />
        );

      case "numberInput":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Number
              </label>
              <input
                type="number"
                value={nodeData.number !== undefined ? String(nodeData.number) : ""}
                onChange={(e) => {
                  if (onNodeChange) {
                    const numValue = e.target.value === "" ? undefined : Number(e.target.value);
                    onNodeChange(selectedNode.id, { ...nodeData, number: numValue });
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a number..."
              />
            </div>
          </div>
        );

      case "todoList":
        const items = Array.isArray(nodeData.items) ? nodeData.items : [];
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Items ({items.length})
                </label>
                <button
                  onClick={() => {
                    if (onNodeChange) {
                      const newItem = {
                        id: `item-${Date.now()}`,
                        text: "",
                        checked: false,
                      };
                      onNodeChange(selectedNode.id, { ...nodeData, items: [...items, newItem] });
                    }
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-gray-300 dark:border-gray-700 rounded">
                    No items. Click &quot;+ Add&quot; to get started.
                  </div>
                ) : (
                  items.map((item: any, index: number) => (
                    <div key={item?.id || index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                      <input
                        type="checkbox"
                        checked={item?.checked || false}
                        onChange={(e) => {
                          if (onNodeChange) {
                            const updatedItems = items.map((it: any) =>
                              it?.id === item?.id ? { ...it, checked: e.target.checked } : it
                            );
                            onNodeChange(selectedNode.id, { ...nodeData, items: updatedItems });
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={item?.text || ""}
                        onChange={(e) => {
                          if (onNodeChange) {
                            const updatedItems = items.map((it: any) =>
                              it?.id === item?.id ? { ...it, text: e.target.value } : it
                            );
                            onNodeChange(selectedNode.id, { ...nodeData, items: updatedItems });
                          }
                        }}
                        className={`flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-background text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          item?.checked ? "line-through opacity-60" : ""
                        }`}
                        placeholder={`Item ${index + 1}...`}
                      />
                      <button
                        onClick={() => {
                          if (onNodeChange) {
                            const updatedItems = items.filter((it: any) => it?.id !== item?.id);
                            onNodeChange(selectedNode.id, { ...nodeData, items: updatedItems });
                          }
                        }}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-muted-foreground">
            No properties available for this node type.
          </div>
        );
    }
  };

  const getNodeTitle = () => {
    switch (nodeType) {
      case "textInput":
        return "Text Input";
      case "imageInput":
        return "Image Input";
      case "numberInput":
        return "Number Input";
      case "todoList":
        return "Todo List";
      default:
        return "Node";
    }
  };

  const getNodeIcon = () => {
    switch (nodeType) {
      case "textInput":
        return (
          <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
            T
          </span>
        );
      case "imageInput":
        return "🖼️";
      case "numberInput":
        return (
          <span className="text-xs font-semibold bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
            #
          </span>
        );
      case "todoList":
        return (
          <span className="text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
            ✓
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <aside className="w-80 border-l bg-background fixed right-0 top-14 h-[calc(100vh-3.5rem)] z-[90] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getNodeIcon()}
          <h3 className="text-sm font-semibold">{getNodeTitle()}</h3>
        </div>
        <div className="flex items-center gap-2">
          {onNodeDelete && (
            <button
              onClick={() => {
                if (selectedNode && onNodeDelete) {
                  onNodeDelete(selectedNode.id);
                }
              }}
              className="p-1.5 hover:bg-destructive/10 dark:hover:bg-destructive/20 rounded transition-colors"
              title="Delete node (Delete)"
            >
              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {renderNodeProperties()}
        
        {/* Border Color Section - Common for all node types */}
        <div className="pt-4 border-t">
          <label className="text-xs font-medium text-muted-foreground mb-2.5 block">
            Border color
          </label>
          <div className="flex flex-wrap gap-1.5">
            {/* Default (no color) */}
            <button
              onClick={() => {
                if (onNodeChange) {
                  const { borderColor, ...restData } = nodeData;
                  onNodeChange(selectedNode.id, restData);
                }
              }}
              className={`w-7 h-7 rounded border transition-all ${
                !nodeData.borderColor 
                  ? "border-gray-700 dark:border-gray-300 bg-gray-100 dark:bg-gray-800" 
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
              style={{
                backgroundImage: !nodeData.borderColor 
                  ? 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)'
                  : 'none',
                backgroundSize: '6px 6px',
                backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px'
              }}
              title="Default"
            />
            
            {/* Predefined colors */}
            {[
              { name: "Red", color: "#ef4444" },
              { name: "Orange", color: "#f97316" },
              { name: "Amber", color: "#f59e0b" },
              { name: "Yellow", color: "#eab308" },
              { name: "Green", color: "#22c55e" },
              { name: "Emerald", color: "#10b981" },
              { name: "Cyan", color: "#06b6d4" },
              { name: "Blue", color: "#3b82f6" },
              { name: "Indigo", color: "#6366f1" },
              { name: "Violet", color: "#8b5cf6" },
              { name: "Pink", color: "#ec4899" },
              { name: "Gray", color: "#6b7280" },
            ].map(({ name, color }) => (
              <button
                key={color}
                onClick={() => {
                  if (onNodeChange) {
                    onNodeChange(selectedNode.id, { ...nodeData, borderColor: color });
                  }
                }}
                className={`w-7 h-7 rounded border transition-all ${
                  nodeData.borderColor === color
                    ? "border-gray-700 dark:border-gray-300 ring-1 ring-offset-1 ring-gray-400 dark:ring-gray-500" 
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
                style={{ backgroundColor: color }}
                title={name}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
