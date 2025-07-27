import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  GraduationCap, 
  Mic, 
  Network, 
  FileText, 
  Lightbulb, 
  Library,
  Bookmark,
  X
} from 'lucide-react';

interface TextSelectionToolbarProps {
  selectedText: string;
  selectionRect?: DOMRect;
  onDiscuss: () => void;
  onRewrite: () => void;
  onStudyGuide: () => void;
  onTestMe: () => void;
  onPodcast: () => void;
  onCognitiveMap: () => void;
  onSummaryThesis: () => void;
  onThesisDeepDive: () => void;
  onSuggestedReadings: () => void;
  onClose: () => void;
}

export default function TextSelectionToolbar({
  selectedText,
  selectionRect,
  onDiscuss,
  onRewrite,
  onStudyGuide,
  onTestMe,
  onPodcast,
  onCognitiveMap,
  onSummaryThesis,
  onThesisDeepDive,
  onSuggestedReadings,
  onClose
}: TextSelectionToolbarProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (selectionRect) {
      const toolbar = document.getElementById('text-selection-toolbar');
      if (toolbar) {
        const toolbarRect = toolbar.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Position above the selection
        let top = selectionRect.top - toolbarRect.height - 10;
        let left = selectionRect.left + (selectionRect.width / 2) - (toolbarRect.width / 2);
        
        // Keep within viewport bounds
        if (left < 10) left = 10;
        if (left + toolbarRect.width > viewportWidth - 10) {
          left = viewportWidth - toolbarRect.width - 10;
        }
        
        // If not enough space above, position below
        if (top < 10) {
          top = selectionRect.bottom + 10;
        }
        
        setPosition({ top, left });
      }
    }
  }, [selectionRect]);

  if (!selectedText || selectedText.trim().length === 0) return null;

  const toolbarButtons = [
    {
      label: 'Discuss',
      icon: BookOpen,
      onClick: onDiscuss,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      label: 'Rewrite',
      icon: FileText,
      onClick: onRewrite,
      color: 'bg-purple-500 hover:bg-purple-600'
    },  
    {
      label: 'Study Guide',
      icon: Bookmark,
      onClick: onStudyGuide,
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      label: 'Test Me',
      icon: GraduationCap,
      onClick: onTestMe,
      color: 'bg-red-500 hover:bg-red-600'
    },
    {
      label: 'Podcast',
      icon: Mic,
      onClick: onPodcast,
      color: 'bg-indigo-500 hover:bg-indigo-600'
    },
    {
      label: 'Cognitive Map',
      icon: Network,
      onClick: onCognitiveMap,
      color: 'bg-teal-500 hover:bg-teal-600'
    },
    {
      label: 'Summary+Thesis',
      icon: FileText,
      onClick: onSummaryThesis,
      color: 'bg-yellow-500 hover:bg-yellow-600'
    },
    {
      label: 'Thesis Deep-Dive',
      icon: Lightbulb,
      onClick: onThesisDeepDive,
      color: 'bg-pink-500 hover:bg-pink-600'
    },
    {
      label: 'Suggested Readings',
      icon: Library,
      onClick: onSuggestedReadings,
      color: 'bg-cyan-500 hover:bg-cyan-600'
    }
  ];

  return (
    <div
      id="text-selection-toolbar"
      className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 p-2"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: position.top === 0 ? 'translateY(-100%)' : 'none'
      }}
    >
      <div className="flex items-center space-x-1">
        {toolbarButtons.map((button, index) => {
          const IconComponent = button.icon;
          return (
            <Button
              key={index}
              onClick={button.onClick}
              size="sm"
              className={`${button.color} text-white p-2 h-8 w-8 rounded transition-all duration-200 hover:scale-105 shadow-sm`}
              title={button.label}
            >
              <IconComponent className="w-4 h-4" />
            </Button>
          );
        })}
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button
          onClick={onClose}
          size="sm"
          variant="ghost"
          className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 h-8 w-8 rounded"
          title="Close"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}