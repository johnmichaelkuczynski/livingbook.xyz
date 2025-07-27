import React, { useEffect, useState, useRef } from 'react';
import TextSelectionToolbar from './TextSelectionToolbar';

interface TextSelectionHandlerProps {
  children: React.ReactNode;
  onDiscuss: (text: string) => void;
  onRewrite: (text: string) => void;
  onStudyGuide: (text: string) => void;
  onTestMe: (text: string) => void;
  onPodcast: (text: string) => void;
  onCognitiveMap: (text: string) => void;
  onSummaryThesis: (text: string) => void;
  onThesisDeepDive: (text: string) => void;
  onSuggestedReadings: (text: string) => void;
}

export default function TextSelectionHandler({
  children,
  onDiscuss,
  onRewrite,
  onStudyGuide,
  onTestMe,
  onPodcast,
  onCognitiveMap,
  onSummaryThesis,
  onThesisDeepDive,
  onSuggestedReadings
}: TextSelectionHandlerProps) {
  const [selectedText, setSelectedText] = useState('');
  const [selectionRect, setSelectionRect] = useState<DOMRect | undefined>();
  const [showToolbar, setShowToolbar] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setShowToolbar(false);
        setSelectedText('');
        return;
      }

      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();
      
      // Only show toolbar if text is selected and the selection is within our container
      if (text.length > 0 && containerRef.current?.contains(range.commonAncestorContainer)) {
        const rect = range.getBoundingClientRect();
        setSelectedText(text);
        setSelectionRect(rect);
        setShowToolbar(true);
      } else {
        setShowToolbar(false);
        setSelectedText('');
      }
    };

    const handleMouseUp = () => {
      // Small delay to allow selection to complete
      setTimeout(handleSelectionChange, 10);
    };

    const handleClickOutside = (event: MouseEvent) => {
      // Hide toolbar if clicking outside the container or toolbar
      const target = event.target as Element;
      const toolbar = document.getElementById('text-selection-toolbar');
      
      if (containerRef.current && 
          !containerRef.current.contains(target) && 
          (!toolbar || !toolbar.contains(target))) {
        setShowToolbar(false);
        setSelectedText('');
        // Clear selection
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleClose = () => {
    setShowToolbar(false);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div ref={containerRef} className="relative">
      {children}
      
      {showToolbar && (
        <TextSelectionToolbar
          selectedText={selectedText}
          selectionRect={selectionRect}
          onDiscuss={() => onDiscuss(selectedText)}
          onRewrite={() => onRewrite(selectedText)}
          onStudyGuide={() => onStudyGuide(selectedText)}
          onTestMe={() => onTestMe(selectedText)}
          onPodcast={() => onPodcast(selectedText)}
          onCognitiveMap={() => onCognitiveMap(selectedText)}
          onSummaryThesis={() => onSummaryThesis(selectedText)}
          onThesisDeepDive={() => onThesisDeepDive(selectedText)}
          onSuggestedReadings={() => onSuggestedReadings(selectedText)}
          onClose={handleClose}
        />
      )}
    </div>
  );
}