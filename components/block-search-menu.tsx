"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Image as ImageIcon } from "lucide-react";

interface Block {
  id: string;
  type: string;
  name: string;
  icon: string;
  description: string;
}

const AVAILABLE_BLOCKS: Block[] = [
  {
    id: "textInput",
    type: "textInput",
    name: "Text Input",
    icon: "T",
    description: "Input a text value.",
  },
  {
    id: "imageInput",
    type: "imageInput",
    name: "Image Input",
    icon: "🖼️",
    description: "Input an image.",
  },
  {
    id: "numberInput",
    type: "numberInput",
    name: "Number Input",
    icon: "#",
    description: "Input a number value.",
  },
  {
    id: "todoList",
    type: "todoList",
    name: "Todo List",
    icon: "✅",
    description: "Create a checklist with items to validate.",
  },
];

interface BlockSearchMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (blockType: string) => void;
  position?: { x: number; y: number };
}

export const BlockSearchMenu = ({
  isOpen,
  onClose,
  onSelectBlock,
  position,
}: BlockSearchMenuProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter blocks based on search query
  const filteredBlocks = AVAILABLE_BLOCKS.filter((block) =>
    block.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredBlocks.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filteredBlocks[selectedIndex]) {
        e.preventDefault();
        onSelectBlock(filteredBlocks[selectedIndex].type);
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredBlocks, selectedIndex, onSelectBlock, onClose]);

  // Focus input when menu opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset search and selection when menu opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Reset selected index when filtered blocks change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    window.document.addEventListener("mousedown", handleClickOutside);
    return () => window.document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuStyle = position
    ? {
        position: "fixed" as const,
        left: `${position.x}px`,
        top: `${position.y}px`,
      }
    : undefined;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-white/95 dark:bg-[#191919] backdrop-blur-sm border border-stone-300 dark:border-stone-700 rounded-xl shadow-lg min-w-[300px] max-w-[400px]"
      style={menuStyle}
    >
      {/* Search Input */}
      <div className="p-3 border-b border-stone-200 dark:border-stone-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-700 dark:text-gray-200 pointer-events-none z-10" strokeWidth={2.5} />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for blocks..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-[#171717] backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500 focus:border-stone-400 dark:focus:border-stone-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Blocks List */}
      <div className="max-h-[400px] overflow-y-auto py-1">
        {filteredBlocks.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            No blocks found
          </div>
        ) : (
          <div>
            {filteredBlocks.map((block, index) => (
              <button
                key={block.id}
                onClick={() => {
                  onSelectBlock(block.type);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                  index === selectedIndex
                    ? "bg-gray-100/80 dark:bg-gray-800/80"
                    : "hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {block.icon === "T" ? (
                    <span className="text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded">
                      T
                    </span>
                  ) : block.icon === "#" ? (
                    <span className="text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded">
                      #
                    </span>
                  ) : block.icon === "🖼️" ? (
                    <ImageIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  ) : (
                    <span>{block.icon}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{block.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {block.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

