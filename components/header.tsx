"use client";

import { useTheme } from "next-themes";
import { Undo2, Redo2, Sun, Moon, User, PanelLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { SettingsDialog } from "./settings-dialog";

interface HeaderProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onClearContent?: () => void;
  onExport?: (format: 'json' | 'markdown' | 'html') => void;
  onImport?: (content: string, format: 'json' | 'markdown' | 'html') => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Header = ({ 
  onUndo, 
  onRedo, 
  canUndo = false, 
  canRedo = false,
  onClearContent,
  onExport,
  onImport,
  sidebarOpen = true,
  onToggleSidebar
}: HeaderProps) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header 
      className={`sticky top-0 z-[100] w-full border-b backdrop-blur ${mounted && resolvedTheme === "dark" ? "bg-[#202020]" : "bg-background/95"}`} 
      style={mounted && resolvedTheme === "dark" ? { backgroundColor: "#202020" } : undefined}
    >
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Left side - Sidebar toggle when closed */}
        <div className="flex items-center">
          {!sidebarOpen && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              aria-label="Open sidebar"
            >
              <PanelLeft className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Right side - Undo/Redo and other actions */}
        <div className="flex items-center gap-4">
          {/* Undo/Redo */}
          <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Undo"
          >
            <Undo2 className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Redo"
          >
            <Redo2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          {mounted && theme === "dark" ? (
            <Sun className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Moon className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Separator */}
        <div className="h-6 w-px bg-border" />

        {/* User Avatar */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center hover:bg-purple-600 transition-colors"
          aria-label="Settings"
        >
          <User className="h-5 w-5 text-white" />
        </button>
        </div>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onClearContent={onClearContent}
        onExport={onExport}
        onImport={onImport}
      />
    </header>
  );
};

