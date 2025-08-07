import { useMemo } from 'react';
import DocumentViewer from './DocumentViewer';
import VirtualizedDocumentViewer from './VirtualizedDocumentViewer';

interface SmartDocumentViewerProps {
  content: string;
  onTextSelection?: (selectedText: string) => void;
  className?: string;
}

export default function SmartDocumentViewer({ 
  content, 
  onTextSelection, 
  className = '' 
}: SmartDocumentViewerProps) {
  
  // Determine if we need virtualization based on content size
  const shouldVirtualize = useMemo(() => {
    if (!content) return false;
    
    // Count approximate words (split by whitespace)
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    // Use virtualization for documents over 2000 words or 50KB
    const isLargeByWords = wordCount > 2000;
    const isLargeBySize = content.length > 50000; // 50KB
    
    console.log(`📊 SMART DOCUMENT VIEWER - Word count: ${wordCount}, Size: ${content.length} chars, Virtualizing: ${isLargeByWords || isLargeBySize}`);
    
    return isLargeByWords || isLargeBySize;
  }, [content]);

  // Use virtualized viewer for large documents, regular viewer for small ones
  if (shouldVirtualize) {
    return (
      <VirtualizedDocumentViewer
        content={content}
        onTextSelection={onTextSelection}
        className={className}
      />
    );
  }

  return (
    <DocumentViewer
      content={content}
      onTextSelection={onTextSelection}
    />
  );
}