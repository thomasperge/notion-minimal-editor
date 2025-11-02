"use client";

import { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";

interface TextInputNodeData extends Record<string, unknown> {
  text?: string;
  borderColor?: string;
  textType?: "text" | "h1" | "h2";
}

export const TextInputNode = ({ id, data, selected }: any) => {
  const { setNodes } = useReactFlow();
  const nodeData = data as TextInputNodeData;
  const [localText, setLocalText] = useState(nodeData.text || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync local text when data changes externally
  useEffect(() => {
    setLocalText(nodeData.text || "");
  }, [nodeData.text]);

  // Auto-resize textarea width and height
  const adjustTextareaSize = (preserveCursor: boolean = false) => {
    if (!textareaRef.current || !measureRef.current || !containerRef.current) return;

    // Save cursor position
    const cursorPosition = preserveCursor && textareaRef.current ? textareaRef.current.selectionStart : null;

    const text = localText || "";
    
    // Apply text type styles to measure div
    const fontSize = nodeData.textType === "h1" 
      ? "1.875rem" 
      : nodeData.textType === "h2"
      ? "1.5rem"
      : "0.875rem";
    const fontWeight = (nodeData.textType === "h1" || nodeData.textType === "h2") ? "bold" : "normal";
    
    // Measure text width
    measureRef.current.style.width = 'auto';
    measureRef.current.style.whiteSpace = 'pre-wrap';
    measureRef.current.style.fontSize = fontSize;
    measureRef.current.style.fontWeight = fontWeight;
    measureRef.current.textContent = text || ' ';
    
    const textWidth = measureRef.current.scrollWidth;
    const minWidth = 200;
    const maxWidth = 800; // Max width reasonable
    const padding = 24; // px-3 = 12px on each side
    const textareaPadding = 16; // px-2 = 8px on each side
    
    // Calculate optimal width (with padding)
    const optimalWidth = Math.max(minWidth, Math.min(maxWidth, textWidth + padding + textareaPadding));
    
    // Set container and textarea width
    containerRef.current.style.width = `${optimalWidth}px`;
    textareaRef.current.style.width = '100%';
    
    // Adjust height
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    
    // Restore cursor position
    if (preserveCursor && cursorPosition !== null && textareaRef.current) {
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
        }
      });
    }
  };

  // Auto-resize textarea
  const handleTextChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = evt.target.value;
    const cursorPosition = evt.target.selectionStart;
    
    setLocalText(newText);
    
    // Adjust size immediately while preserving cursor
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        adjustTextareaSize(true);
        // Restore cursor position after adjustment
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            const newCursorPosition = Math.min(cursorPosition, newText.length);
            textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
          }
        });
      }
    });
    
    // Update node data
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, text: newText } }
          : node
      )
    );
  };

  // Initialize and adjust size when text changes externally (not during typing)
  useEffect(() => {
    // Only adjust if not currently focused (to avoid cursor jumping during external updates)
    if (textareaRef.current && document.activeElement !== textareaRef.current) {
      adjustTextareaSize(false);
    }
  }, [localText, nodeData.textType]);

  return (
    <>
      {/* Hidden div for measuring text width */}
      <div
        ref={measureRef}
        className="absolute invisible whitespace-pre-wrap break-words text-sm px-2 py-1.5"
        style={{
          visibility: 'hidden',
          position: 'absolute',
          top: 0,
          left: 0,
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          lineHeight: '1.25rem',
          padding: '0.375rem 0.5rem',
        }}
      />
      
      <div
        ref={containerRef}
        className="bg-white dark:bg-[#191919] rounded-lg border-2 shadow-lg inline-block"
        style={{ 
          minWidth: '200px', 
          width: 'auto', 
          overflow: 'visible',
          borderColor: (nodeData as any).borderColor || (selected ? "rgb(120 113 108)" : "rgb(214 211 209)")
        }}
      >
        {/* Content */}
        <div className="px-2 py-1 space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Text</label>
          <textarea
            ref={textareaRef}
            value={localText}
            onChange={handleTextChange}
            placeholder="Enter a value..."
            rows={1}
            className={`w-full px-2 py-1.5 border border-stone-300 dark:border-stone-600 rounded bg-white dark:bg-[#171717] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500 focus:border-stone-400 dark:focus:border-stone-500 resize-none overflow-hidden ${
              nodeData.textType === "h1" 
                ? "text-3xl font-bold" 
                : nodeData.textType === "h2"
                ? "text-2xl font-bold"
                : "text-sm"
            }`}
            style={{
              minHeight: nodeData.textType === "h1" ? '48px' : nodeData.textType === "h2" ? '40px' : '32px',
              maxHeight: '200px',
              lineHeight: nodeData.textType === "h1" ? '2rem' : nodeData.textType === "h2" ? '1.75rem' : '1.25rem',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Target Handle */}
        <Handle
          type="target"
          position={Position.Left}
          id="text-input"
          className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-[#191919]"
          style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }}
        />
        
        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="text-output"
          className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white dark:!border-[#191919]"
          style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }}
        />
      </div>


      <style>{`
        .react-flow__node.react-flow__node-textInput {
          background: none !important;
          border: none !important;
        }
      `}</style>
    </>
  );
};

