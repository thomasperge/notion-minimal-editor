"use client";

import { Plus, PanelLeftClose, HelpCircle, Github, GitBranch, FileText } from "lucide-react";
import { useDocumentsContext } from "@/components/providers/documents-provider";
import { DocumentItem } from "./document-item";
import { useState, useRef, useEffect } from "react";

interface SidebarProps {
  onToggle?: () => void;
}

export const Sidebar = ({ onToggle }: SidebarProps) => {
  const {
    documents,
    currentDocumentId,
    isLoaded,
    createDocument,
    updateDocumentTitle,
    deleteDocument,
    duplicateDocument,
    switchToDocument,
  } = useDocumentsContext();

  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleCreateDocument = () => {
    createDocument('document');
    setShowCreateMenu(false);
  };

  const handleCreateCanvas = () => {
    createDocument('canvas');
    setShowCreateMenu(false);
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowHelpTooltip(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowHelpTooltip(false);
    }, 150); // Petit délai pour permettre le passage de la souris
  };

  // Close menu when clicking outside
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
    };

    if (showCreateMenu) {
      window.document.addEventListener("mousedown", handleClickOutside);
      return () => window.document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showCreateMenu]);

  if (!isLoaded) {
    return (
      <div className="w-64 border-r bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <aside className="w-64 border-r bg-background flex flex-col fixed left-0 top-0 h-screen z-[90]">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New
            </button>
            {showCreateMenu && (
              <div
                ref={menuRef}
                className="absolute top-full left-0 mt-1 w-full bg-background border rounded-md shadow-lg z-50"
              >
                <button
                  onClick={handleCreateDocument}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  New page
                </button>
                <button
                  onClick={handleCreateCanvas}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <GitBranch className="h-4 w-4" />
                  New canvas
                </button>
              </div>
            )}
          </div>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto p-2 overflow-x-hidden">
        <div className="mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1">
            Private
          </h3>
        </div>

        <div className="space-y-1">
          {documents.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No documents yet. Create one to get started!
            </div>
          ) : (
            documents.map((document) => (
              <DocumentItem
                key={document.id}
                document={document}
                isActive={document.id === currentDocumentId}
                onSelect={switchToDocument}
                onRename={updateDocumentTitle}
                onDelete={deleteDocument}
                onDuplicate={duplicateDocument}
              />
            ))
          )}
        </div>
      </div>

      {/* Help Button */}
      <div className="p-4 flex-shrink-0 flex justify-end">
        <div 
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button className="flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-muted/80 transition-colors">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </button>
          
          {/* Help Tooltip */}
          {showHelpTooltip && (
            <div className="absolute left-full ml-2 bottom-0 z-50">
              <div className="bg-background border rounded-lg shadow-lg p-4 min-w-[280px]">
                <h4 className="text-sm font-semibold mb-2">Quick Help</h4>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">/</kbd>
                    <span>Open slash menu</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+Z</kbd>
                    <span>Undo</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+Shift+Z</kbd>
                    <span>Redo</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+B</kbd>
                    <span>Bold</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+I</kbd>
                    <span>Italic</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <a 
                    href="https://github.com/thomasperge/notion-minimal-editor" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Github className="h-4 w-4" />
                    <span>View on GitHub</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

