import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MoreHorizontal, FileText, MessageCircle, Edit3, Upload, RotateCcw, Network } from 'lucide-react';
import KaTeXRenderer from './KaTeXRenderer';
import ConceptLattice from './ConceptLattice';

interface DocumentViewerProps {
  document: any | null;
  isLoading: boolean;
  onAskAboutSelection?: (selectedText: string) => void;
  onUploadClick?: () => void;
  onRewriteClick?: () => void;
  onFileDrop?: (file: File) => void;
}

export default function DocumentViewer({ document, isLoading, onUploadClick, onRewriteClick, onFileDrop }: DocumentViewerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showConceptLattice, setShowConceptLattice] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0] && onFileDrop) {
      onFileDrop(e.dataTransfer.files[0]);
    }
  };
  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  };

  // Handle visualize button click
  const handleVisualize = () => {
    if (selectedText) {
      setShowConceptLattice(true);
    }
  };

  const formatContent = (content: string) => {
    if (!content) return '';
    
    return (
      <KaTeXRenderer 
        content={content} 
        className="text-gray-700 leading-relaxed text-lg"
      />
    );
  };



  return (
    <Card className="flex-1 flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">Document Content</h2>
        <div className="flex items-center space-x-2">
          {document && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onUploadClick}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Upload className="w-4 h-4 mr-1" />
                Replace Document
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={onRewriteClick}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Edit3 className="w-4 h-4 mr-1" />
                Rewrite
              </Button>
              {selectedText && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={handleVisualize}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Network className="w-4 h-4 mr-1" />
                  Visualize
                </Button>
              )}
            </>
          )}
          <Button variant="ghost" size="sm">
            <Search className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-sm text-gray-600">Processing document...</span>
              </div>
            ) : !document ? (
              <div 
                className={`flex flex-col items-center justify-center py-12 text-center cursor-pointer rounded-lg transition-colors border-2 border-dashed min-h-[400px] ${
                  dragActive 
                    ? 'border-primary bg-primary/10' 
                    : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                }`}
                onClick={onUploadClick}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {dragActive ? 'Drop your document here' : 'Click or drag to upload a document'}
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Upload a PDF, Word document, or text file to view its content with properly rendered mathematical notation.
                </p>
                {!dragActive && (
                  <Button className="mt-4 bg-primary hover:bg-primary/90">
                    Choose File
                  </Button>
                )}
              </div>
            ) : (
              <div className="w-full">
                <div 
                  ref={contentRef}
                  className="space-y-4 text-lg leading-relaxed"
                  onMouseUp={handleTextSelection}
                  style={{ userSelect: 'text' }}
                >
                  {formatContent(document.content)}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      {showConceptLattice && selectedText && (
        <ConceptLattice
          selectedText={selectedText}
          documentTitle={document?.originalName || 'Document'}
          onClose={() => setShowConceptLattice(false)}
        />
      )}
    </Card>
  );
}
