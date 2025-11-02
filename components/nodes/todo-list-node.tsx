"use client";

import { useState, useEffect } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { X, Check } from "lucide-react";

interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
}

interface TodoListNodeData extends Record<string, unknown> {
  items?: TodoItem[];
  borderColor?: string;
}

export const TodoListNode = ({ id, data, selected }: any) => {
  const { setNodes } = useReactFlow();
  const nodeData = data as TodoListNodeData;
  const [items, setItems] = useState<TodoItem[]>(nodeData.items || []);

  // Sync items when data changes externally
  useEffect(() => {
    setItems(nodeData.items || []);
  }, [nodeData.items]);

  const updateItem = (itemId: string, updates: Partial<TodoItem>) => {
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    setItems(updatedItems);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, items: updatedItems } } : node
      )
    );
  };

  const removeItem = (itemId: string) => {
    const updatedItems = items.filter((item) => item.id !== itemId);
    setItems(updatedItems);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, items: updatedItems } } : node
      )
    );
  };

  const toggleItem = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      updateItem(itemId, { checked: !item.checked });
    }
  };

  const borderColor = nodeData.borderColor || (selected ? "rgb(120 113 108)" : "rgb(214 211 209)");

  return (
    <div
      className="bg-white dark:bg-[#191919] rounded-lg border-2 shadow-lg min-w-[250px] max-w-[400px]"
      style={{
        overflow: 'visible',
        borderColor: borderColor
      }}
    >
      {/* Content */}
      <div className="p-3">
        {items.length === 0 ? (
          <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            No items
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 py-1"
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className={`flex-shrink-0 w-4 h-4 rounded border transition-all flex items-center justify-center ${
                    item.checked
                      ? "bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500"
                      : "border-stone-300 dark:border-stone-600 hover:border-stone-400 dark:hover:border-stone-500"
                  }`}
                >
                  {item.checked && (
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  )}
                </button>
                <span
                  className={`flex-1 text-sm text-gray-900 dark:text-gray-100 ${
                    item.checked ? "line-through opacity-50" : ""
                  }`}
                >
                  {item.text || "Empty item"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="todo-input"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-[#191919]"
        style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }}
      />
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="todo-output"
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white dark:!border-[#191919]"
        style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }}
      />

      <style>{`
        .react-flow__node.react-flow__node-todoList {
          background: none !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

