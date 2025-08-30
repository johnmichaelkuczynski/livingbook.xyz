import { useState, useEffect, useMemo, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import KaTeXRenderer from './KaTeXRenderer';

interface VirtualizedDocumentViewerProps {
  content: string;
  onTextSelection?: (selectedText: string) => void;
  className?: string;
}

interface DocumentChunk {
  id: string;
  content: string;
  index: number;
}

// Memoized chunk component to prevent unnecessary re-renders
const ChunkRenderer = memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: DocumentChunk[];
}) => {
  const chunk = data[index];
  
  return (
    <div style={style} className="px-6 py-2">
      <KaTeXRenderer 
        content={chunk.content}
        className="text-gray-700 leading-relaxed text-sm select-text max-w-full"
        isChunked={true}
      />
    </div>
  );
});

ChunkRenderer.displayName = 'ChunkRenderer';

function VirtualizedDocumentViewer({ 
  content, 
  onTextSelection,
  className = '' 
}: VirtualizedDocumentViewerProps) {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);

  // Split content into manageable chunks (approximately 500-1000 words per chunk)
  const chunkContent = useMemo(() => {
    if (!content) return [];

    // Split by paragraphs first, then combine into chunks
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;
    const maxWordsPerChunk = 800; // Optimal size for performance

    for (const paragraph of paragraphs) {
      const paragraphWords = paragraph.trim().split(/\s+/).length;
      const currentWords = currentChunk.split(/\s+/).length;

      // If adding this paragraph would exceed the limit, start a new chunk
      if (currentWords + paragraphWords > maxWordsPerChunk && currentChunk) {
        chunks.push({
          id: `chunk-${chunkIndex}`,
          content: currentChunk.trim(),
          index: chunkIndex
        });
        currentChunk = paragraph;
        chunkIndex++;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: `chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        index: chunkIndex
      });
    }

    return chunks;
  }, [content]);

  useEffect(() => {
    setChunks(chunkContent);
  }, [chunkContent]);

  useEffect(() => {
    // Helper function to check if target is a typing element
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toUpperCase();
      return target.isContentEditable || 
             ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) ||
             target.closest('input, textarea, [contenteditable="true"]') !== null;
    };

    const handleSelection = (e: Event) => {
      // Don't interfere with typing in input fields
      if (isTypingTarget(e.target)) return;
      
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim() || '';
      
      if (selectedText.length > 10 && onTextSelection) {
        // Check if the selection is within the virtualized document viewer
        const docViewer = document.querySelector('.virtualized-document-content');
        if (docViewer && selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (docViewer.contains(range.commonAncestorContainer)) {
            onTextSelection(selectedText);
          }
        }
      }
    };

    // Add selection listeners
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);
    
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, [onTextSelection]);

  if (!chunks.length) {
    return (
      <div className="p-6 text-center text-gray-500">
        No content to display
      </div>
    );
  }

  // For small documents (less than 5 chunks), render normally without virtualization
  if (chunks.length <= 5) {
    return (
      <div 
        className={`virtualized-document-content p-6 ${className}`}
        style={{ 
          height: '600px',
          maxHeight: '600px', 
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollBehavior: 'smooth',
          border: '1px solid #e5e7eb',
          position: 'relative'
        }}
      >
        {chunks.map((chunk) => (
          <div key={chunk.id} className="mb-4">
            <KaTeXRenderer 
              content={chunk.content}
              className="text-gray-700 leading-relaxed text-sm select-text max-w-full"
              isChunked={true}
            />
          </div>
        ))}
      </div>
    );
  }

  // For large documents, use virtualization
  return (
    <div 
      className={`virtualized-document-content ${className}`}
      style={{ 
        height: '600px',
        maxHeight: '600px', 
        border: '1px solid #e5e7eb',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <List
        height={600}
        width="100%"
        itemCount={chunks.length}
        itemSize={200} // Approximate height per chunk - will adjust dynamically
        itemData={chunks}
        overscanCount={2} // Pre-render 2 items above and below visible area
      >
        {ChunkRenderer}
      </List>
    </div>
  );
}

// Memoized version to prevent unnecessary re-renders
export default memo(VirtualizedDocumentViewer, (prevProps, nextProps) => {
  // Only re-render if content changes, ignore callback changes
  const contentEqual = prevProps.content === nextProps.content;
  const classNameEqual = prevProps.className === nextProps.className;
  
  return contentEqual && classNameEqual;
});