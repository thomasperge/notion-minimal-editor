"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useRef, useEffect } from "react";
import { Header } from "@/components/header";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";

const STORAGE_KEY = "editor-content";

const HomePage = () => {
  const Editor = useMemo(() => dynamic(() => import("@/components/editor"), { ssr: false }) ,[]);
  const editorRef = useRef<BlockNoteEditor | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [initialContent, setInitialContent] = useState<string | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState(false);
  const [editorWidth, setEditorWidth] = useState<'narrow' | 'medium' | 'wide' | 'full'>('medium');
  const [autoSave, setAutoSave] = useState(true);
  const autoSaveRef = useRef(true);

  // Load content and settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedContent = localStorage.getItem(STORAGE_KEY);
      if (savedContent) {
        try {
          // Validate it's valid JSON
          JSON.parse(savedContent);
          setInitialContent(savedContent);
        } catch (error) {
          console.error("Invalid saved content, clearing localStorage");
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      
      // Load editor width setting
      const savedWidth = localStorage.getItem('editor-width');
      if (savedWidth && ['narrow', 'medium', 'wide', 'full'].includes(savedWidth)) {
        setEditorWidth(savedWidth as 'narrow' | 'medium' | 'wide' | 'full');
      }
      
      // Load auto-save setting
      const savedAutoSave = localStorage.getItem('editor-autoSave');
      if (savedAutoSave !== null) {
        const autoSaveValue = savedAutoSave === 'true';
        setAutoSave(autoSaveValue);
        autoSaveRef.current = autoSaveValue;
      }
      
      setIsLoaded(true);
    }
  }, []);

  // Save content to localStorage when it changes
  const handleContentChange = (content: string) => {
    if (typeof window !== "undefined" && content && autoSaveRef.current) {
      try {
        localStorage.setItem(STORAGE_KEY, content);
      } catch (error) {
        console.error("Failed to save to localStorage:", error);
      }
    }
  };

  const handleEditorReady = (editor: BlockNoteEditor) => {
    editorRef.current = editor;
    
    // Access TipTap editor for undo/redo
    const tiptapEditor = (editor as any)._tiptapEditor;
    
    if (tiptapEditor) {
      // Initial state
      setCanUndo(tiptapEditor.can().undo());
      setCanRedo(tiptapEditor.can().redo());
      
      // Update state on transaction
      const updateState = () => {
        if (tiptapEditor) {
          setCanUndo(tiptapEditor.can().undo());
          setCanRedo(tiptapEditor.can().redo());
        }
      };
      
      tiptapEditor.on('transaction', updateState);
      tiptapEditor.on('update', updateState);
      
      // Store cleanup function
      (editorRef.current as any).__updateState = updateState;
    }
  };

  const handleUndo = () => {
    if (editorRef.current) {
      const tiptapEditor = (editorRef.current as any)._tiptapEditor;
      if (tiptapEditor) {
        tiptapEditor.chain().focus().undo().run();
        setCanUndo(tiptapEditor.can().undo());
        setCanRedo(tiptapEditor.can().redo());
      }
    }
  };

  const handleRedo = () => {
    if (editorRef.current) {
      const tiptapEditor = (editorRef.current as any)._tiptapEditor;
      if (tiptapEditor) {
        tiptapEditor.chain().focus().redo().run();
        setCanUndo(tiptapEditor.can().undo());
        setCanRedo(tiptapEditor.can().redo());
      }
    }
  };

  // Handle export
  const handleExport = (format: 'json' | 'markdown' | 'html') => {
    if (!editorRef.current) return;

    const content = localStorage.getItem(STORAGE_KEY);
    if (!content) {
      alert('No content to export');
      return;
    }

    try {
      let exportContent = '';
      let filename = '';
      let mimeType = '';

      switch (format) {
        case 'json':
          exportContent = content;
          filename = 'document.json';
          mimeType = 'application/json';
          break;
        case 'markdown':
          // Convert BlockNote blocks to markdown
          const blocks = JSON.parse(content);
          exportContent = convertToMarkdown(blocks);
          filename = 'document.md';
          mimeType = 'text/markdown';
          break;
        case 'html':
          // Convert BlockNote blocks to HTML
          const blocksHtml = JSON.parse(content);
          exportContent = convertToHTML(blocksHtml);
          filename = 'document.html';
          mimeType = 'text/html';
          break;
      }

      // Download file
      const blob = new Blob([exportContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting');
    }
  };

  // Helper to extract text from BlockNote content
  const extractText = (content: any[]): string => {
    if (!content || !Array.isArray(content)) return '';
    return content.map((item: any) => {
      if (typeof item === 'string') return item;
      if (item.text) return item.text;
      if (item.content) return extractText(item.content);
      return '';
    }).join('');
  };

  // Convert BlockNote blocks to Markdown (simplified)
  const convertToMarkdown = (blocks: any[]): string => {
    if (!blocks || !Array.isArray(blocks)) return '';
    
    let markdown = '';
    for (const block of blocks) {
      const text = extractText(block.content || []);
      
      if (block.type === 'paragraph') {
        markdown += text + '\n\n';
      } else if (block.type === 'heading') {
        const level = block.props?.level || 1;
        markdown += '#'.repeat(level) + ' ' + text + '\n\n';
      } else if (block.type === 'bulletListItem') {
        markdown += '- ' + text + '\n';
      } else if (block.type === 'numberedListItem') {
        markdown += '1. ' + text + '\n';
      } else if (block.type === 'image') {
        markdown += `![${block.props?.altText || 'image'}](${block.props?.url || ''})\n\n`;
      } else if (text) {
        // Default: just add the text
        markdown += text + '\n\n';
      }
    }
    return markdown.trim();
  };

  // Convert BlockNote blocks to HTML (simplified)
  const convertToHTML = (blocks: any[]): string => {
    if (!blocks || !Array.isArray(blocks)) return '';
    
    let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Document</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6}</style></head><body>';
    let inList = false;
    let listType = '';
    
    for (const block of blocks) {
      const text = extractText(block.content || []);
      
      if (block.type === 'paragraph') {
        if (inList) {
          html += `</${listType}>`;
          inList = false;
        }
        html += `<p>${escapeHtml(text)}</p>`;
      } else if (block.type === 'heading') {
        if (inList) {
          html += `</${listType}>`;
          inList = false;
        }
        const level = block.props?.level || 1;
        html += `<h${level}>${escapeHtml(text)}</h${level}>`;
      } else if (block.type === 'bulletListItem') {
        if (!inList || listType !== 'ul') {
          if (inList) html += `</${listType}>`;
          html += '<ul>';
          inList = true;
          listType = 'ul';
        }
        html += `<li>${escapeHtml(text)}</li>`;
      } else if (block.type === 'numberedListItem') {
        if (!inList || listType !== 'ol') {
          if (inList) html += `</${listType}>`;
          html += '<ol>';
          inList = true;
          listType = 'ol';
        }
        html += `<li>${escapeHtml(text)}</li>`;
      } else if (block.type === 'image') {
        if (inList) {
          html += `</${listType}>`;
          inList = false;
        }
        html += `<img src="${escapeHtml(block.props?.url || '')}" alt="${escapeHtml(block.props?.altText || '')}" style="max-width:100%;height:auto;" />`;
      } else if (text) {
        if (inList) {
          html += `</${listType}>`;
          inList = false;
        }
        html += `<p>${escapeHtml(text)}</p>`;
      }
    }
    
    if (inList) {
      html += `</${listType}>`;
    }
    
    html += '</body></html>';
    return html;
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Handle import
  const handleImport = (content: string, format: 'json' | 'markdown' | 'html') => {
    if (!editorRef.current) {
      alert('Editor not ready');
      return;
    }

    try {
      let blocks: any[] = [];

      if (format === 'json') {
        blocks = JSON.parse(content);
        if (!Array.isArray(blocks)) {
          throw new Error('Invalid JSON format');
        }
      } else if (format === 'markdown') {
        // Convert markdown to BlockNote blocks (simplified)
        const lines = content.split('\n');
        blocks = [];
        
        for (const line of lines) {
          if (line.trim() === '') {
            // Add empty paragraph for blank lines
            blocks.push({
              type: 'paragraph' as const,
              content: ''
            });
            continue;
          }
          
          // Headings
          if (line.startsWith('### ')) {
            blocks.push({
              type: 'heading' as const,
              props: { level: 3 as const },
              content: line.replace('### ', '')
            });
          } else if (line.startsWith('## ')) {
            blocks.push({
              type: 'heading' as const,
              props: { level: 2 as const },
              content: line.replace('## ', '')
            });
          } else if (line.startsWith('# ')) {
            blocks.push({
              type: 'heading' as const,
              props: { level: 1 as const },
              content: line.replace('# ', '')
            });
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            blocks.push({
              type: 'bulletListItem' as const,
              content: line.replace(/^[-*] /, '')
            });
          } else if (/^\d+\. /.test(line)) {
            blocks.push({
              type: 'numberedListItem' as const,
              content: line.replace(/^\d+\. /, '')
            });
          } else {
            blocks.push({
              type: 'paragraph' as const,
              content: line
            });
          }
        }
        
        // Filter out empty paragraphs if they're the only content
        blocks = blocks.filter(block => {
          if (block.type === 'paragraph' && typeof block.content === 'string' && !block.content.trim()) {
            return blocks.length > 1; // Keep if there are other blocks
          }
          return true;
        });
      } else if (format === 'html') {
        // Convert HTML to BlockNote blocks (simplified)
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const body = doc?.body;
        
        if (!body) {
          throw new Error('Impossible de parser le HTML');
        }
        
        blocks = [];

        const processNode = (node: Node): any[] => {
          const result: any[] = [];
          
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            const tagName = element.tagName.toLowerCase();
            
            if (tagName === 'h1') {
              const text = element.textContent?.trim();
              if (text) {
                result.push({
                  type: 'heading' as const,
                  props: { level: 1 as const },
                  content: text
                });
              }
            } else if (tagName === 'h2') {
              const text = element.textContent?.trim();
              if (text) {
                result.push({
                  type: 'heading' as const,
                  props: { level: 2 as const },
                  content: text
                });
              }
            } else if (tagName === 'h3') {
              const text = element.textContent?.trim();
              if (text) {
                result.push({
                  type: 'heading' as const,
                  props: { level: 3 as const },
                  content: text
                });
              }
            } else if (tagName === 'ul') {
              Array.from(element.children || []).forEach((li) => {
                const text = li.textContent?.trim();
                if (text) {
                  result.push({
                    type: 'bulletListItem' as const,
                    content: text
                  });
                }
              });
            } else if (tagName === 'ol') {
              Array.from(element.children || []).forEach((li) => {
                const text = li.textContent?.trim();
                if (text) {
                  result.push({
                    type: 'numberedListItem' as const,
                    content: text
                  });
                }
              });
            } else if (tagName === 'p') {
              const text = element.textContent?.trim();
              if (text) {
                result.push({
                  type: 'paragraph' as const,
                  content: text
                });
              }
            } else if (tagName === 'img') {
              const imgElement = element as HTMLImageElement;
              if (imgElement.src) {
                result.push({
                  type: 'image' as const,
                  props: {
                    url: imgElement.src || '',
                    altText: imgElement.alt || ''
                  }
                });
              }
            } else {
              // Process children only if they exist
              if (element.childNodes && element.childNodes.length > 0) {
                Array.from(element.childNodes).forEach(child => {
                  try {
                    const processed = processNode(child);
                    if (processed.length > 0) {
                      result.push(...processed);
                    }
                  } catch (err) {
                    console.warn('Error processing node:', err);
                  }
                });
              } else if (element.textContent?.trim()) {
                // If no children but has text, create a paragraph
                result.push({
                  type: 'paragraph' as const,
                  content: element.textContent.trim()
                });
              }
            }
          }
          
          return result;
        };

        Array.from(body.childNodes).forEach(child => {
          const processed = processNode(child);
          if (processed.length > 0) {
            blocks.push(...processed);
          }
        });
        
        // If no blocks were created, create a paragraph with the text content
        if (blocks.length === 0 && body.textContent) {
          blocks.push({
            type: 'paragraph' as const,
            content: body.textContent.trim()
          });
        }
      }

      if (blocks.length === 0) {
            alert('No content to import');
        return;
      }

      // Save to localStorage first
      const contentStr = JSON.stringify(blocks, null, 2);
      localStorage.setItem(STORAGE_KEY, contentStr);
      
      // Replace editor content with imported blocks
      try {
        const currentBlocks = editorRef.current.topLevelBlocks;
        if (currentBlocks && Array.isArray(currentBlocks) && currentBlocks.length > 0) {
          // Replace existing blocks
          editorRef.current.replaceBlocks(currentBlocks, blocks);
        } else {
          // If editor is empty or blocks are invalid, reload the page with new content
          setInitialContent(contentStr);
          window.location.reload();
          return;
        }

        // Update initial content for next render
        setInitialContent(contentStr);
        
        alert('Content imported successfully');
      } catch (replaceError) {
        console.error('Replace blocks error:', replaceError);
        // Fallback: reload page with new content
        setInitialContent(contentStr);
        window.location.reload();
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing: ' + (error instanceof Error ? error.message : 'Invalid format'));
    }
  };

  // Handle clear content
  const handleClearContent = () => {
    localStorage.removeItem(STORAGE_KEY);
    setInitialContent(undefined);
    if (editorRef.current) {
      // Clear all blocks by replacing with empty paragraph
      try {
        editorRef.current.replaceBlocks(
          editorRef.current.topLevelBlocks,
          [{ type: "paragraph" as const, content: "" }]
        );
      } catch (error) {
        // Fallback: just reload the page
        window.location.reload();
      }
    }
  };

  // Listen for storage changes to update editor width without reload
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'editor-width' && e.newValue) {
        if (['narrow', 'medium', 'wide', 'full'].includes(e.newValue)) {
          setEditorWidth(e.newValue as 'narrow' | 'medium' | 'wide' | 'full');
        }
      }
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom storage events (from same tab)
    const handleCustomStorage = () => {
      const savedWidth = localStorage.getItem('editor-width');
      if (savedWidth && ['narrow', 'medium', 'wide', 'full'].includes(savedWidth)) {
        setEditorWidth(savedWidth as 'narrow' | 'medium' | 'wide' | 'full');
      }
    };

    // Check localStorage periodically (as fallback, since custom events aren't always reliable)
    const interval = setInterval(() => {
      const savedWidth = localStorage.getItem('editor-width');
      if (savedWidth && ['narrow', 'medium', 'wide', 'full'].includes(savedWidth)) {
        if (savedWidth !== editorWidth) {
          setEditorWidth(savedWidth as 'narrow' | 'medium' | 'wide' | 'full');
        }
      }
      
      const savedAutoSave = localStorage.getItem('editor-autoSave');
      if (savedAutoSave !== null && savedAutoSave !== String(autoSave)) {
        const autoSaveValue = savedAutoSave === 'true';
        setAutoSave(autoSaveValue);
        autoSaveRef.current = autoSaveValue;
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [editorWidth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        const tiptapEditor = (editorRef.current as any)._tiptapEditor;
        const updateState = (editorRef.current as any).__updateState;
        if (tiptapEditor && updateState) {
          tiptapEditor.off('transaction', updateState);
          tiptapEditor.off('update', updateState);
        }
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onClearContent={handleClearContent}
        onExport={handleExport}
        onImport={handleImport}
      />
      <div className={`mx-auto pt-10 pb-24 px-4 border-border min-h-[calc(100vh-3.5rem)] ${
        editorWidth === 'narrow' ? 'max-w-2xl' :
        editorWidth === 'medium' ? 'max-w-4xl' :
        editorWidth === 'wide' ? 'max-w-6xl' :
        'max-w-full'
      }`}>
        {isLoaded && (
          <Editor 
            onEditorReady={handleEditorReady}
            initialContent={initialContent}
            onChange={handleContentChange}
          />
        )}
      </div>
    </div>
  );
}

export default HomePage;
