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
  
  // Persist selected text so it doesn't get cleared when browser collapses selection during button click
  const persistedTextRef = useRef<string>('');

  useEffect(() => {
    // Helper function to check if target is a typing element
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toUpperCase();
      return target.isContentEditable || 
             ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) ||
             target.closest('input, textarea, [contenteditable="true"]') !== null;
    };

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
      if (text.length > 5 && containerRef.current?.contains(range.commonAncestorContainer)) {
        const rect = range.getBoundingClientRect();
        setSelectedText(text);
        persistedTextRef.current = text; // Persist text in ref
        setSelectionRect(rect);
        setShowToolbar(true);
        
        // Add class to body to indicate active selection
        document.body.classList.add('text-selection-active');
      } else if (text.length <= 5) {
        // Remove class when selection is too short
        document.body.classList.remove('text-selection-active');
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Don't interfere with typing in input fields
      if (isTypingTarget(e.target)) return;
      
      // Small delay to allow selection to complete
      setTimeout(handleSelectionChange, 10);
    };

    const handleClickOutside = (event: MouseEvent) => {
      // Don't interfere with typing in input fields
      if (isTypingTarget(event.target)) return;
      
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

    // Add listeners ONLY to the container, not globally
    const container = containerRef.current;
    if (!container) return;

    document.addEventListener('selectionchange', handleSelectionChange);
    container.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      container.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [containerRef.current]);

  const handleClose = () => {
    setShowToolbar(false);
    setSelectedText('');
    persistedTextRef.current = ''; // Clear persisted text on explicit close
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
          onDiscuss={() => {
            const text = persistedTextRef.current;
            console.log('💬 DISCUSS CLICKED - Using persisted text length:', text.length);
            onDiscuss(text);
          }}
          onRewrite={() => {
            const text = persistedTextRef.current;
            console.log('✍️ REWRITE CLICKED - Using persisted text length:', text.length);
            onRewrite(text);
          }}
          onStudyGuide={() => {
            const text = persistedTextRef.current;
            console.log('🎯 STUDY GUIDE CLICKED - Using persisted text length:', text.length);
            onStudyGuide(text);
          }}
          onTestMe={() => {
            const text = persistedTextRef.current;
            console.log('📝 TEST ME CLICKED - Using persisted text length:', text.length);
            onTestMe(text);
          }}
          onPodcast={() => {
            const text = persistedTextRef.current;
            console.log('🎙️ PODCAST CLICKED - Using persisted text length:', text.length);
            onPodcast(text);
          }}
          onCognitiveMap={() => {
            const text = persistedTextRef.current;
            console.log('🧠 COGNITIVE MAP CLICKED - Using persisted text length:', text.length);
            onCognitiveMap(text);
          }}
          onSummaryThesis={() => {
            const text = persistedTextRef.current;
            console.log('📄 SUMMARY+THESIS CLICKED - Using persisted text length:', text.length);
            onSummaryThesis(text);
          }}
          onThesisDeepDive={() => {
            const text = persistedTextRef.current;
            console.log('🔬 THESIS DEEP-DIVE CLICKED - Using persisted text length:', text.length);
            onThesisDeepDive(text);
          }}
          onSuggestedReadings={() => {
            const text = persistedTextRef.current;
            console.log('📚 SUGGESTED READINGS CLICKED - Using persisted text length:', text.length);
            onSuggestedReadings(text);
          }}
          onClose={handleClose}
        />
      )}
    </div>
  );
}