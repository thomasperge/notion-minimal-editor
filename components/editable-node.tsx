"use client";

import { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";

interface EditableNodeData {
  label: string;
}

export const EditableNode = ({ id, data, selected }: NodeProps<EditableNodeData>) => {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [localLabel, setLocalLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  // Sync local label when data changes externally
  useEffect(() => {
    if (!isEditing) {
      setLocalLabel(data.label);
    }
  }, [data.label, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Adjust input width based on content
  useEffect(() => {
    if (isEditing && inputRef.current && spanRef.current) {
      const width = spanRef.current.offsetWidth || 100;
      inputRef.current.style.width = `${width}px`;
    }
  }, [localLabel, isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setLocalLabel(data.label);
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Update nodes only when editing is done
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, label: localLabel } } : node
      )
    );
  };

  const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    setLocalLabel(evt.target.value);
  };

  const handleKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.key === "Enter" || evt.key === "Escape") {
      if (evt.key === "Enter") {
        handleBlur();
      } else {
        setLocalLabel(data.label);
        setIsEditing(false);
      }
    }
  };

  return (
    <div
      className={`px-4 py-2 shadow-lg rounded-lg border-2 overflow-visible inline-block ${
        selected ? "border-blue-500" : "border-gray-300 dark:border-gray-600"
      }`}
    >
      <Handle type="target" position={Position.Left} id="default-input" />
      
      {/* Hidden span to measure text width */}
      <span
        ref={spanRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          height: 'auto',
          width: 'auto',
          whiteSpace: 'nowrap',
          fontSize: '0.875rem',
          fontFamily: 'inherit',
          fontWeight: 500,
        }}
      >
        {localLabel || ' '}
      </span>
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={localLabel}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none outline-none text-sm font-medium"
          onClick={(e) => e.stopPropagation()}
          style={{ minWidth: '100px' }}
        />
      ) : (
        <div onDoubleClick={handleDoubleClick} className="text-sm font-medium cursor-text whitespace-nowrap">
          {data.label}
        </div>
      )}
      
      <Handle type="source" position={Position.Right} id="default-output" />
    </div>
  );
};

