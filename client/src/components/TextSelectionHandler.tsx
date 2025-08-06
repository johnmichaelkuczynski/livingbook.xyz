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
      
      // If no selection, only hide if toolbar is currently visible and we're sure selection was cleared intentionally
      if (!selection || selection.rangeCount === 0) {
        // Don't immediately hide - user might be interacting with toolbar
        setTimeout(() => {
          const currentSelection = window.getSelection();
          if (!currentSelection || currentSelection.rangeCount === 0) {
            // Only hide if selection is still empty after delay AND not hovering toolbar
            const toolbar = document.getElementById('text-selection-toolbar');
            const isHoveringToolbar = toolbar?.matches(':hover') || document.body.classList.contains('toolbar-hover-active');
            
            if (!isHoveringToolbar) {
              setShowToolbar(false);
              setSelectedText('');
              document.body.classList.remove('text-selection-active');
            }
          }
        }, 100);
        return;
      }

      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();
      
      // Show toolbar if text is selected and within our container
      if (text.length > 10 && containerRef.current?.contains(range.commonAncestorContainer)) {
        const rect = range.getBoundingClientRect();
        setSelectedText(text);
        setSelectionRect(rect);
        setShowToolbar(true);
        
        // Add class to body to indicate active selection
        document.body.classList.add('text-selection-active');
      } else if (text.length <= 10) {
        // Remove class when selection is too short
        document.body.classList.remove('text-selection-active');
      }
    };

    const handleMouseUp = () => {
      // Small delay to allow selection to complete
      setTimeout(handleSelectionChange, 10);
    };

    const handleClickOutside = (event: MouseEvent) => {
      // Hide toolbar ONLY if clicking outside both container AND toolbar
      const target = event.target as Element;
      const toolbar = document.getElementById('text-selection-toolbar');
      
      // Don't hide if clicking on the toolbar itself or its children
      if (toolbar && toolbar.contains(target)) {
        return;
      }
      
      // Don't hide if clicking within the container (document area)
      if (containerRef.current && containerRef.current.contains(target)) {
        return;
      }
      
      // Only hide if clicking completely outside both areas
      setShowToolbar(false);
      setSelectedText('');
      document.body.classList.remove('text-selection-active');
      document.body.classList.remove('toolbar-hover-active');
      window.getSelection()?.removeAllRanges();
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
    document.body.classList.remove('text-selection-active');
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
          onStudyGuide={() => {
            console.log('🎯 STUDY GUIDE CLICKED - Text length:', selectedText.length);
            onStudyGuide(selectedText);
          }}
          onTestMe={() => onTestMe(selectedText)}
          onPodcast={() => onPodcast(selectedText)}
          onCognitiveMap={() => {
            console.log('🧠 COGNITIVE MAP CLICKED - Text length:', selectedText.length);
            console.log('🧠 HANDLE COGNITIVE MAP - Called with text:', selectedText.slice(0, 100) + '...');
            onCognitiveMap(selectedText);
          }}
          onSummaryThesis={() => onSummaryThesis(selectedText)}
          onThesisDeepDive={() => onThesisDeepDive(selectedText)}
          onSuggestedReadings={() => onSuggestedReadings(selectedText)}
          onClose={handleClose}
        />
      )}
    </div>
  );
}