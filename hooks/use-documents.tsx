"use client";

import { useState, useEffect, useCallback } from "react";

export interface Document {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
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

        if (currentId) {
          setCurrentDocumentId(currentId);
        } else {
          // If no current document, check if there are any documents
          const docs = documentsList ? JSON.parse(documentsList) : [];
          if (Array.isArray(docs) && docs.length > 0) {
            setCurrentDocumentId(docs[0].id);
            localStorage.setItem(CURRENT_DOCUMENT_KEY, docs[0].id);
          } else {
            setCurrentDocumentId(null);
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
  const createDocument = useCallback((): Document => {
    const newDoc: Document = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: "Untitled",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedDocs = [...documents, newDoc];
    saveDocumentsList(updatedDocs);
    setCurrentDocumentId(newDoc.id);
    localStorage.setItem(CURRENT_DOCUMENT_KEY, newDoc.id);

    // Initialize empty content for the document
    localStorage.setItem(`${DOCUMENT_PREFIX}${newDoc.id}`, JSON.stringify([]));

    return newDoc;
  }, [documents, saveDocumentsList]);

  // Update document title
  const updateDocumentTitle = useCallback((id: string, newTitle: string) => {
    const updatedDocs = documents.map((doc) =>
      doc.id === id ? { ...doc, title: newTitle, updatedAt: new Date().toISOString() } : doc
    );
    saveDocumentsList(updatedDocs);
  }, [documents, saveDocumentsList]);

  // Delete a document
  const deleteDocument = useCallback((id: string) => {
    const updatedDocs = documents.filter((doc) => doc.id !== id);
    saveDocumentsList(updatedDocs);

    // Remove document content
    localStorage.removeItem(`${DOCUMENT_PREFIX}${id}`);

    // If deleting current document, switch to another one
    if (currentDocumentId === id) {
      if (updatedDocs.length > 0) {
        const newCurrentId = updatedDocs[0].id;
        setCurrentDocumentId(newCurrentId);
        localStorage.setItem(CURRENT_DOCUMENT_KEY, newCurrentId);
      } else {
        setCurrentDocumentId(null);
        localStorage.removeItem(CURRENT_DOCUMENT_KEY);
      }
    }
  }, [documents, currentDocumentId, saveDocumentsList]);

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
    };

    const updatedDocs = [...documents, newDoc];
    saveDocumentsList(updatedDocs);

    // Copy content
    localStorage.setItem(`${DOCUMENT_PREFIX}${newDoc.id}`, content);

    setCurrentDocumentId(newDoc.id);
    localStorage.setItem(CURRENT_DOCUMENT_KEY, newDoc.id);

    return newDoc;
  }, [documents, saveDocumentsList]);

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
  }, []);

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

