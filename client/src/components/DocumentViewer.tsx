import { useEffect, memo } from 'react';
import KaTeXRenderer from './KaTeXRenderer';

interface DocumentViewerProps {
  content: string;
  onTextSelection?: (selectedText: string) => void;
}

function DocumentViewer({ content, onTextSelection }: DocumentViewerProps) {
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
      
      // console.log('🔍 DOCUMENT VIEWER - Selection detected:', selectedText.length > 0 ? `"${selectedText.substring(0, 100)}..."` : 'empty'); // Reduced logging
      
      // Only pass selection if it's substantial text and came from the document viewer
      if (selectedText.length > 10 && onTextSelection) {
        // Check if the selection is within the document viewer
        const docViewer = document.querySelector('.document-viewer-content');
        if (docViewer && selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (docViewer.contains(range.commonAncestorContainer)) {
            // console.log('✅ DOCUMENT VIEWER - Calling onTextSelection with text'); // Reduced logging
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
        maxHeight: '600px', 
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollBehavior: 'smooth',
        border: '1px solid #e5e7eb',
        position: 'relative'
      }}
    >
      <KaTeXRenderer 
        content={content} 
        className="text-gray-700 leading-relaxed text-sm select-text max-w-full"
      />
    </div>
  );
}

// Memoized version to prevent unnecessary re-renders
export default memo(DocumentViewer, (prevProps, nextProps) => {
  // Only re-render if content changes, ignore callback changes
  return prevProps.content === nextProps.content;
});