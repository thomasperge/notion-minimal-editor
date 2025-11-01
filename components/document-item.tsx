"use client";

import { useState, useRef, useEffect } from "react";
import { FileText, MoreVertical, Trash2, Copy, Edit2 } from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
    onDelete(document.id);
    setShowMenu(false);
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
      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      
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
          <AlertDialog.Root>
            <AlertDialog.Trigger asChild>
              <button
                onClick={() => setShowMenu(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive dark:text-red-400 hover:bg-destructive/10 dark:hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Overlay className="fixed inset-0 bg-black/70 z-[100]" />
              <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[110] w-full max-w-md -translate-x-1/2 -translate-y-1/2 border bg-background dark:bg-[#1a1a1c] p-6 shadow-lg rounded-lg gap-4">
                <AlertDialog.Title className="text-base font-semibold mb-2">Delete document?</AlertDialog.Title>
                <AlertDialog.Description className="text-sm text-muted-foreground mb-4">
                  Are you sure you want to delete &quot;{document.title}&quot;? This action cannot be undone.
                </AlertDialog.Description>
                <div className="flex justify-end gap-2">
                  <AlertDialog.Cancel asChild>
                    <button className="px-4 py-2.5 rounded-md border hover:bg-muted text-sm">Cancel</button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <button
                      onClick={handleConfirmDelete}
                      className="px-4 py-2.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm"
                    >
                      Delete
                    </button>
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </div>
      )}
    </div>
  );
};

