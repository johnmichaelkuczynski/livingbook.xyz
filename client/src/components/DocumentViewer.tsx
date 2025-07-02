import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MoreHorizontal, FileText, MessageCircle } from 'lucide-react';
import SimpleMathRenderer from './SimpleMathRenderer';

interface DocumentViewerProps {
  document: any | null;
  isLoading: boolean;
  onAskAboutSelection?: (selectedText: string) => void;
  onUploadClick?: () => void;
}

export default function DocumentViewer({ document, isLoading, onUploadClick }: DocumentViewerProps) {
  const formatContent = (content: string) => {
    if (!content) return '';
    
    return (
      <SimpleMathRenderer 
        content={content} 
        className="text-gray-700 leading-relaxed text-lg"
      />
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
              <div 
                className="flex flex-col items-center justify-center py-12 text-center cursor-pointer hover:bg-gray-50 rounded-lg transition-colors border-2 border-dashed border-gray-300 hover:border-primary"
                onClick={onUploadClick}
              >
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Click here to upload a document</h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Upload a PDF, Word document, or text file to view its content with properly rendered mathematical notation.
                </p>
                <Button className="mt-4 bg-primary hover:bg-primary/90">
                  Choose File
                </Button>
              </div>
            ) : (
              <div className="w-full">
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
