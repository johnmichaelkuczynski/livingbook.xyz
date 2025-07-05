import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, MessageSquare } from 'lucide-react';
import SimpleMathRenderer from './SimpleMathRenderer';

interface DualDocumentViewerProps {
  documents: any[] | null;
  isLoading: boolean;
  onUploadClick?: () => void;
  onStartChat?: () => void;
}

export default function DualDocumentViewer({ 
  documents, 
  isLoading, 
  onUploadClick, 
  onStartChat 
}: DualDocumentViewerProps) {
  const [selectedText, setSelectedText] = useState<string>('');

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Processing documents...</p>
        </div>
      </div>
    );
  }

  if (!documents || documents.length !== 2) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900">Compare Documents</h3>
            <p className="text-gray-600">Upload two documents to view them side by side and ask AI to compare them.</p>
          </div>
          <div className="space-y-3">
            <Button onClick={onUploadClick} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Upload Two Documents
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const [doc1, doc2] = documents;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900">Document Comparison</h2>
            <p className="text-sm text-gray-600">Comparing two documents side by side</p>
          </div>
          <Button onClick={onStartChat} variant="outline" size="sm">
            <MessageSquare className="w-4 h-4 mr-2" />
            Start Chat
          </Button>
        </div>
      </div>

      {/* Document Grid */}
      <div className="flex-1 p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Document 1 */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium text-gray-900 truncate">
                  {doc1.originalName}
                </CardTitle>
                <Badge variant="secondary">Document 1</Badge>
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>{doc1.fileType}</span>
                <span>{(doc1.fileSize / 1024).toFixed(1)} KB</span>
                <span>{new Date(doc1.uploadedAt).toLocaleDateString()}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full p-4">
                <div 
                  className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap cursor-text"
                  onMouseUp={handleTextSelection}
                >
                  <SimpleMathRenderer content={doc1.content} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Document 2 */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium text-gray-900 truncate">
                  {doc2.originalName}
                </CardTitle>
                <Badge variant="secondary">Document 2</Badge>
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>{doc2.fileType}</span>
                <span>{(doc2.fileSize / 1024).toFixed(1)} KB</span>
                <span>{new Date(doc2.uploadedAt).toLocaleDateString()}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full p-4">
                <div 
                  className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap cursor-text"
                  onMouseUp={handleTextSelection}
                >
                  <SimpleMathRenderer content={doc2.content} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center space-x-4 pt-2">
          <Button onClick={onUploadClick} variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Upload Different Documents
          </Button>
          {selectedText && (
            <Badge variant="outline" className="max-w-xs truncate">
              Selected: {selectedText.substring(0, 30)}...
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}