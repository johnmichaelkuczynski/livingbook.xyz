import { useEffect } from 'react';
import KaTeXRenderer from './KaTeXRenderer';

interface DocumentViewerProps {
  content: string;
  onTextSelection?: (selectedText: string) => void;
}

export default function DocumentViewer({ content, onTextSelection }: DocumentViewerProps) {
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim() || '';
      
      console.log('🔍 DOCUMENT VIEWER - Selection detected:', selectedText.length > 0 ? `"${selectedText.substring(0, 100)}..."` : 'empty');
      
      // Only pass selection if it's substantial text and came from the document viewer
      if (selectedText.length > 10 && onTextSelection) {
        // Check if the selection is within the document viewer
        const docViewer = document.querySelector('.document-viewer-content');
        if (docViewer && selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (docViewer.contains(range.commonAncestorContainer)) {
            console.log('✅ DOCUMENT VIEWER - Calling onTextSelection with text');
            onTextSelection(selectedText);
          }
        }
      }
    };

    // Only listen for selections within the document viewer
    const docViewer = document.querySelector('.document-viewer-content');
    if (docViewer) {
      docViewer.addEventListener('mouseup', handleSelection);
      docViewer.addEventListener('keyup', handleSelection);
      
      return () => {
        docViewer.removeEventListener('mouseup', handleSelection);
        docViewer.removeEventListener('keyup', handleSelection);
      };
    }
  }, [onTextSelection]);

  return (
    <div 
      className="document-viewer-content p-6" 
      style={{ 
        height: '600px',
        maxHeight: '80vh', 
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollBehavior: 'smooth',
        border: '1px solid #e5e7eb'
      }}
    >
      <KaTeXRenderer 
        content={content} 
        className="text-gray-700 leading-relaxed text-sm select-text max-w-full"
      />
    </div>
  );
}