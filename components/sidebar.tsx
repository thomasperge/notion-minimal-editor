"use client";

import { Plus, PanelLeftClose } from "lucide-react";
import { useDocumentsContext } from "@/components/providers/documents-provider";
import { DocumentItem } from "./document-item";

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

  const handleCreateDocument = () => {
    createDocument();
  };

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
          <button
            onClick={handleCreateDocument}
            className="flex-1 flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New page
          </button>
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
    </aside>
  );
};

