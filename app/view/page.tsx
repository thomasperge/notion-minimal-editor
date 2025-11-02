"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ViewPage() {
  const searchParams = useSearchParams();
  const [content, setContent] = useState<string>("");
  const [title, setTitle] = useState<string>("Note");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get content from URL hash (base64 encoded)
    // Hash is used because it doesn't get sent to server and can be very long
    const hash = window.location.hash.substring(1);
    
    if (hash) {
      try {
        // Decode base64
        const decoded = decodeURIComponent(atob(hash));
        setContent(decoded);
        
        // Try to extract title from first line if it's markdown
        const firstLine = decoded.split('\n')[0];
        if (firstLine && firstLine.startsWith('# ')) {
          setTitle(firstLine.substring(2));
        }
        setLoading(false);
      } catch (error) {
        console.error('Error decoding content:', error);
        setContent('Error: Could not decode content');
        setLoading(false);
      }
    } else {
      // Fallback: try to get from query params (for shorter content)
      const encoded = searchParams.get('t');
      if (encoded) {
        try {
          const decoded = decodeURIComponent(atob(encoded));
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

