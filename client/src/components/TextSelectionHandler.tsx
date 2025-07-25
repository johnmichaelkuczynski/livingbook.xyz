import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';

interface TextSelectionHandlerProps {
  children: React.ReactNode;
  onTextSelect: (selectedText: string) => void;
  documentTitle?: string;
}

export default function TextSelectionHandler({ 
  children, 
  onTextSelect, 
  documentTitle 
}: TextSelectionHandlerProps) {
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      
      if (text && text.length > 10) { // Minimum 10 characters for podcast generation
        setSelectedText(text);
        
        // Get selection position for floating button
        const range = selection?.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          setSelectionPosition({
            x: rect.left + (rect.width / 2),
            y: rect.top - 10
          });
        }
      } else {
        setSelectedText('');
        setSelectionPosition(null);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      // Clear selection if clicking outside the container
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSelectedText('');
        setSelectionPosition(null);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handlePodcastGeneration = () => {
    if (selectedText) {
      onTextSelect(selectedText);
      setSelectedText('');
      setSelectionPosition(null);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {children}
      
      {/* Floating Podcast Button */}
      {selectedText && selectionPosition && (
        <div 
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full"
          style={{
            left: selectionPosition.x,
            top: selectionPosition.y,
          }}
        >
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-600 p-2">
            <Button
              onClick={handlePodcastGeneration}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 flex items-center space-x-1"
            >
              <Mic className="w-3 h-3" />
              <span>🎧 Generate Podcast</span>
            </Button>
            <div className="text-xs text-gray-500 mt-1 text-center">
              {selectedText.length} chars selected
            </div>
          </div>
          
          {/* Arrow pointing to selection */}
          <div className="absolute left-1/2 transform -translate-x-1/2 top-full">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200 dark:border-t-gray-600"></div>
          </div>
        </div>
      )}
    </div>
  );
}