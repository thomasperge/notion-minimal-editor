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
import { useEffect, useCallback } from "react";

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
    // Create a blob URL that works immediately (temporary solution)
    // For production, you'd want to upload to a proper storage service
    return new Promise((resolve, reject) => {
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        reject(new Error('File must be an image'));
        return;
      }

      // For small images, use data URL (base64)
      // For larger images, you might want to use a storage service
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl);
      };
      reader.onerror = () => {
        // Fallback: create blob URL
        const blobUrl = URL.createObjectURL(file);
        resolve(blobUrl);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const editor: BlockNoteEditor = useBlockNote({
    editable,
    initialContent: 
      initialContent && initialContent.trim() !== ""
      ? (() => {
          try {
            return JSON.parse(initialContent) as PartialBlock[];
          } catch (error) {
            console.error("Failed to parse initialContent:", error);
            return undefined;
          }
        })()
      : undefined,
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

  return (
    <div className={`w-full py-8 ${resolvedTheme === "dark" ? "bg-[#191919]" : "bg-background"}`}>
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      />
    </div>
  )
}

export default Editor;
