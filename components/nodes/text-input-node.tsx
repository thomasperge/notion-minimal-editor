"use client";

import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";

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
  const isAdjustingRef = useRef(false);
  const lastAdjustTimeRef = useRef(0);
  const lastProcessedTextRef = useRef<string>(nodeData.text || "");
  const lastProcessedTextTypeRef = useRef<string | undefined>(nodeData.textType);

  // Initialiser les valeurs au montage
  useEffect(() => {
    if (lastProcessedTextRef.current !== (nodeData.text || "") || lastProcessedTextTypeRef.current !== nodeData.textType) {
      lastProcessedTextRef.current = nodeData.text || "";
      lastProcessedTextTypeRef.current = nodeData.textType;
    }
  }, []);

  // Sync local text when data changes externally
  useEffect(() => {
    const newText = nodeData.text || "";
    if (newText !== lastProcessedTextRef.current || nodeData.textType !== lastProcessedTextTypeRef.current) {
      setLocalText(newText);
      lastProcessedTextRef.current = newText;
      lastProcessedTextTypeRef.current = nodeData.textType;
    }
  }, [nodeData.text, nodeData.textType]);

  // Auto-resize textarea width and height
  const adjustTextareaSize = (force: boolean = false) => {
    if (!textareaRef.current || !measureRef.current || !containerRef.current) return;
    
    // Ne pas ajuster si le texte et le type n'ont pas changé (sauf si forcé)
    if (!force && localText === lastProcessedTextRef.current && nodeData.textType === lastProcessedTextTypeRef.current) {
      return;
    }
    
    // Éviter les ajustements trop fréquents (debounce naturel)
    const now = Date.now();
    if (now - lastAdjustTimeRef.current < 16) return; // ~60fps max
    lastAdjustTimeRef.current = now;
    
    // Éviter les ajustements multiples simultanés
    if (isAdjustingRef.current) return;
    isAdjustingRef.current = true;

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
    const maxWidth = 800;
    const padding = 24;
    const textareaPadding = 16;
    
    // Calculate optimal width (with padding)
    const optimalWidth = Math.max(minWidth, Math.min(maxWidth, textWidth + padding + textareaPadding));
    
    // Set container and textarea width
    containerRef.current.style.width = `${optimalWidth}px`;
    textareaRef.current.style.width = '100%';
    
    // Adjust height - s'assurer que tout le texte est visible
    textareaRef.current.style.height = 'auto';
    const scrollHeight = textareaRef.current.scrollHeight;
    textareaRef.current.style.height = `${scrollHeight}px`;
    
    // Vérifier à nouveau après ajustement pour s'assurer que tout est visible
    if (textareaRef.current.scrollHeight > scrollHeight) {
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
    
    // Mettre à jour les références après ajustement
    lastProcessedTextRef.current = text;
    lastProcessedTextTypeRef.current = nodeData.textType;
    isAdjustingRef.current = false;
  };

  // Auto-resize textarea
  const handleTextChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = evt.target.value;
    setLocalText(newText);
    
    // Ajuster immédiatement la taille pendant la saisie
    requestAnimationFrame(() => {
      adjustTextareaSize();
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

  // Ajuster la taille au montage pour s'assurer que le texte initial est affiché
  useLayoutEffect(() => {
    // Forcer l'ajustement au montage pour afficher tout le texte initial
    if (textareaRef.current) {
      adjustTextareaSize(true);
    }
  }, []);

  // Ajuster la taille après les changements de layout (useLayoutEffect s'exécute avant le paint)
  // Seulement si le textarea n'est pas en focus et que quelque chose a vraiment changé
  useLayoutEffect(() => {
    if (textareaRef.current && document.activeElement !== textareaRef.current) {
      // Vérifier si quelque chose a vraiment changé avant d'ajuster
      if (localText !== lastProcessedTextRef.current || nodeData.textType !== lastProcessedTextTypeRef.current) {
        adjustTextareaSize();
      }
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
              lineHeight: nodeData.textType === "h1" ? '2rem' : nodeData.textType === "h2" ? '1.75rem' : '1.25rem',
              overflow: 'hidden',
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
