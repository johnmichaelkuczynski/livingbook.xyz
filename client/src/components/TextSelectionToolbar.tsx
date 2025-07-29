import React, { useEffect, useState, useRef } from 'react';
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
  X,
  ChevronDown
} from 'lucide-react';

interface TextSelectionToolbarProps {
  selectedText: string;
  selectionRect?: DOMRect;
  onDiscuss: () => void;
  onRewrite: () => void;
  onStudyGuide: () => void;
  onTestMe: () => void;
  onPodcast: (type: 'standard' | 'modern') => void;
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
  const [showPodcastDropdown, setShowPodcastDropdown] = useState(false);
  const podcastButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectionRect) {
      // Use a timeout to ensure the toolbar is rendered first
      setTimeout(() => {
        const toolbar = document.getElementById('text-selection-toolbar');
        if (toolbar) {
          const toolbarRect = toolbar.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Expanded toolbar is larger, so adjust positioning
          let top = selectionRect.top - 140; // More space for 2-row toolbar
          let left = selectionRect.left + (selectionRect.width / 2) - 300; // Center the wider toolbar
          
          // Keep within viewport bounds
          if (left < 10) left = 10;
          if (left + 600 > viewportWidth - 10) { // Account for expanded width
            left = viewportWidth - 610;
          }
          
          // If not enough space above, position below
          if (top < 10) {
            top = selectionRect.bottom + 10;
          }
          
          setPosition({ top, left });
        }
      }, 10);
    }
  }, [selectionRect]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          podcastButtonRef.current && !podcastButtonRef.current.contains(event.target as Node)) {
        setShowPodcastDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePodcastClick = (type: 'standard' | 'modern') => {
    setShowPodcastDropdown(false);
    onPodcast(type);
  };

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
      onClick: () => setShowPodcastDropdown(!showPodcastDropdown),
      color: 'bg-indigo-500 hover:bg-indigo-600',
      isDropdown: true
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
      className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 p-3"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: position.top === 0 ? 'translateY(-100%)' : 'none'
      }}
    >
      <div className="flex flex-col space-y-2">
        {/* Top row buttons */}
        <div className="flex items-center space-x-2">
          {toolbarButtons.slice(0, 5).map((button, index) => {
            const IconComponent = button.icon;
            
            if (button.label === 'Podcast') {
              return (
                <div key={index} style={{ position: 'relative' }}>
                  <Button
                    ref={podcastButtonRef}
                    onClick={button.onClick}
                    size="sm"
                    className={`${button.color} text-white px-3 py-2 h-9 rounded transition-all duration-200 hover:scale-105 shadow-sm flex items-center space-x-1`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-xs font-medium">{button.label}</span>
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                  
                  {showPodcastDropdown && (
                    <div
                      ref={dropdownRef}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                        zIndex: 99999,
                        minWidth: '220px',
                        overflow: 'hidden'
                      }}
                    >
                      <button
                        onClick={() => handlePodcastClick('standard')}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          textAlign: 'left',
                          fontSize: '14px',
                          color: '#374151',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          borderBottom: '1px solid #f3f4f6'
                        }}
                        onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                      >
                        <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                          Standard Summary Dialogue
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          Conversational summary with Q&A
                        </div>
                      </button>
                      
                      <button
                        onClick={() => handlePodcastClick('modern')}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          textAlign: 'left',
                          fontSize: '14px',
                          color: '#374151',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                      >
                        <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                          Modern Reconstruction (5 min)
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          Academic reconstruction with modern insights
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <Button
                key={index}
                onClick={button.onClick}
                size="sm"
                className={`${button.color} text-white px-3 py-2 h-9 rounded transition-all duration-200 hover:scale-105 shadow-sm flex items-center space-x-1`}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-xs font-medium">{button.label}</span>
              </Button>
            );
          })}
        </div>
        
        {/* Bottom row buttons */}
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2">
            {toolbarButtons.slice(5).map((button, index) => {
              const IconComponent = button.icon;
              return (
                <Button
                  key={index + 5}
                  onClick={button.onClick}
                  size="sm"
                  className={`${button.color} text-white px-3 py-2 h-9 rounded transition-all duration-200 hover:scale-105 shadow-sm flex items-center space-x-1`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="text-xs font-medium">{button.label}</span>
                </Button>
              );
            })}
          </div>
          
          <Button
            onClick={onClose}
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-2 py-2 h-9 rounded flex items-center"
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}