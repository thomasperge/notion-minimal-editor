"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { X, Download, Trash2, FileText, FileCode, FileImage, RefreshCw, Save, Upload, Clipboard } from "lucide-react";
import { useState, useEffect } from "react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClearContent?: () => void;
  onExport?: (format: 'json' | 'markdown' | 'html') => void;
  onImport?: (content: string, format: 'json' | 'markdown' | 'html') => void;
  onShowQRCode?: () => void;
}

export const SettingsDialog = ({ 
  open, 
  onOpenChange,
  onClearContent,
  onExport,
  onImport,
  onShowQRCode
}: SettingsDialogProps) => {
  const [editorWidth, setEditorWidth] = useState<'narrow' | 'medium' | 'wide' | 'full'>('medium');
  const [autoSave, setAutoSave] = useState(true);
  const [storageSize, setStorageSize] = useState<string>('0 KB');
  const [characterCount, setCharacterCount] = useState(0);
  const [blockCount, setBlockCount] = useState(0);
  const [imageCount, setImageCount] = useState(0);

  // Load settings from localStorage
  useEffect(() => {
    const savedEditorWidth = localStorage.getItem('editor-width');
    const savedAutoSave = localStorage.getItem('editor-autoSave');

    if (savedEditorWidth) setEditorWidth(savedEditorWidth as any);
    if (savedAutoSave !== null) setAutoSave(savedAutoSave === 'true');
  }, []);

  // Calculate storage size
  useEffect(() => {
    const calculateStorage = () => {
      try {
        // Calculate total storage from all documents
        const documentsList = localStorage.getItem('documents-list');
        let totalSize = 0;
        let totalCharacters = 0;
        let totalBlocks = 0;
        let totalImages = 0;

        if (documentsList) {
          const docs = JSON.parse(documentsList);
          if (Array.isArray(docs)) {
            docs.forEach((doc: any) => {
              const content = localStorage.getItem(`document-${doc.id}`) || '';
              const sizeInBytes = new Blob([content]).size;
              totalSize += sizeInBytes;
              totalCharacters += content.length;

              if (content) {
                try {
                  const parsed = JSON.parse(content);
                  // Vérifier si c'est un canvas (objet avec nodes/edges)
                  if (typeof parsed === 'object' && parsed !== null && parsed.nodes && parsed.edges) {
                    // Compter les nodes de type imageInput
                    const imageNodes = parsed.nodes.filter((node: any) => node.type === 'imageInput');
                    totalImages += imageNodes.length;
                  } else if (Array.isArray(parsed)) {
                    // Format BlockNote (tableau de blocks)
                    totalBlocks += parsed.length;
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            });
          }
        }

        // Also check old format for migration
        const oldContent = localStorage.getItem('editor-content');
        if (oldContent) {
          const sizeInBytes = new Blob([oldContent]).size;
          totalSize += sizeInBytes;
          totalCharacters += oldContent.length;
          try {
            const parsed = JSON.parse(oldContent);
            if (typeof parsed === 'object' && parsed !== null && parsed.nodes && parsed.edges) {
              // Canvas format
              const imageNodes = parsed.nodes.filter((node: any) => node.type === 'imageInput');
              totalImages += imageNodes.length;
            } else if (Array.isArray(parsed)) {
              // BlockNote format
              totalBlocks += parsed.length;
            }
          } catch {
            // Ignore parse errors
          }
        }

        const sizeInKB = (totalSize / 1024).toFixed(2);
        setStorageSize(sizeInKB + ' KB');
        setCharacterCount(totalCharacters);
        setBlockCount(totalBlocks);
        setImageCount(totalImages);
      } catch (error) {
        setStorageSize('0 KB');
        setCharacterCount(0);
        setBlockCount(0);
        setImageCount(0);
      }
    };
    calculateStorage();
    const interval = setInterval(calculateStorage, 2000);
    return () => clearInterval(interval);
  }, []);

  // Save settings
  const saveSettings = () => {
    localStorage.setItem('editor-width', editorWidth);
    localStorage.setItem('editor-autoSave', String(autoSave));
    // You can trigger a refresh or apply these settings to the editor
    window.location.reload(); // Simple reload for now
  };

  const handleClearContent = () => {
    if (onClearContent) {
      onClearContent();
    }
    localStorage.removeItem('editor-content');
    window.location.reload();
  };

  const handleClearAll = () => {
    localStorage.removeItem('editor-content');
    localStorage.removeItem('editor-width');
    localStorage.removeItem('editor-autoSave');
    window.location.reload();
  };

  const handleFileImport = async (format: 'json' | 'markdown' | 'html') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = format === 'json' ? '.json' : format === 'markdown' ? '.md,.markdown' : '.html';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content && onImport) {
          onImport(content, format);
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  };

  const handlePasteImport = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        alert('No content in clipboard');
        return;
      }

      // Try to detect format
      let format: 'json' | 'markdown' | 'html' = 'markdown';
      
      try {
        JSON.parse(text);
        format = 'json';
      } catch {
        if (text.trim().startsWith('<') && text.includes('</')) {
          format = 'html';
        }
      }

      if (onImport) {
        onImport(text, format);
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      alert('Unable to read clipboard');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={true}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[200]" />
        <Dialog.Content 
          className="fixed left-0 right-0 top-14 bottom-0 z-[210] flex items-center justify-center p-4"
        >
          <div className="relative w-full max-w-lg max-h-[85vh] border bg-background dark:bg-[#1a1a1c] shadow-lg rounded-lg flex flex-col">
            <div className="p-6 flex flex-col flex-1 min-h-0">
              <Dialog.Title className="text-base font-semibold mb-1">Settings</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground mb-4">
                Configure your editor according to your preferences
              </Dialog.Description>

              <div className="space-y-6 overflow-y-auto flex-1 pr-2 -mr-2">
                {/* Appearance */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium underline">Appearance</h3>
                  
                  {/* Editor width */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Editor width</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['narrow', 'medium', 'wide', 'full'] as const).map((width) => (
                        <button
                          key={width}
                          onClick={() => setEditorWidth(width)}
                          className={`px-2 py-2.5 rounded-md border text-sm transition-colors ${
                            editorWidth === width
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-muted'
                          }`}
                        >
                          {width === 'narrow' ? 'Narrow' : width === 'medium' ? 'Medium' : width === 'wide' ? 'Wide' : 'Full'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Behavior */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium underline">Behavior</h3>
                  
                  {/* Auto-save */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">Auto-save</label>
                      <p className="text-xs text-muted-foreground">Auto-save in browser</p>
                    </div>
                    <button
                      onClick={() => setAutoSave(!autoSave)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none border border-black dark:border-white ${
                        autoSave 
                          ? 'bg-black dark:bg-white' 
                          : 'bg-white dark:bg-black'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                          autoSave 
                            ? 'translate-x-6 bg-white dark:bg-black' 
                            : 'translate-x-1 bg-black dark:bg-white'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Clear content */}
                  <AlertDialog.Root>
                    <AlertDialog.Trigger asChild>
                      <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-destructive/50 dark:border-red-500/60 text-destructive dark:text-red-400 hover:bg-destructive/10 dark:hover:bg-red-500/10 transition-colors text-sm">
                        <Trash2 className="h-4 w-4" />
                        Clear content
                      </button>
                    </AlertDialog.Trigger>
                    <AlertDialog.Portal>
                      <AlertDialog.Overlay className="fixed inset-0 bg-black/70 z-[300]" />
                      <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[310] w-full max-w-md -translate-x-1/2 -translate-y-1/2 border bg-background dark:bg-[#1a1a1c] p-6 shadow-lg rounded-lg gap-4">
                        <AlertDialog.Title className="text-base font-semibold mb-2">Clear content?</AlertDialog.Title>
                        <AlertDialog.Description className="text-sm text-muted-foreground mb-4">
                          This action is irreversible. All your content will be deleted.
                        </AlertDialog.Description>
                        <div className="flex justify-end gap-2">
                          <AlertDialog.Cancel asChild>
                            <button className="px-4 py-2.5 rounded-md border hover:bg-muted text-sm">Cancel</button>
                          </AlertDialog.Cancel>
                          <AlertDialog.Action asChild>
                            <button
                              onClick={handleClearContent}
                              className="px-4 py-2.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm"
                            >
                              Clear
                            </button>
                          </AlertDialog.Action>
                        </div>
                      </AlertDialog.Content>
                    </AlertDialog.Portal>
                  </AlertDialog.Root>
                </div>

                {/* Import */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium underline">Import</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleFileImport('json')}
                      className="flex flex-col items-center justify-center gap-2 px-3 py-2.5 rounded-md border hover:bg-muted transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">JSON</span>
                    </button>
                    <button
                      onClick={() => handleFileImport('markdown')}
                      className="flex flex-col items-center justify-center gap-2 px-3 py-2.5 rounded-md border hover:bg-muted transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">MD</span>
                    </button>
                    <button
                      onClick={() => handleFileImport('html')}
                      className="flex flex-col items-center justify-center gap-2 px-3 py-2.5 rounded-md border hover:bg-muted transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">HTML</span>
                    </button>
                    <button
                      onClick={handlePasteImport}
                      className="flex flex-col items-center justify-center gap-2 px-3 py-2.5 rounded-md border hover:bg-muted transition-colors"
                    >
                      <Clipboard className="h-4 w-4" />
                      <span className="text-sm">Paste</span>
                    </button>
                  </div>
                </div>

                {/* Export */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium underline">Export</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => onExport?.('json')}
                      className="flex flex-col items-center justify-center gap-2 px-3 py-2.5 rounded-md border hover:bg-muted transition-colors"
                    >
                      <FileCode className="h-4 w-4" />
                      <span className="text-sm">JSON</span>
                    </button>
                    <button
                      onClick={() => onExport?.('markdown')}
                      className="flex flex-col items-center justify-center gap-2 px-3 py-2.5 rounded-md border hover:bg-muted transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">Markdown</span>
                    </button>
                    <button
                      onClick={() => onExport?.('html')}
                      className="flex flex-col items-center justify-center gap-2 px-3 py-2.5 rounded-md border hover:bg-muted transition-colors"
                    >
                      <FileImage className="h-4 w-4" />
                      <span className="text-sm">HTML</span>
                    </button>
                  </div>
                </div>

                {/* Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium underline">Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Storage used</span>
                      <span className="font-medium">{storageSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Characters</span>
                      <span className="font-medium">{characterCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Blocks</span>
                      <span className="font-medium">{blockCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Images</span>
                      <span className="font-medium">{imageCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Version</span>
                      <span className="font-medium">1.2.0</span>
                    </div>
                  </div>
                </div>

                {/* Advanced */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium underline">Advanced</h3>
                  <AlertDialog.Root>
                    <AlertDialog.Trigger asChild>
                      <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-destructive/50 dark:border-red-500/60 text-destructive dark:text-red-400 hover:bg-destructive/10 dark:hover:bg-red-500/10 transition-colors text-sm">
                        <RefreshCw className="h-4 w-4" />
                        Reset all settings
                      </button>
                    </AlertDialog.Trigger>
                    <AlertDialog.Portal>
                      <AlertDialog.Overlay className="fixed inset-0 bg-black/70 z-[300]" />
                      <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[310] w-full max-w-md -translate-x-1/2 -translate-y-1/2 border bg-background dark:bg-[#1a1a1c] p-6 shadow-lg rounded-lg gap-4">
                        <AlertDialog.Title className="text-base font-semibold mb-2">Reset?</AlertDialog.Title>
                        <AlertDialog.Description className="text-sm text-muted-foreground mb-4">
                          All your settings and data will be deleted.
                        </AlertDialog.Description>
                        <div className="flex justify-end gap-2">
                          <AlertDialog.Cancel asChild>
                            <button className="px-4 py-2.5 rounded-md border hover:bg-muted text-sm">Cancel</button>
                          </AlertDialog.Cancel>
                          <AlertDialog.Action asChild>
                            <button
                              onClick={handleClearAll}
                              className="px-4 py-2.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm"
                            >
                              Reset
                            </button>
                          </AlertDialog.Action>
                        </div>
                      </AlertDialog.Content>
                    </AlertDialog.Portal>
                  </AlertDialog.Root>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0 mt-4">
                <Dialog.Close asChild>
                  <button className="px-4 py-2.5 rounded-md border hover:bg-muted text-sm">Cancel</button>
                </Dialog.Close>
                <button
                  onClick={saveSettings}
                  className="px-4 py-2.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 text-sm"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
              </div>
            </div>

            <Dialog.Close asChild>
              <button className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
