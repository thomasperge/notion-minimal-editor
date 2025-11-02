"use client";

import { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";

interface NumberInputNodeData extends Record<string, unknown> {
  number?: number;
  borderColor?: string;
}

export const NumberInputNode = ({ id, data, selected }: any) => {
  const { setNodes } = useReactFlow();
  const nodeData = data as NumberInputNodeData;
  const [localNumber, setLocalNumber] = useState<string>(
    nodeData.number !== undefined ? String(nodeData.number) : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local number when data changes externally
  useEffect(() => {
    setLocalNumber(nodeData.number !== undefined ? String(nodeData.number) : "");
  }, [nodeData.number]);

  const handleNumberChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const value = evt.target.value;
    setLocalNumber(value);
    // Update node data
    const numValue = value === "" ? undefined : Number(value);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, number: numValue } }
          : node
      )
    );
  };

  const borderColor = nodeData.borderColor || (selected ? "rgb(120 113 108)" : "rgb(214 211 209)");

  return (
    <div
      className="bg-white dark:bg-[#191919] rounded-lg border-2 shadow-lg min-w-[200px]"
      style={{ 
        overflow: 'visible',
        borderColor: borderColor
      }}
    >
      {/* Content */}
      <div className="p-3 space-y-2">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Number</label>
        <input
          ref={inputRef}
          type="number"
          value={localNumber}
          onChange={handleNumberChange}
          placeholder="Enter a number..."
          className="w-full px-2 py-1.5 text-sm border border-stone-300 dark:border-stone-600 rounded bg-white dark:bg-[#171717] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500 focus:border-stone-400 dark:focus:border-stone-500"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="number-input"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-[#191919]"
        style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }}
      />
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="number-output"
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white dark:!border-[#191919]"
        style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }}
      />

      <style>{`
        .react-flow__node.react-flow__node-numberInput {
          background: none !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

