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
      // Multiple checks with different delays to catch selection
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        
        console.log('🎙️ TEXT SELECTION ATTEMPT 1:', text, 'Length:', text?.length);
        console.log('🎙️ SELECTION STATE:', selection?.rangeCount || 0, 'ranges');
        
        if (text && text.length > 10) {
          console.log('🎙️ VALID SELECTION FOUND - SETTING UP BUTTON');
          setSelectedText(text);
          
          // Get selection position for floating button
          const range = selection?.getRangeAt(0);
          if (range) {
            const rect = range.getBoundingClientRect();
            console.log('🎙️ BUTTON POSITION CALCULATED:', { x: rect.left + (rect.width / 2), y: rect.top - 50 });
            setSelectionPosition({
              x: rect.left + (rect.width / 2),
              y: rect.top - 60 // Move button higher to avoid text overlap
            });
          }
        }
      }, 100);
      
      // Second attempt with longer delay
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        
        console.log('🎙️ TEXT SELECTION ATTEMPT 2:', text, 'Length:', text?.length);
        
        if (text && text.length > 10 && !selectedText) {
          console.log('🎙️ SECOND ATTEMPT SUCCESS - SETTING UP BUTTON');
          setSelectedText(text);
          
          const range = selection?.getRangeAt(0);
          if (range) {
            const rect = range.getBoundingClientRect();
            setSelectionPosition({
              x: rect.left + (rect.width / 2),
              y: rect.top - 60
            });
          }
        }
      }, 500);
    };

    const handleClickOutside = (event: MouseEvent) => {
      // Only clear selection if clicking outside AND not on the podcast button
      const target = event.target as Element;
      if (containerRef.current && 
          !containerRef.current.contains(target) && 
          !target.closest('[data-podcast-button]')) {
        setTimeout(() => {
          setSelectedText('');
          setSelectionPosition(null);
        }, 1000); // Delay to allow button interaction
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
          className="fixed z-[9999] transform -translate-x-1/2 -translate-y-full pointer-events-auto"
          style={{
            left: `${selectionPosition.x}px`,
            top: `${selectionPosition.y}px`,
          }}
        >
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg border-2 border-blue-500 p-3 animate-pulse">
            <Button
              onClick={handlePodcastGeneration}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm px-4 py-2 flex items-center space-x-2 shadow-lg"
            >
              <Mic className="w-4 h-4" />
              <span>🎧 Generate Podcast</span>
            </Button>
            <div className="text-xs text-gray-600 dark:text-gray-300 mt-2 text-center font-medium">
              {selectedText.length} characters selected
            </div>
          </div>
          
          {/* Arrow pointing to selection */}
          <div className="absolute left-1/2 transform -translate-x-1/2 top-full">
            <div className="w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-blue-500"></div>
          </div>
        </div>
      )}
      
      {/* Debug indicator when text is selected */}
      {selectedText && (
        <div className="fixed top-4 right-4 z-[9999] bg-green-500 text-white p-2 rounded">
          🎧 Podcast Ready: {selectedText.length} chars
        </div>
      )}
      
      {/* Always show current selection state for debugging */}
      <div className="fixed top-4 left-4 z-[9999] bg-blue-500 text-white p-2 rounded text-xs">
        Live Selection: {(() => {
          try {
            return window.getSelection()?.toString().length || 0;
          } catch (e) {
            return 'Error';
          }
        })()} chars
      </div>
    </div>
  );
}