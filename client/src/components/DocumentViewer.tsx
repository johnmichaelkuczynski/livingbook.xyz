import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MoreHorizontal, FileText, MessageCircle, Edit3, Upload, RotateCcw } from 'lucide-react';
import KaTeXRenderer from './KaTeXRenderer';

interface DocumentViewerProps {
  document: any | null;
  isLoading: boolean;
  onAskAboutSelection?: (selectedText: string) => void;
  onUploadClick?: () => void;
  onRewriteClick?: () => void;
  onFileDrop?: (file: File) => void;
  onTextSelection?: (selectedText: string) => void;
}

export default function DocumentViewer({ document, isLoading, onUploadClick, onRewriteClick, onFileDrop, onTextSelection }: DocumentViewerProps) {
  const [dragActive, setDragActive] = useState(false);

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
        <ScrollArea className="h-full" style={{ overflowY: 'auto' }}>
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
              <div 
                className="w-full"
                style={{ userSelect: 'text' }}
                onMouseUp={(e) => {
                  // Allow event to bubble for scrolling
                  setTimeout(() => {
                    const selection = window.getSelection();
                    const selectedText = selection?.toString().trim() || '';
                    console.log('🎙️ DOCUMENT VIEWER SELECTION:', selectedText, 'Length:', selectedText.length);
                    
                    if (selectedText.length > 10 && onTextSelection) {
                      console.log('🎙️ CALLING onTextSelection with:', selectedText);
                      onTextSelection(selectedText);
                    }
                  }, 100);
                }}
                onMouseDown={(e) => {
                  // Don't prevent default to allow text selection
                  e.stopPropagation();
                }}
              >
                <div className="space-y-4 text-lg leading-relaxed">
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
