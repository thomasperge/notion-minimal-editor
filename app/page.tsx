"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { useDocumentsContext } from "@/components/providers/documents-provider";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";
import * as QRCode from "qrcode";

const HomePage = () => {
  const Editor = useMemo(() => dynamic(() => import("@/components/editor"), { ssr: false }) ,[]);
  const CanvasEditor = useMemo(() => dynamic(() => import("@/components/canvas-editor"), { ssr: false }) ,[]);
  const editorRef = useRef<BlockNoteEditor | null>(null);
  const previousDocumentIdRef = useRef<string | null>(null);
  const pendingSaveRef = useRef<string | null>(null);
  
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [initialContent, setInitialContent] = useState<string | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState(false);
  const [editorWidth, setEditorWidth] = useState<'narrow' | 'medium' | 'wide' | 'full'>('medium');
  const [autoSave, setAutoSave] = useState(true);
  const autoSaveRef = useRef(true);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const [editorKey, setEditorKey] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [qrCodeOpen, setQrCodeOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ url: string; title: string; contentLength: number } | null>(null);
  const [qrErrorOpen, setQrErrorOpen] = useState(false);
  const [qrErrorMessage, setQrErrorMessage] = useState<string>('');

  const {
    currentDocumentId,
    isLoaded: documentsLoaded,
    getDocumentContent,
    saveDocumentContent,
    documents,
  } = useDocumentsContext();

  // Migrate old data to new system (one-time migration)
  useEffect(() => {
    if (typeof window !== "undefined" && documentsLoaded) {
      const oldContent = localStorage.getItem("editor-content");
      const documentsList = localStorage.getItem("documents-list");
      
      if (oldContent && !documentsList) {
        try {
          JSON.parse(oldContent);
          const migratedDoc = {
            id: `doc-${Date.now()}-migrated`,
            title: "Migrated Document",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          localStorage.setItem("documents-list", JSON.stringify([migratedDoc]));
          localStorage.setItem("current-document-id", migratedDoc.id);
          localStorage.setItem(`document-${migratedDoc.id}`, oldContent);
          localStorage.removeItem("editor-content");
        } catch (error) {
          console.error("Migration error:", error);
        }
      }
    }
  }, [documentsLoaded]);

  // CRITICAL: Save content of previous document before switching
  const saveCurrentDocumentContent = useCallback((documentId: string | null, content: string | null) => {
    if (!documentId || !content || !autoSaveRef.current) return;
    
    try {
      // Validate content is valid JSON
      const parsed = JSON.parse(content);
      // Accept both arrays (BlockNote) and objects with nodes/edges (React Flow)
      if (Array.isArray(parsed) || (typeof parsed === 'object' && parsed.nodes && parsed.edges)) {
        // Save with explicit document ID to ensure correct storage
        const storageKey = `document-${documentId}`;
        localStorage.setItem(storageKey, content);
        console.log(`✅ Saved content for document ${documentId} (${storageKey})`);
        
        // Also update via the hook to update metadata
        saveDocumentContent(documentId, content);
      }
    } catch (error) {
      console.error(`❌ Failed to save content for document ${documentId}:`, error);
    }
  }, [saveDocumentContent]);

  // Save content when it changes (only for current document)
  const handleContentChange = useCallback((content: string) => {
    if (!content || !currentDocumentId) return;
    
    // Store pending save with current document ID
    pendingSaveRef.current = content;
    
    if (autoSaveRef.current && currentDocumentId) {
      saveCurrentDocumentContent(currentDocumentId, content);
    }
  }, [currentDocumentId, saveCurrentDocumentContent]);

  // CRITICAL: Handle document switching - save old, load new
  useEffect(() => {
    if (!documentsLoaded) return;

    // Save previous document content BEFORE switching
    if (previousDocumentIdRef.current && previousDocumentIdRef.current !== currentDocumentId) {
      if (editorRef.current && pendingSaveRef.current) {
        console.log(`💾 Saving previous document ${previousDocumentIdRef.current} before switch`);
        saveCurrentDocumentContent(previousDocumentIdRef.current, pendingSaveRef.current);
        pendingSaveRef.current = null;
      } else if (editorRef.current) {
        // Try to get current content from editor
        try {
          const currentContent = JSON.stringify(editorRef.current.topLevelBlocks, null, 2);
          console.log(`💾 Saving previous document ${previousDocumentIdRef.current} (from editor)`);
          saveCurrentDocumentContent(previousDocumentIdRef.current, currentContent);
        } catch (error) {
          console.error("Failed to get content from editor:", error);
        }
      }
    }

    // Reset editor state
    setIsContentLoaded(false);
    editorRef.current = null;
    pendingSaveRef.current = null;

    // Load new document content
    if (currentDocumentId) {
      const content = getDocumentContent(currentDocumentId);
      
      if (content) {
        try {
          // Validate content
          let parsed = JSON.parse(content);
          
          // Handle legacy format: if content is wrapped in array with canvas format
          // Extract it (e.g., [{ nodes, edges }] -> { nodes, edges })
          if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'object' && parsed[0].nodes && parsed[0].edges) {
            console.log(`🔄 Detected legacy wrapped format, extracting canvas content`);
            parsed = parsed[0];
            // Re-save in correct format
            const correctContent = JSON.stringify(parsed);
            localStorage.setItem(`document-${currentDocumentId}`, correctContent);
            saveDocumentContent(currentDocumentId, correctContent);
            setInitialContent(correctContent);
            return;
          }
          
          // Accept both arrays (BlockNote) and objects with nodes/edges (React Flow)
          if (Array.isArray(parsed) || (typeof parsed === 'object' && parsed.nodes && parsed.edges)) {
            const lengthInfo = Array.isArray(parsed) 
              ? `${parsed.length} blocks`
              : `${parsed.nodes?.length || 0} nodes, ${parsed.edges?.length || 0} edges`;
            console.log(`📂 Loading document ${currentDocumentId} (${lengthInfo})`);
            setInitialContent(content);
          } else {
            console.warn(`⚠️ Invalid content format for document ${currentDocumentId}`);
            setInitialContent(undefined);
          }
        } catch (error) {
          console.error(`❌ Failed to parse content for document ${currentDocumentId}:`, error);
          setInitialContent(undefined);
        }
      } else {
        console.log(`📄 New empty document ${currentDocumentId}`);
        setInitialContent(undefined);
      }
      
      // Force editor re-render with new key
      setEditorKey(`${currentDocumentId}-${Date.now()}`);
      setIsContentLoaded(true);
    } else {
      setInitialContent(undefined);
      setIsContentLoaded(true);
      setEditorKey("");
    }

    // Update previous document reference
    previousDocumentIdRef.current = currentDocumentId;
  }, [currentDocumentId, documentsLoaded, getDocumentContent, saveCurrentDocumentContent]);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedWidth = localStorage.getItem('editor-width');
      if (savedWidth && ['narrow', 'medium', 'wide', 'full'].includes(savedWidth)) {
        setEditorWidth(savedWidth as 'narrow' | 'medium' | 'wide' | 'full');
      }
      
      const savedAutoSave = localStorage.getItem('editor-autoSave');
      if (savedAutoSave !== null) {
        const autoSaveValue = savedAutoSave === 'true';
        setAutoSave(autoSaveValue);
        autoSaveRef.current = autoSaveValue;
      }
      
      // Load sidebar state
      const savedSidebarOpen = localStorage.getItem('sidebar-open');
      if (savedSidebarOpen !== null) {
        setSidebarOpen(savedSidebarOpen === 'true');
      }
      
      setIsLoaded(true);
    }
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && isLoaded) {
      localStorage.setItem('sidebar-open', String(sidebarOpen));
    }
  }, [sidebarOpen, isLoaded]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleEditorReady = (editor: BlockNoteEditor) => {
    editorRef.current = editor;
    
    // Access TipTap editor for undo/redo
    const tiptapEditor = (editor as any)._tiptapEditor;
    
    if (tiptapEditor) {
      setCanUndo(tiptapEditor.can().undo());
      setCanRedo(tiptapEditor.can().redo());
      
      const updateState = () => {
        if (tiptapEditor) {
          setCanUndo(tiptapEditor.can().undo());
          setCanRedo(tiptapEditor.can().redo());
        }
      };
      
      tiptapEditor.on('transaction', updateState);
      tiptapEditor.on('update', updateState);
      
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
    if (!editorRef.current || !currentDocumentId) return;

    const content = getDocumentContent(currentDocumentId);
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
          const blocks = JSON.parse(content);
          exportContent = convertToMarkdown(blocks);
          filename = 'document.md';
          mimeType = 'text/markdown';
          break;
        case 'html':
          const blocksHtml = JSON.parse(content);
          exportContent = convertToHTML(blocksHtml);
          filename = 'document.html';
          mimeType = 'text/html';
          break;
      }

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

  const extractText = (content: any[]): string => {
    if (!content || !Array.isArray(content)) return '';
    return content.map((item: any) => {
      if (typeof item === 'string') return item;
      // BlockNote structure: item.text or item.content
      if (item.text) return item.text;
      if (item.type === 'text' && item.text) return item.text;
      if (item.content && Array.isArray(item.content)) return extractText(item.content);
      if (item.content && typeof item.content === 'string') return item.content;
      // Try to extract any string value
      if (typeof item === 'object') {
        const values = Object.values(item).filter(v => typeof v === 'string');
        if (values.length > 0) return values.join(' ');
      }
      return '';
    }).join('');
  };

  const convertToMarkdown = (blocks: any[]): string => {
    if (!blocks || !Array.isArray(blocks)) return '';
    
    let markdown = '';
    for (const block of blocks) {
      // Try to extract text from content, or from children, or from block itself
      let text = extractText(block.content || []);
      
      // If no text in content, try children
      if (!text && block.children && Array.isArray(block.children) && block.children.length > 0) {
        text = extractText(block.children);
      }
      
      // If still no text, check if there's text directly in the block
      if (!text && block.props?.text) {
        text = block.props.text;
      }
      
      if (block.type === 'paragraph') {
        if (text) {
          markdown += text + '\n\n';
        }
      } else if (block.type === 'heading') {
        const level = block.props?.level || 1;
        markdown += '#'.repeat(level) + ' ' + (text || 'Untitled') + '\n\n';
      } else if (block.type === 'bulletListItem') {
        markdown += '- ' + (text || '') + '\n';
      } else if (block.type === 'numberedListItem') {
        markdown += '1. ' + (text || '') + '\n';
      } else if (block.type === 'image') {
        markdown += `![${block.props?.altText || 'image'}](${block.props?.url || ''})\n\n`;
      } else if (text) {
        markdown += text + '\n\n';
      }
    }
    return markdown.trim();
  };

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
    if (!editorRef.current || !currentDocumentId) {
      alert('Editor not ready or no document selected');
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
        const lines = content.split('\n');
        blocks = [];
        
        for (const line of lines) {
          if (line.trim() === '') {
            blocks.push({
              type: 'paragraph' as const,
              content: ''
            });
            continue;
          }
          
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
        
        blocks = blocks.filter(block => {
          if (block.type === 'paragraph' && typeof block.content === 'string' && !block.content.trim()) {
            return blocks.length > 1;
          }
          return true;
        });
      } else if (format === 'html') {
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

      const contentStr = JSON.stringify(blocks, null, 2);
      
      if (!currentDocumentId) {
        alert('Please select or create a document first');
        return;
      }
      
      // Save directly to localStorage with explicit key
      const storageKey = `document-${currentDocumentId}`;
      localStorage.setItem(storageKey, contentStr);
      saveDocumentContent(currentDocumentId, contentStr);
      
      try {
        const currentBlocks = editorRef.current.topLevelBlocks;
        if (currentBlocks && Array.isArray(currentBlocks) && currentBlocks.length > 0) {
          editorRef.current.replaceBlocks(currentBlocks, blocks);
        } else {
          setInitialContent(contentStr);
          setEditorKey(`${currentDocumentId}-${Date.now()}`);
          return;
        }

        setInitialContent(contentStr);
        alert('Content imported successfully');
      } catch (replaceError) {
        console.error('Replace blocks error:', replaceError);
        setInitialContent(contentStr);
        setEditorKey(`${currentDocumentId}-${Date.now()}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing: ' + (error instanceof Error ? error.message : 'Invalid format'));
    }
  };

  // Handle clear content
  const handleClearContent = () => {
    if (!currentDocumentId) return;
    
    const emptyContent = JSON.stringify([{ type: "paragraph" as const, content: "" }]);
    const storageKey = `document-${currentDocumentId}`;
    localStorage.setItem(storageKey, emptyContent);
    saveDocumentContent(currentDocumentId, emptyContent);
    setInitialContent(emptyContent);
    
    if (editorRef.current) {
      try {
        editorRef.current.replaceBlocks(
          editorRef.current.topLevelBlocks,
          [{ type: "paragraph" as const, content: "" }]
        );
      } catch (error) {
        setEditorKey(`${currentDocumentId}-${Date.now()}`);
      }
    }
  };

  // Handle QR code generation
  const handleShowQRCode = async () => {
    console.log('handleShowQRCode called');
    if (!editorRef.current || !currentDocumentId) {
      console.log('No editor or document ID');
      setQrErrorMessage('No content to share');
      setQrErrorOpen(true);
      return;
    }

    const content = getDocumentContent(currentDocumentId);
    if (!content) {
      console.log('No content found');
      setQrErrorMessage('No content to share');
      setQrErrorOpen(true);
      return;
    }
    console.log('Content found, proceeding...');

    try {
      console.log('Step 1: Getting document title...');
      // Get document title
      const documentsList = localStorage.getItem('documents-list');
      let documentTitle = 'Untitled Document';
      if (documentsList) {
        const docs = JSON.parse(documentsList);
        const currentDoc = docs.find((doc: any) => doc.id === currentDocumentId);
        if (currentDoc) {
          documentTitle = currentDoc.title || 'Untitled Document';
        }
      }
      console.log('Step 2: Converting to Markdown...');

      // Convert to Markdown for sharing
      const blocks = JSON.parse(content);
      console.log('Blocks structure:', JSON.stringify(blocks, null, 2).substring(0, 500));
      const markdownContent = convertToMarkdown(blocks);
      console.log('Markdown content length:', markdownContent.length);
      console.log('Step 3: Checking if content is empty...');
      console.log('Blocks array length:', blocks.length);
      console.log('All blocks:', blocks.map((b: any) => ({ type: b.type, hasContent: !!b.content, contentLength: b.content?.length || 0, hasChildren: !!b.children, childrenLength: b.children?.length || 0 })));
      
      // Check if content is empty - but allow empty documents to still generate QR code
      // An empty QR code can still be useful to show the structure
      let finalMarkdownContent = markdownContent;
      if (!markdownContent || markdownContent.trim().length === 0) {
        console.log('Content is empty - but proceeding anyway to allow empty document QR codes');
        // Use a minimal placeholder for empty documents
        finalMarkdownContent = '[Empty Document]';
      }
      
      console.log('Step 4: Processing final content...');
      const finalContent = finalMarkdownContent.trim() || '[Empty Document]';
      
      // EARLY CHECK: Estimate final URL size BEFORE compression
      // QR code maximum is ~2500 chars, we need to check if content will fit
      // Compressed base64 is roughly 1.33x original size in worst case
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      // Estimate compression ratio - deflate is very good on text (70%+ reduction), but images in base64 compress poorly (~10-15% reduction)
      // Use conservative estimate: 60% of original size after compression
      const estimatedCompressedSize = Math.ceil(finalContent.length * 0.6);
      const estimatedEncodedSize = Math.ceil(estimatedCompressedSize * 1.4); // base64url = +33%, but slightly smaller than base64
      const estimatedUrlLength = origin.length + 6 + estimatedEncodedSize; // origin + /view# + encoded
      
      console.log('Estimated sizes:', {
        original: finalContent.length,
        compressed: estimatedCompressedSize,
        encoded: estimatedEncodedSize,
        totalUrl: estimatedUrlLength
      });
      
      // Check if URL will be too long
      if (estimatedUrlLength > 2800) {
        const imageCount = blocks.filter((b: any) => b.type === 'image').length;
        const hasImages = imageCount > 0;
        
        let errorMessage = `Document too large for QR code.\n\n`;
        errorMessage += `Estimated size: ~${estimatedUrlLength} characters\n`;
        errorMessage += `Recommended maximum: ~2500 characters\n\n`;
        
        if (hasImages) {
          errorMessage += `⚠️ Your document contains ${imageCount} image${imageCount > 1 ? 's' : ''}.\n`;
          errorMessage += `High-quality images exceed the limit.\n\n`;
        }
        
        errorMessage += `Solutions:\n`;
        errorMessage += `• Use Export + AirDrop to share\n`;
        errorMessage += `• Reduce text size\n`;
        if (hasImages) {
          errorMessage += `• Remove images\n`;
        }
        
        setQrErrorMessage(errorMessage);
        setQrErrorOpen(true);
        return;
      }
      
      console.log('Step 5: Compressing and encoding content...');
      
      // Base64URL encoding (URL-safe version of base64, more compact than regular base64 in URLs)
      // Replaces + with -, / with _, and removes = padding
      const base64UrlEncode = (data: Uint8Array): string => {
        let binaryString = '';
        for (let i = 0; i < data.length; i++) {
          binaryString += String.fromCharCode(data[i]);
        }
        const base64 = btoa(binaryString);
        // Convert to base64url (URL-safe)
        return base64
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, ''); // Remove padding
      };
      
      let encoded: string;
      let compressedSize = 0;
      let originalSize = finalContent.length;
      
      try {
        if (typeof CompressionStream !== 'undefined') {
          // Compress first
          const stream = new CompressionStream('deflate');
          const writer = stream.writable.getWriter();
          const reader = stream.readable.getReader();
          
          writer.write(new TextEncoder().encode(finalContent));
          writer.close();
          
          const chunks: Uint8Array[] = [];
          let done = false;
          
          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
              chunks.push(value);
            }
          }
          
          const compressedData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
          let offset = 0;
          for (const chunk of chunks) {
            compressedData.set(chunk, offset);
            offset += chunk.length;
          }
          
          compressedSize = compressedData.length;
          
          // Encode with base64url (URL-safe and slightly more compact in URLs)
          encoded = 'c:' + base64UrlEncode(compressedData);
          
          console.log('Content compressed and encoded:', {
            original: originalSize,
            compressed: compressedSize,
            encodedLength: encoded.length,
            compressionRatio: ((1 - compressedSize / originalSize) * 100).toFixed(1) + '%'
          });
        } else {
          // No compression, just base64url encode
          const textBytes = new TextEncoder().encode(finalContent);
          encoded = base64UrlEncode(textBytes);
          console.log('Compression not available, using base64url only');
        }
      } catch (error) {
        console.warn('Compression/encoding failed, using base64 fallback:', error);
        // Fallback to base64 if everything fails
        encoded = btoa(unescape(encodeURIComponent(finalContent)));
      }
      
      console.log('Step 6: Creating URL...');
      const viewUrl = `${origin}/view#${encoded}`;
      
      console.log('Final URL length:', viewUrl.length, 'characters');
      
      console.log('Step 7: Generating QR code...');
      
      // Check if URL is too long (QR codes can handle up to ~3000 chars, but smaller is better)
      if (viewUrl.length > 2000) {
        console.warn('⚠️ URL very long (' + viewUrl.length + ' characters). QR code may be difficult to scan.');
        console.warn('Reduce content size or use Export + AirDrop for large documents.');
      }
      
      // Final safety check - if our estimation was too generous and URL is still too long, fail
      if (viewUrl.length > 3000) {
        setQrErrorMessage(`URL way too long (${viewUrl.length} characters). QR code cannot be generated.\n\nUse Export + AirDrop to share this document.`);
        setQrErrorOpen(true);
        return;
      }
      
      try {
        console.log('Attempting to generate QR code for URL length:', viewUrl.length);
        
        // Generate QR code using qrcode library (client-side, no external API needed)
        // For very long URLs, we need to adjust options
        const qrOptions: any = {
          margin: 1, // Smaller margin for more space
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        };
        
        // For very long URLs, we need to balance error correction vs capacity
        // QR codes can store more data with lower error correction
        if (viewUrl.length > 1500) {
          // For very long URLs, use lower error correction to fit more data
          qrOptions.errorCorrectionLevel = 'L'; // Lowest error correction (can store ~3000 chars)
          qrOptions.width = 1200; // Extra large size for very dense QR codes (better scanning)
          qrOptions.margin = 0; // No margin to maximize module size
          console.log('Using low error correction and extra large size (1200px) for very long URL');
        } else if (viewUrl.length > 1000) {
          qrOptions.errorCorrectionLevel = 'M'; // Medium error correction
          qrOptions.width = 800; // Larger size for better scanning
          console.log('Using medium error correction and larger size for long URL');
        } else {
          qrOptions.errorCorrectionLevel = 'H'; // High error correction for shorter URLs
          qrOptions.width = 600;
        }
        
        // Use Promise version explicitly
        const qrCodeDataUrl = await new Promise<string>((resolve, reject) => {
          QRCode.toDataURL(viewUrl, qrOptions, (err, url) => {
            if (err) {
              reject(err);
            } else if (url) {
              resolve(url);
            } else {
              reject(new Error('QR code generation returned no data'));
            }
          });
        });
        
        console.log('QR Code generated successfully:', {
          originalLength: markdownContent.length,
          compressedSize: compressedSize || 'N/A',
          urlLength: viewUrl.length,
          qrCodeSize: qrCodeDataUrl.length + ' bytes (base64)',
          urlPreview: viewUrl.substring(0, 60) + '...'
        });

        // Set QR code data and open modal
        console.log('Step 8: Opening QR Code modal');
        setQrCodeData({
          url: qrCodeDataUrl, // Data URL (base64 image)
          title: documentTitle,
          contentLength: markdownContent.length
        });
      } catch (qrError: any) {
        console.error('Failed to generate QR code:', qrError);
        console.error('Error details:', {
          message: qrError?.message,
          stack: qrError?.stack,
          urlLength: viewUrl.length
        });
        
        // More helpful error message
        const errorMsg = qrError?.message || 'Unknown error';
        if (errorMsg.includes('too long') || errorMsg.includes('exceed') || viewUrl.length > 2500) {
          setQrErrorMessage(`URL too long (${viewUrl.length} characters). Recommended maximum: ~2500 characters.\n\nUse Export + AirDrop to share, or reduce document size.`);
        } else {
          setQrErrorMessage(`Failed to generate QR code: ${errorMsg}\n\nPlease try again or use Export + AirDrop.`);
        }
        setQrErrorOpen(true);
        return;
      }
      console.log('Step 9: Setting qrCodeOpen to true');
      setQrCodeOpen(true);
      console.log('Step 10: QR Code modal state set to true');
    } catch (outerError) {
      console.error('QR code error:', outerError);
      setQrErrorMessage('Error generating QR code. Please use Export instead.');
      setQrErrorOpen(true);
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

    window.addEventListener('storage', handleStorageChange);

    const interval = setInterval(() => {
      const savedWidth = localStorage.getItem('editor-width');
      if (savedWidth && ['narrow', 'medium', 'wide', 'full'].includes(savedWidth)) {
        if (savedWidth !== editorWidth) {
          setEditorWidth(savedWidth as 'narrow' | 'medium' | 'wide' | 'full');
        }
      }
      
      const savedAutoSave = localStorage.getItem('editor-autoSave');
      if (savedAutoSave !== null) {
        const autoSaveValue = savedAutoSave === 'true';
        if (savedAutoSave !== String(autoSaveRef.current)) {
          setAutoSave(autoSaveValue);
        }
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
      // Save current document before unmount
      if (previousDocumentIdRef.current && editorRef.current && pendingSaveRef.current) {
        saveCurrentDocumentContent(previousDocumentIdRef.current, pendingSaveRef.current);
      }
      
      if (editorRef.current) {
        const tiptapEditor = (editorRef.current as any)._tiptapEditor;
        const updateState = (editorRef.current as any).__updateState;
        if (tiptapEditor && updateState) {
          tiptapEditor.off('transaction', updateState);
          tiptapEditor.off('update', updateState);
        }
      }
    };
  }, [saveCurrentDocumentContent]);

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && <Sidebar onToggle={toggleSidebar} />}
      <div className={`flex-1 flex flex-col min-w-0 ${sidebarOpen ? 'ml-64' : ''}`}>
        <Header
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onClearContent={handleClearContent}
          onExport={handleExport}
          onImport={handleImport}
          onShowQRCode={handleShowQRCode}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
        />
        {isLoaded && isContentLoaded && documentsLoaded && (() => {
          const currentDoc = documents.find(doc => doc.id === currentDocumentId);
          const isCanvas = currentDoc?.type === 'canvas';
          
          if (isCanvas) {
            return (
              <CanvasEditor
                key={editorKey || currentDocumentId}
                initialContent={initialContent}
                onChange={handleContentChange}
              />
            );
          }
          
          return (
            <div className={`mx-auto pt-10 pb-24 px-4 min-h-[calc(100vh-3.5rem)] w-full ${
              editorWidth === 'narrow' ? 'max-w-2xl' :
              editorWidth === 'medium' ? 'max-w-4xl' :
              editorWidth === 'wide' ? 'max-w-6xl' :
              'max-w-full'
            }`}>
              {currentDocumentId ? (
                <Editor 
                  key={editorKey || currentDocumentId}
                  onEditorReady={handleEditorReady}
                  initialContent={initialContent}
                  onChange={handleContentChange}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">No document selected</p>
                    <p className="text-sm text-muted-foreground">Create a new page from the sidebar</p>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* QR Code Modal */}
      <Dialog.Root open={qrCodeOpen} onOpenChange={setQrCodeOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 z-[300]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[310] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 border bg-background dark:bg-[#1a1a1c] p-4 shadow-lg rounded-lg">
            <Dialog.Title className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>📱</span>
              Scan with iPhone
            </Dialog.Title>
            
            {qrCodeData && (
              <>
                <div className="flex justify-center mb-3">
                  {qrCodeData.url ? (
                    <div className="w-full max-w-full overflow-auto flex justify-center">
                      <Image 
                        src={qrCodeData.url} 
                        alt="QR Code" 
                        width={1200}
                        height={1200}
                        className="max-w-full h-auto border-2 border-border rounded-lg bg-white p-2"
                        unoptimized
                        style={{ imageRendering: 'crisp-edges' }}
                        onError={(e) => {
                          console.error('QR Code image failed to load:', qrCodeData.url.substring(0, 100));
                          console.error('Full QR URL length:', qrCodeData.url.length);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full max-w-[400px] h-[400px] border-2 border-border rounded-lg bg-white p-2 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Generating QR code...</p>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mb-3 text-center">
                  Scan with iPhone camera - Ensure good lighting and hold steady
                </p>
                
                <div className="bg-muted p-3 rounded-md mb-3">
                  <strong className="text-xs block mb-1.5">How to use:</strong>
                  <ol className="text-xs text-muted-foreground space-y-0.5 ml-3 list-decimal">
                    <li>Open Camera on iPhone</li>
                    <li>Point at QR code (zoom in if needed)</li>
                    <li>Safari will open with the content</li>
                    <li>Tap &quot;Copy Text&quot; button</li>
                  </ol>
                </div>
                
                <div className="text-xs text-muted-foreground text-center space-y-0.5">
                  <p>
                    <strong className="text-foreground">{qrCodeData.title}</strong>
                  </p>
                  <p>
                    {qrCodeData.contentLength.toLocaleString()} chars
                  </p>
                </div>
              </>
            )}
            
            <Dialog.Close asChild>
              <button
                className="absolute right-3 top-3 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* QR Code Error Modal */}
      <AlertDialog.Root open={qrErrorOpen} onOpenChange={setQrErrorOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/70 z-[300]" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[310] w-full max-w-md -translate-x-1/2 -translate-y-1/2 border bg-background dark:bg-[#1a1a1c] p-6 shadow-lg rounded-lg gap-4">
            <AlertDialog.Title className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>⚠️</span>
              Cannot Generate QR Code
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground mb-4 whitespace-pre-line">
              {qrErrorMessage}
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2.5 rounded-md border hover:bg-muted text-sm transition-colors">
                  OK
                </button>
              </AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

export default HomePage;
