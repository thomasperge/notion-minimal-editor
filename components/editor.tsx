"use client";

import { useTheme } from "next-themes";
import {
  BlockNoteEditor,
  PartialBlock
} from "@blocknote/core";
import {
  BlockNoteView,
  useBlockNote
} from "@blocknote/react";
import "@blocknote/core/style.css";
import { useEffect, useCallback, useMemo } from "react";
import { compressImage } from "../utils/image-compression";

interface EditorProps {
  onChange?: (value: string) => void;
  initialContent?: string;
  editable?: boolean;
  onEditorReady?: (editor: BlockNoteEditor) => void;
}

const Editor = ({
  onChange,
  initialContent,
  editable = true,
  onEditorReady
}: EditorProps) => {
  const { resolvedTheme } = useTheme();

  const handleUpload = useCallback(async (file: File): Promise<string> => {
    // Strict validation: Check both MIME type and file extension
    const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
    
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    const isValidMimeType = file.type.startsWith('image/') && validImageTypes.includes(file.type);
    const isValidExtension = validExtensions.includes(fileExtension);

    if (!isValidMimeType || !isValidExtension) {
      throw new Error('Only image files are allowed (PNG, JPG, GIF, WebP, BMP, SVG)');
    }

    // Compresser l'image avant de la sauvegarder (même compression que pour les canvas)
    try {
      const compressedDataUrl = await compressImage(file, {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.65,
        maxSizeKB: 120,
      });
      return compressedDataUrl;
    } catch (error) {
      console.error("Erreur lors de la compression de l'image:", error);
      // Fallback: utiliser l'image originale non compressée (mais en data URL pour la sauvegarde)
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl);
        };
        reader.onerror = () => {
          reject(new Error('Failed to read image file'));
        };
        reader.readAsDataURL(file);
      });
    }
  }, []);

  const parsedContent = useMemo(() => {
    if (initialContent && initialContent.trim() !== "") {
      try {
        const parsed = JSON.parse(initialContent) as PartialBlock[];
        // If parsed content is valid and not empty, use it
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
        return undefined;
      } catch (error) {
        console.error("Failed to parse initialContent:", error);
        return undefined;
      }
    }
    return undefined;
  }, [initialContent]);

  const editor: BlockNoteEditor = useBlockNote({
    editable,
    initialContent: parsedContent,
    onEditorContentChange: (editor) => {
      if (onChange) {
        onChange(JSON.stringify(editor.topLevelBlocks, null, 2));
      }
    },
    uploadFile: handleUpload
  })

  useEffect(() => {
    if (onEditorReady) {
      onEditorReady(editor);
    }

    // Enable paste handling explicitly
    const handlePaste = async (e: Event) => {
      const clipboardEvent = e as ClipboardEvent;
      const items = clipboardEvent.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          clipboardEvent.preventDefault();
          const file = item.getAsFile();
          if (file && editor) {
            try {
              const url = await handleUpload(file);
              // Insert image using BlockNote's API
              editor.insertBlocks(
                [
                  {
                    type: "image",
                    props: {
                      url: url,
                    },
                  },
                ],
                editor.getTextCursorPosition().block,
                "after"
              );
            } catch (error) {
              console.error("Failed to paste image:", error);
            }
          }
          break;
        }
      }
    };

    // Get the editor's DOM element and add paste listener
    const editorElement = document.querySelector('[data-content-type="editor"]') || 
                         document.querySelector('.bn-editor') ||
                         document.querySelector('[role="textbox"]');
    
    if (editorElement) {
      editorElement.addEventListener('paste', handlePaste as EventListener);
    }

    // Also try to add it to window
    window.addEventListener('paste', handlePaste as EventListener);

    return () => {
      if (editorElement) {
        editorElement.removeEventListener('paste', handlePaste as EventListener);
      }
      window.removeEventListener('paste', handlePaste as EventListener);
    };
  }, [editor, onEditorReady, handleUpload]);

  // Restrict file input to images only and handle drag & drop
  useEffect(() => {
    let observer: MutationObserver | undefined;

    // Strict validation function
    const isValidImageFile = (file: File): boolean => {
      const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
      const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
      
      const fileName = file.name.toLowerCase();
      const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
      const isValidMimeType = file.type.startsWith('image/') && validImageTypes.includes(file.type);
      const isValidExtension = validExtensions.includes(fileExtension);
      
      return isValidMimeType && isValidExtension;
    };

    // Intercept ALL file change events in the entire document with capture phase
    const handleFileChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target && target.type === 'file' && target.files && target.files.length > 0) {
        const file = target.files[0];
        if (!isValidImageFile(file)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          alert('Only image files are allowed (PNG, JPG, GIF, WebP, BMP, SVG). Please select an image file.');
          target.value = ''; // Clear the input
          return false;
        }
      }
    };

    // Intercept drag & drop globally
    const handleDragOver = (e: Event) => {
      const dragEvent = e as DragEvent;
      // Only prevent default if there are files and they're not images
      if (dragEvent.dataTransfer?.files && dragEvent.dataTransfer.files.length > 0) {
        const file = dragEvent.dataTransfer.files[0];
        if (!isValidImageFile(file)) {
          dragEvent.preventDefault();
          dragEvent.stopPropagation();
        }
      }
    };

    const handleDrop = (e: Event) => {
      const dragEvent = e as DragEvent;
      const files = dragEvent.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (!isValidImageFile(file)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          alert('Only image files are allowed (PNG, JPG, GIF, WebP, BMP, SVG). Please drop an image file.');
          return;
        }
      }
    };

    // Function to set accept attribute on file inputs
    const setAcceptOnInputs = () => {
      const allFileInputs = document.querySelectorAll('input[type="file"]');
      allFileInputs.forEach((input) => {
        const htmlInput = input as HTMLInputElement;
        htmlInput.accept = 'image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp,image/svg+xml';
        htmlInput.setAttribute('accept', 'image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp,image/svg+xml');
      });
    };

    // Add global listeners with capture phase (runs before any other handlers)
    document.addEventListener('change', handleFileChange as EventListener, true);
    document.addEventListener('dragover', handleDragOver as EventListener, true);
    document.addEventListener('drop', handleDrop as EventListener, true);

    // Set accept on existing inputs
    setAcceptOnInputs();

    // Use MutationObserver to catch dynamically created file inputs ANYWHERE in the document
    observer = new MutationObserver(() => {
      setAcceptOnInputs();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also periodically check (backup in case MutationObserver misses something)
    const interval = setInterval(setAcceptOnInputs, 100);

    return () => {
      document.removeEventListener('change', handleFileChange as EventListener, true);
      document.removeEventListener('dragover', handleDragOver as EventListener, true);
      document.removeEventListener('drop', handleDrop as EventListener, true);
      if (observer) {
        observer.disconnect();
      }
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={`w-full ${resolvedTheme === "dark" ? "bg-[#191919]" : "bg-background"}`}>
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      />
    </div>
  )
}

export default Editor;
