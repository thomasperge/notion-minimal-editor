"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Node } from "@xyflow/react";
import { Play, MoreVertical } from "lucide-react";

interface PropertiesPanelProps {
  selectedNode: Node | null;
  onNodeChange?: (nodeId: string, data: any) => void;
}

export const PropertiesPanel = ({ selectedNode, onNodeChange }: PropertiesPanelProps) => {
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
          <div className="space-y-4">
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
                placeholder="Enter image URL..."
              />
            </div>
          </div>
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
          <button className="p-1.5 hover:bg-muted rounded transition-colors">
            <Play className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="p-1.5 hover:bg-muted rounded transition-colors">
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderNodeProperties()}
      </div>
    </aside>
  );
};
