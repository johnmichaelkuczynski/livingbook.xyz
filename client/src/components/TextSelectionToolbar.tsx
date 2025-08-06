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

  Play,
  Pause,
  Volume2,
  Download
} from 'lucide-react';

interface TextSelectionToolbarProps {
  selectedText: string;
  selectionRect?: DOMRect;
  onDiscuss: () => void;
  onRewrite: () => void;
  onStudyGuide: () => void;

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

  onPodcast,
  onCognitiveMap,
  onSummaryThesis,
  onThesisDeepDive,
  onSuggestedReadings,
  onClose
}: TextSelectionToolbarProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const [podcastProgress, setPodcastProgress] = useState<{
    isVisible: boolean;
    message: string;
    type: 'loading' | 'success' | 'error';
  }>({ isVisible: false, message: '', type: 'loading' });
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPodcastType, setCurrentPodcastType] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement>(null);


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





  // Audio playback controls
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const downloadCurrentAudio = () => {
    if (!audioUrl) return;
    
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `podcast-${currentPodcastType}-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
      label: 'Podcast',
      icon: Volume2,
      onClick: onPodcast,
      color: 'bg-green-500 hover:bg-green-600'
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
      className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 p-3 select-none"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: position.top === 0 ? 'translateY(-100%)' : 'none',
        pointerEvents: 'auto'
      }}
      onMouseEnter={() => {
        // Prevent toolbar from disappearing when hovering
        document.body.classList.add('toolbar-hover-active');
      }}
      onMouseLeave={() => {
        // Allow toolbar to disappear when not hovering
        document.body.classList.remove('toolbar-hover-active');
      }}
    >
      <div className="flex flex-col space-y-2">
        {/* Top row buttons */}
        <div className="flex items-center space-x-2">
          {toolbarButtons.slice(0, 5).map((button, index) => {
            const IconComponent = button.icon;
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

      {/* Enhanced Progress Indicator */}
      {podcastProgress.isVisible && (
        <div className={`fixed top-4 right-4 max-w-sm ${
          podcastProgress.type === 'loading' ? 'bg-blue-500' :
          podcastProgress.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white px-4 py-3 rounded-lg shadow-lg z-50 transition-all duration-300`}>
          <div className="flex items-start space-x-3">
            {podcastProgress.type === 'loading' && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mt-1"></div>
            )}
            {podcastProgress.type === 'success' && <span className="text-lg">✅</span>}
            {podcastProgress.type === 'error' && <span className="text-lg">❌</span>}
            <div className="flex-1">
              <div className="whitespace-pre-line text-sm leading-relaxed">
                {podcastProgress.message}
              </div>
              {podcastProgress.type === 'loading' && (
                <div className="mt-2 bg-white bg-opacity-20 rounded-full h-1">
                  <div className="bg-white h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audio Player Controls */}
      {audioUrl && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl z-50 transition-all duration-300">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4" />
              <span className="text-sm font-medium">{currentPodcastType}</span>
            </div>
            <Button
              onClick={togglePlayback}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 h-8"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              onClick={downloadCurrentAudio}
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 px-3 py-1 h-8"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
          <audio
            ref={audioRef}
            src={audioUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}