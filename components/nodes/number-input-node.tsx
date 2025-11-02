"use client";

import { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { ChevronDown, MoreVertical } from "lucide-react";

interface NumberInputNodeData {
  number?: number;
}

export const NumberInputNode = ({ id, data, selected }: NodeProps<NumberInputNodeData>) => {
  const { setNodes } = useReactFlow();
  const [localNumber, setLocalNumber] = useState<string>(
    data.number !== undefined ? String(data.number) : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local number when data changes externally
  useEffect(() => {
    setLocalNumber(data.number !== undefined ? String(data.number) : "");
  }, [data.number]);

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

  return (
    <div
      className={`bg-white dark:bg-[#191919] rounded-lg border shadow-lg min-w-[200px] ${
        selected ? "border-stone-500 dark:border-stone-600" : "border-stone-300 dark:border-stone-700"
      }`}
      style={{ overflow: 'visible' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2 flex-1">
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded">
              #
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Number Input</span>
          </div>
        </div>
        <button className="p-1 hover:bg-gray-100 dark:hover:bg-stone-800 rounded">
          <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

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
    </div>
  );
};

