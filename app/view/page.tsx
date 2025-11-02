"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ViewPage() {
  const searchParams = useSearchParams();
  const [content, setContent] = useState<string>("");
  const [title, setTitle] = useState<string>("Note");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get content from URL hash (base64 encoded, possibly compressed)
    const hash = window.location.hash.substring(1);
    
    if (hash) {
      try {
        let decoded: string;
        
        // Check if content is compressed (starts with 'c:')
        if (hash.startsWith('c:')) {
          // Compressed content - decompress using Decompression Stream API
          const base64Data = hash.substring(2); // Remove 'c:' prefix
          
          if (typeof DecompressionStream !== 'undefined') {
            try {
              const binaryString = atob(base64Data);
              const compressedData = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                compressedData[i] = binaryString.charCodeAt(i);
              }
              
              const stream = new DecompressionStream('deflate');
              const writer = stream.writable.getWriter();
              const reader = stream.readable.getReader();
              
              writer.write(compressedData);
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
              
              const decompressedData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
              let offset = 0;
              for (const chunk of chunks) {
                decompressedData.set(chunk, offset);
                offset += chunk.length;
              }
              
              decoded = new TextDecoder().decode(decompressedData);
            } catch (decompressionError) {
              console.error('Decompression failed:', decompressionError);
              throw decompressionError;
            }
          } else {
            // Decompression API not available - show error
            setContent('Error: Your browser does not support decompression. Please use a modern browser.');
            setTitle('Error');
            setLoading(false);
            return;
          }
        } else {
          // Not compressed - simple base64 decode
          decoded = decodeURIComponent(escape(atob(hash)));
        }
        
        setContent(decoded);
        
        // Try to extract title from first line if it's markdown
        const firstLine = decoded.split('\n')[0];
        if (firstLine && firstLine.startsWith('# ')) {
          setTitle(firstLine.substring(2));
        } else {
          setTitle('Shared Document');
        }
        setLoading(false);
      } catch (error) {
        console.error('Error decoding content:', error);
        setContent('Error: Could not decode content. The QR code may be corrupted.');
        setTitle('Error');
        setLoading(false);
      }
    } else {
      // Fallback: try to get from query params (old method)
      const encoded = searchParams.get('t');
      if (encoded) {
        try {
          const decoded = decodeURIComponent(escape(atob(encoded)));
          setContent(decoded);
          setLoading(false);
        } catch (error) {
          setContent('Error: Could not decode content');
          setLoading(false);
        }
      } else {
        setContent('No content found in URL');
        setLoading(false);
      }
    }
  }, [searchParams]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      alert('Text copied to clipboard!');
    } catch (error) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('Text copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Copy Text
          </button>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-6">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {content}
          </pre>
        </div>
        
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Content shared via QR code
        </p>
      </div>
    </div>
  );
}

