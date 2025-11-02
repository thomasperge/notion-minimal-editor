"use client";

import { useState, useEffect, useCallback } from "react";

export interface Document {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  type: 'document' | 'canvas'; // Type de document
}

const DOCUMENTS_LIST_KEY = "documents-list";
const CURRENT_DOCUMENT_KEY = "current-document-id";
const DOCUMENT_PREFIX = "document-";

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Function to load documents from localStorage
  const loadDocuments = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const documentsList = localStorage.getItem(DOCUMENTS_LIST_KEY);
        const currentId = localStorage.getItem(CURRENT_DOCUMENT_KEY);

        if (documentsList) {
          const parsed = JSON.parse(documentsList);
          setDocuments(Array.isArray(parsed) ? parsed : []);
        } else {
          setDocuments([]);
        }

        const docs = documentsList ? JSON.parse(documentsList) : [];
        
        if (currentId) {
          setCurrentDocumentId(currentId);
        } else {
          // If no current document, check if there are any documents
          if (Array.isArray(docs) && docs.length > 0) {
            setCurrentDocumentId(docs[0].id);
            localStorage.setItem(CURRENT_DOCUMENT_KEY, docs[0].id);
          } else {
            // Create default document if none exist
            const defaultDoc: Document = {
              id: `doc-${Date.now()}-default`,
              title: "Welcome",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              type: 'document',
            };
            
            // Default welcome content
            const welcomeContent = [
              {
                type: "heading" as const,
                props: { level: 1 as const },
                content: [
                  { type: "text" as const, text: "Welcome to ", styles: {} },
                  { type: "text" as const, text: "Notion Minimal", styles: { textColor: "yellow" } }
                ]
              },
              {
                type: "paragraph" as const,
                content: "This is a minimal Notion-like editor powered by BlockNote. Start writing by clicking here or using the slash command."
              },
              {
                type: "heading" as const,
                props: { level: 2 as const },
                content: "✨ Features"
              },
              {
                type: "bulletListItem" as const,
                content: [
                  { type: "text" as const, text: "Rich text editing with ", styles: {} },
                  { type: "text" as const, text: "formatting", styles: { bold: true, textColor: "purple" } }
                ]
              },
              {
                type: "bulletListItem" as const,
                content: [
                  { type: "text" as const, text: "🌓 Dark and ", styles: {} },
                  { type: "text" as const, text: "☀️ light", styles: {} },
                  { type: "text" as const, text: " mode support", styles: {} }
                ]
              },
              {
                type: "bulletListItem" as const,
                content: "🖼️ Image support - paste or drag & drop"
              },
              {
                type: "bulletListItem" as const,
                content: "📚 Multiple documents in sidebar"
              },
              {
                type: "bulletListItem" as const,
                content: [
                  { type: "text" as const, text: "Export to ", styles: {} },
                  { type: "text" as const, text: "JSON", styles: { textColor: "orange" } },
                  { type: "text" as const, text: ", ", styles: {} },
                  { type: "text" as const, text: "Markdown", styles: { textColor: "orange" } },
                  { type: "text" as const, text: ", or ", styles: {} },
                  { type: "text" as const, text: "HTML", styles: { textColor: "orange" } }
                ]
              },
              {
                type: "bulletListItem" as const,
                content: [
                  { type: "text" as const, text: "📱 QR code sharing for ", styles: {} },
                  { type: "text" as const, text: "iPhone", styles: { bold: true, textColor: "blue" } }
                ]
              },
              {
                type: "heading" as const,
                props: { level: 2 as const },
                content: "🚀 Getting Started"
              },
              {
                type: "numberedListItem" as const,
                content: "Create a new page using the \"New page\" button in the sidebar"
              },
              {
                type: "numberedListItem" as const,
                content: [
                  { type: "text" as const, text: "Type ", styles: {} },
                  { type: "text" as const, text: "\"/\"", styles: { bold: true, backgroundColor: "gray", textColor: "default" } },
                  { type: "text" as const, text: " to see all available commands", styles: {} }
                ]
              },
              {
                type: "numberedListItem" as const,
                content: "Click the user avatar icon to access settings"
              },
              {
                type: "numberedListItem" as const,
                content: [
                  { type: "text" as const, text: "Use the ", styles: {} },
                  { type: "text" as const, text: "share icon", styles: { bold: true, textColor: "green" } },
                  { type: "text" as const, text: " in the header to generate a QR code", styles: {} }
                ]
              },
              {
                type: "paragraph" as const,
                content: ""
              },
              {
                type: "paragraph" as const,
                content: [
                  { type: "text" as const, text: "by ", styles: {} },
                  { type: "link" as const, href: "https://thomaskauffmant.com", content: [{ type: "text" as const, text: "thomaskauffmant.com", styles: { italic: true, textColor: "purple" } }] }
                ]
              }
            ];
            
            const initialDocs = [defaultDoc];
            localStorage.setItem(DOCUMENTS_LIST_KEY, JSON.stringify(initialDocs));
            localStorage.setItem(CURRENT_DOCUMENT_KEY, defaultDoc.id);
            localStorage.setItem(`${DOCUMENT_PREFIX}${defaultDoc.id}`, JSON.stringify(welcomeContent));
            
            setDocuments(initialDocs);
            setCurrentDocumentId(defaultDoc.id);
          }
        }
      } catch (error) {
        console.error("Error loading documents:", error);
        setDocuments([]);
        setCurrentDocumentId(null);
      }
    }
  }, []);

  // Load documents from localStorage on mount
  useEffect(() => {
    loadDocuments();
    setIsLoaded(true);
  }, [loadDocuments]);

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DOCUMENTS_LIST_KEY || e.key === CURRENT_DOCUMENT_KEY) {
        loadDocuments();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [loadDocuments]);

  // Save documents list to localStorage
  const saveDocumentsList = useCallback((docs: Document[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(DOCUMENTS_LIST_KEY, JSON.stringify(docs));
      setDocuments(docs);
    }
  }, []);

  // Create a new document
  const createDocument = useCallback((type: 'document' | 'canvas' = 'document'): Document => {
    const newDoc: Document = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: "Untitled",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type,
    };

    const updatedDocs = [...documents, newDoc];
    saveDocumentsList(updatedDocs);
    setCurrentDocumentId(newDoc.id);
    localStorage.setItem(CURRENT_DOCUMENT_KEY, newDoc.id);

    // Initialize empty content for the document
    localStorage.setItem(`${DOCUMENT_PREFIX}${newDoc.id}`, JSON.stringify([]));

    return newDoc;
  }, [documents, saveDocumentsList, setCurrentDocumentId]);

  // Update document title
  const updateDocumentTitle = useCallback((id: string, newTitle: string) => {
    const updatedDocs = documents.map((doc) =>
      doc.id === id ? { ...doc, title: newTitle, updatedAt: new Date().toISOString() } : doc
    );
    saveDocumentsList(updatedDocs);
  }, [documents, saveDocumentsList]);

  // Delete a document
  const deleteDocument = useCallback((id: string) => {
    console.log('🗑️ Deleting document:', id);
    console.log('Current documents:', documents.length);
    const updatedDocs = documents.filter((doc) => doc.id !== id);
    console.log('Updated documents:', updatedDocs.length);
    saveDocumentsList(updatedDocs);

    // Remove document content
    localStorage.removeItem(`${DOCUMENT_PREFIX}${id}`);

    // If deleting current document, switch to another one
    if (currentDocumentId === id) {
      if (updatedDocs.length > 0) {
        const newCurrentId = updatedDocs[0].id;
        console.log('Switching to document:', newCurrentId);
        setCurrentDocumentId(newCurrentId);
        localStorage.setItem(CURRENT_DOCUMENT_KEY, newCurrentId);
      } else {
        console.log('No documents left');
        setCurrentDocumentId(null);
        localStorage.removeItem(CURRENT_DOCUMENT_KEY);
      }
    }
    console.log('✅ Delete complete');
  }, [documents, currentDocumentId, saveDocumentsList, setCurrentDocumentId]);

  // Duplicate a document
  const duplicateDocument = useCallback((id: string) => {
    const docToDuplicate = documents.find((doc) => doc.id === id);
    if (!docToDuplicate) return;

    const content = localStorage.getItem(`${DOCUMENT_PREFIX}${id}`) || JSON.stringify([]);
    const newDoc: Document = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `${docToDuplicate.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: docToDuplicate.type,
    };

    const updatedDocs = [...documents, newDoc];
    saveDocumentsList(updatedDocs);

    // Copy content
    localStorage.setItem(`${DOCUMENT_PREFIX}${newDoc.id}`, content);

    setCurrentDocumentId(newDoc.id);
    localStorage.setItem(CURRENT_DOCUMENT_KEY, newDoc.id);

    return newDoc;
  }, [documents, saveDocumentsList, setCurrentDocumentId]);

  // Get document content
  const getDocumentContent = useCallback((id: string): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`${DOCUMENT_PREFIX}${id}`);
    }
    return null;
  }, []);

  // Save document content with validation
  const saveDocumentContent = useCallback((id: string, content: string) => {
    if (typeof window === "undefined" || !id || !content) {
      console.warn("⚠️ Invalid save parameters:", { id, hasContent: !!content });
      return;
    }

    try {
      // Validate content is valid JSON and array
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        console.error(`❌ Content for document ${id} is not an array`);
        return;
      }

      // Save with explicit key
      const storageKey = `${DOCUMENT_PREFIX}${id}`;
      localStorage.setItem(storageKey, content);
      
      // Verify save was successful
      const saved = localStorage.getItem(storageKey);
      if (saved !== content) {
        console.error(`❌ Failed to verify save for document ${id}`);
        return;
      }

      // Update document's updatedAt metadata
      setDocuments(prevDocs => {
        const updatedDocs = prevDocs.map((doc) =>
          doc.id === id ? { ...doc, updatedAt: new Date().toISOString() } : doc
        );
        
        // Save metadata to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(DOCUMENTS_LIST_KEY, JSON.stringify(updatedDocs));
        }
        
        return updatedDocs;
      });

      console.log(`✅ Successfully saved document ${id} (${parsed.length} blocks)`);
    } catch (error) {
      console.error(`❌ Error saving document ${id}:`, error);
    }
  }, []);

  // Switch to a document
  const switchToDocument = useCallback((id: string) => {
    setCurrentDocumentId(id);
    localStorage.setItem(CURRENT_DOCUMENT_KEY, id);
  }, [setCurrentDocumentId]);

  return {
    documents,
    currentDocumentId,
    isLoaded,
    createDocument,
    updateDocumentTitle,
    deleteDocument,
    duplicateDocument,
    getDocumentContent,
    saveDocumentContent,
    switchToDocument,
  };
};

