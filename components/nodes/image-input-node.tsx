"use client";

import { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";

interface ImageInputNodeData extends Record<string, unknown> {
  imageUrl?: string;
  borderColor?: string;
}

export const ImageInputNode = ({ id, data, selected }: any) => {
  const { setNodes } = useReactFlow();
  const nodeData = data as ImageInputNodeData;
  const [localImageUrl, setLocalImageUrl] = useState(nodeData.imageUrl || "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local imageUrl when data changes externally
  useEffect(() => {
    setLocalImageUrl(nodeData.imageUrl || "");
  }, [nodeData.imageUrl]);

  const handleImageUrlChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = evt.target.value;
    setLocalImageUrl(newUrl);
    // Update node data
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, imageUrl: newUrl } }
          : node
      )
    );
  };

  const borderColor = nodeData.borderColor || (selected ? "rgb(120 113 108)" : "rgb(214 211 209)");

  return (
    <div
      className="bg-white dark:bg-[#191919] rounded-lg border-2 shadow-lg min-w-[200px] max-w-[400px]"
      style={{ 
        overflow: 'visible',
        borderColor: borderColor
      }}
    >
      {/* Content */}
      <div className="p-3 space-y-2">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Image URL</label>
        {localImageUrl ? (
          <img
            src={localImageUrl}
            alt="Pasted"
            className="w-full rounded border border-stone-300 dark:border-stone-600 max-h-64 object-contain"
            onError={(e) => {
              console.error("Failed to load image:", localImageUrl);
            }}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={localImageUrl}
            onChange={handleImageUrlChange}
            placeholder="Enter image URL..."
            className="w-full px-2 py-1.5 text-sm border border-stone-300 dark:border-stone-600 rounded bg-white dark:bg-[#171717] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500 focus:border-stone-400 dark:focus:border-stone-500"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="image-input"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-[#191919]"
        style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }}
      />
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="image-output"
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white dark:!border-[#191919]"
        style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }}
      />
      
      <style>{`
        .react-flow__node.react-flow__node-imageInput {
          background: none !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

