import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  GraduationCap, 
  Mic, 
  Network, 
  FileText, 
  Lightbulb, 
  Library,
  X
} from 'lucide-react';

interface BottomToolbarProps {
  selectedText: string;
  documentTitle?: string;
  onStudyGuide: () => void;
  onTestMe: () => void;
  onPodcast: () => void;
  onCognitiveMap: () => void;
  onSummaryThesis: () => void;
  onThesisDeepDive: () => void;
  onSuggestedReadings: () => void;
  onClose?: () => void;
}

export default function BottomToolbar({
  selectedText,
  documentTitle,
  onStudyGuide,
  onTestMe,
  onPodcast,
  onCognitiveMap,
  onSummaryThesis,
  onThesisDeepDive,
  onSuggestedReadings,
  onClose
}: BottomToolbarProps) {
  const hasSelection = selectedText && selectedText.trim().length > 0;

  // Don't show toolbar if no text is selected
  if (!hasSelection) return null;

  const toolbarButtons = [
    {
      label: 'Study Guide',
      icon: BookOpen,
      onClick: onStudyGuide,
      description: 'Generate a comprehensive study guide'
    },
    {
      label: 'Test Me',
      icon: GraduationCap,
      onClick: onTestMe,
      description: 'Create practice questions and quiz'
    },
    {
      label: 'Podcast',
      icon: Mic,
      onClick: onPodcast,
      description: 'Convert to audio podcast format'
    },
    {
      label: 'Cognitive Map',
      icon: Network,
      onClick: onCognitiveMap,
      description: 'Visualize concepts and connections'
    },
    {
      label: 'Summary+Thesis',
      icon: FileText,
      onClick: onSummaryThesis,
      description: 'Extract key summary and thesis'
    },
    {
      label: 'Thesis Deep-Dive',
      icon: Lightbulb,
      onClick: onThesisDeepDive,
      description: 'Detailed thesis analysis'
    },
    {
      label: 'Suggested Readings',
      icon: Library,
      onClick: onSuggestedReadings,
      description: 'Find related reading materials'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Selection indicator and close button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 text-center">
            <div className="inline-flex items-center px-3 py-1 bg-blue-50 rounded-full text-sm text-blue-700 font-medium">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
              {selectedText.length} characters selected
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full w-8 h-8 p-0 flex items-center justify-center"
              title="Close toolbar"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Toolbar buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {toolbarButtons.map((button, index) => {
            const IconComponent = button.icon;
            return (
              <Button
                key={index}
                onClick={button.onClick}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 bg-white hover:bg-blue-50 border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 transition-all duration-200 shadow-sm hover:shadow-md"
                title={button.description}
              >
                <IconComponent className="w-4 h-4" />
                <span className="font-medium">{button.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Close hint */}
        <div className="text-center mt-2">
          <span className="text-xs text-gray-500">
            Click outside selection to hide • Choose an action above to proceed
          </span>
        </div>
      </div>
    </div>
  );
}