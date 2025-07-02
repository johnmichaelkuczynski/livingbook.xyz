import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MoreHorizontal, FileText, MessageCircle } from 'lucide-react';
import { processMathNotation, containsMath } from '@/lib/mathUtils';
import MathRenderer from './MathRenderer';

interface DocumentViewerProps {
  document: any | null;
  isLoading: boolean;
  onAskAboutSelection?: (selectedText: string) => void;
}

export default function DocumentViewer({ document, isLoading, onAskAboutSelection }: DocumentViewerProps) {
  const [selectedText, setSelectedText] = useState('');
  const [showAskButton, setShowAskButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectedText(text);
      setButtonPosition({
        x: rect.right + 10,
        y: rect.top + window.scrollY - 40
      });
      setShowAskButton(true);
    } else {
      setShowAskButton(false);
      setSelectedText('');
    }
  };

  const handleAskAboutSelection = () => {
    if (selectedText && onAskAboutSelection) {
      onAskAboutSelection(selectedText);
      setShowAskButton(false);
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
    }
  };

  // Hide button when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      setShowAskButton(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  const formatContent = (content: string) => {
    if (!content) return '';
    
    // Process math notation
    const processedContent = processMathNotation(content);
    
    // Split into paragraphs and format
    return processedContent.split('\n').map((paragraph, index) => {
      if (!paragraph.trim()) return null;
      
      // Check if this paragraph contains math
      const hasMath = containsMath(paragraph);
      
      return (
        <div key={index} className={`mb-4 ${hasMath ? 'math-content' : ''}`}>
          {hasMath ? (
            <MathAwareParagraph content={paragraph} />
          ) : (
            <p className="text-gray-700 leading-relaxed">
              {paragraph}
            </p>
          )}
        </div>
      );
    }).filter(Boolean);
  };

  const MathAwareParagraph = ({ content }: { content: string }) => {
    // Split content by math expressions and render each part appropriately
    const parts = [];
    let currentIndex = 0;
    
    // Find all math expressions (both inline and display)
    const mathRegex = /<(span|div) class="math-(inline|display)" data-latex="([^"]+)"[^>]*>([^<]+)<\/(span|div)>/g;
    let match;
    
    while ((match = mathRegex.exec(content)) !== null) {
      // Add text before math expression
      if (match.index > currentIndex) {
        const textBefore = content.slice(currentIndex, match.index);
        if (textBefore.trim()) {
          parts.push(
            <span key={`text-${parts.length}`} dangerouslySetInnerHTML={{ __html: textBefore }} />
          );
        }
      }
      
      // Add math expression
      const isDisplay = match[2] === 'display';
      const latex = match[3];
      parts.push(
        <MathRenderer
          key={`math-${parts.length}`}
          expression={latex}
          displayMode={isDisplay}
        />
      );
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < content.length) {
      const remainingText = content.slice(currentIndex);
      if (remainingText.trim()) {
        parts.push(
          <span key={`text-${parts.length}`} dangerouslySetInnerHTML={{ __html: remainingText }} />
        );
      }
    }
    
    return (
      <p className="text-gray-700 leading-relaxed">
        {parts.length > 0 ? parts : content}
      </p>
    );
  };

  return (
    <Card className="flex-1 flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Document Content</h2>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Search className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-sm text-gray-600">Processing document...</span>
              </div>
            ) : !document ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No document uploaded</h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Upload a document to view its content with properly rendered mathematical notation.
                </p>
              </div>
            ) : (
              <div className="prose prose-lg max-w-none">
                <div className="space-y-4">
                  {formatContent(document.content)}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}
