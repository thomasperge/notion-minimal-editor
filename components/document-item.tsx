"use client";

import { useState, useRef, useEffect } from "react";
import { FileText, MoreVertical, Trash2, Copy, Edit2, GitBranch, FileSpreadsheet } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Document } from "@/hooks/use-documents";

interface DocumentItemProps {
  document: Document;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export const DocumentItem = ({
  document,
  isActive,
  onSelect,
  onRename,
  onDelete,
  onDuplicate,
}: DocumentItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(document.title);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Update edited title when document changes
  useEffect(() => {
    setEditedTitle(document.title);
  }, [document.title]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Close menu when clicking outside
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      window.document.addEventListener("mousedown", handleClickOutside);
      return () => window.document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  const handleSubmit = () => {
    if (editedTitle.trim()) {
      onRename(document.id, editedTitle.trim());
    } else {
      setEditedTitle(document.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setEditedTitle(document.title);
      setIsEditing(false);
    }
  };

  const handleConfirmDelete = () => {
    console.log('🔥 handleConfirmDelete called for:', document.id);
    setShowMenu(false);
    onDelete(document.id);
    setShowDeleteDialog(false);
  };

  const handleDuplicate = () => {
    onDuplicate(document.id);
    setShowMenu(false);
  };

  return (
    <div
      className={`group relative flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
        isActive
          ? "bg-muted"
          : "hover:bg-muted/50"
      }`}
      onClick={() => !isEditing && onSelect(document.id)}
    >
      {document.type === 'canvas' ? (
        <GitBranch className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      ) : document.type === 'database' ? (
        <FileSpreadsheet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-sm truncate">{document.title}</span>
      )}

      {!isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity"
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 w-48 bg-background border rounded-md shadow-lg z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setIsEditing(true);
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Rename
          </button>
          <button
            onClick={handleDuplicate}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              setShowDeleteDialog(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive dark:text-red-400 hover:bg-destructive/10 dark:hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog.Root open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 z-[300]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[310] w-full max-w-md -translate-x-1/2 -translate-y-1/2 border bg-background dark:bg-[#1a1a1c] p-6 shadow-lg rounded-lg gap-4">
            <Dialog.Title className="text-base font-semibold mb-2">Delete document?</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete &quot;{document.title}&quot;? This action cannot be undone.
            </Dialog.Description>
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <button className="px-4 py-2.5 rounded-md border hover:bg-muted text-sm">Cancel</button>
              </Dialog.Close>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm"
              >
                Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

