import { useState, useEffect, useRef, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Edit3, BookOpen, Brain, Mic, Map, FileText, BookMarked, Lightbulb } from 'lucide-react';

interface SimpleTextSelectionProps {
  children: ReactNode;
  onDiscuss?: (text: string) => void;
  onRewrite?: (text: string) => void;
  onStudyGuide?: (text: string) => void;
  onTestMe?: (text: string) => void;
  onPodcast?: (text: string) => void;
  onCognitiveMap?: (text: string) => void;
  onSummaryThesis?: (text: string) => void;
  onThesisDeepDive?: (text: string) => void;
  onSuggestedReadings?: (text: string) => void;
}

export default function SimpleTextSelection({
  children,
  onDiscuss,
  onRewrite,
  onStudyGuide,
  onTestMe,
  onPodcast,
  onCognitiveMap,
  onSummaryThesis,
  onThesisDeepDive,
  onSuggestedReadings,
}: SimpleTextSelectionProps) {
  const [selectedText, setSelectedText] = useState('');
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Helper function to check if target is a typing element
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toUpperCase();
      return target.isContentEditable || 
             ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) ||
             target.closest('input, textarea, [contenteditable="true"]') !== null;
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Don't interfere with typing in input fields
      if (isTypingTarget(e.target)) return;
      
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        const text = selection.toString().trim();
        setSelectedText(text);
        
        // Get selection position for toolbar
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setToolbarPosition({
          x: rect.left + (rect.width / 2),
          y: rect.top - 60
        });
        
        setShowToolbar(true);
      } else {
        setShowToolbar(false);
        setSelectedText('');
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      // Don't interfere with typing in input fields
      if (isTypingTarget(event.target)) return;
      
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowToolbar(false);
        setSelectedText('');
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleAction = (action: string, callback?: (text: string) => void) => {
    if (callback && selectedText) {
      callback(selectedText);
    }
    setShowToolbar(false);
    setSelectedText('');
    
    // Clear selection
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {children}
      
      {/* Simple Floating Toolbar */}
      {showToolbar && selectedText && (
        <div 
          className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex gap-1"
          style={{
            left: `${toolbarPosition.x}px`,
            top: `${toolbarPosition.y}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAction('discuss', onDiscuss)}
            className="h-8 px-2 text-xs"
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            Discuss
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAction('rewrite', onRewrite)}
            className="h-8 px-2 text-xs"
          >
            <Edit3 className="w-3 h-3 mr-1" />
            Rewrite
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAction('study', onStudyGuide)}
            className="h-8 px-2 text-xs"
          >
            <BookOpen className="w-3 h-3 mr-1" />
            Study Guide
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAction('test', onTestMe)}
            className="h-8 px-2 text-xs"
          >
            <Brain className="w-3 h-3 mr-1" />
            Test Me
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAction('podcast', onPodcast)}
            className="h-8 px-2 text-xs"
          >
            <Mic className="w-3 h-3 mr-1" />
            Podcast
          </Button>
        </div>
      )}
    </div>
  );
}