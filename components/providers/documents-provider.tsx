"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Document, useDocuments } from "@/hooks/use-documents";

interface DocumentsContextType {
  documents: Document[];
  currentDocumentId: string | null;
  isLoaded: boolean;
  createDocument: (type?: 'document' | 'canvas' | 'database') => Document;
  updateDocumentTitle: (id: string, newTitle: string) => void;
  deleteDocument: (id: string) => void;
  duplicateDocument: (id: string) => void;
  getDocumentContent: (id: string) => string | null;
  saveDocumentContent: (id: string, content: string) => void;
  switchToDocument: (id: string) => void;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

export const DocumentsProvider = ({ children }: { children: ReactNode }) => {
  const documentsHook = useDocuments();

  return (
    <DocumentsContext.Provider value={documentsHook}>
      {children}
    </DocumentsContext.Provider>
  );
};

export const useDocumentsContext = () => {
  const context = useContext(DocumentsContext);
  if (context === undefined) {
    throw new Error("useDocumentsContext must be used within a DocumentsProvider");
  }
  return context;
};

