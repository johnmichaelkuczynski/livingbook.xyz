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
      
      if (selectedText.length > 10 && onTextSelection) {
        onTextSelection(selectedText);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);
    
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, [onTextSelection]);

  return (
    <div className="h-full overflow-auto p-6">
      <KaTeXRenderer 
        content={content} 
        className="text-gray-700 leading-relaxed text-lg select-text"
      />
    </div>
  );
}