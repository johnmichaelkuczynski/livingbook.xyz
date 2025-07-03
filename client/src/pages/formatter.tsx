import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { FileText, Upload, Plus } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import DocumentFormatter from '@/components/DocumentFormatter';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function FormatterPage() {
  const [currentDocument, setCurrentDocument] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUploaded = (document: any) => {
    setCurrentDocument(document);
    queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
  };

  const handleFile = async (file: File) => {
    setIsUploading(true);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const document = await response.json();
      handleFileUploaded(document);

      toast({
        title: "Document uploaded successfully",
        description: `"${document.originalName}" is ready for formatting`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ documentId, content }: { documentId: number; content: string }) => {
      const response = await apiRequest('PUT', `/api/documents/${documentId}`, {
        content
      });
      return response.json();
    },
    onSuccess: (updatedDocument) => {
      setCurrentDocument(updatedDocument);
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document updated",
        description: "Your changes have been saved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      });
    }
  });

  const handleDocumentUpdate = (updatedContent: string) => {
    if (currentDocument) {
      updateDocumentMutation.mutate({
        documentId: currentDocument.id,
        content: updatedContent
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Document Formatter</h1>
                <p className="text-xs text-gray-500">Advanced Text Processing & Math Editing</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                AI Chat
              </Button>
              <Button 
                variant="default" 
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary hover:bg-primary/90"
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.docx,.doc,.pdf,.md"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFile(file);
          }
        }}
        className="hidden"
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentDocument ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Card className="p-12 text-center max-w-lg">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-6">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                Advanced Document Formatter
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Upload any text document (.txt, .docx, .md) to apply intelligent formatting, 
                natural language instructions, and advanced math editing capabilities.
              </p>
              
              <div className="space-y-4">
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  disabled={isUploading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload Document to Start'}
                </Button>
                
                <div className="text-sm text-gray-500">
                  <p className="font-medium mb-2">Features included:</p>
                  <ul className="text-left space-y-1">
                    <li>• Automatic spacing and indentation fixes</li>
                    <li>• Natural language formatting instructions</li>
                    <li>• Live editable preview with math rendering</li>
                    <li>• LaTeX math conversion and editing</li>
                    <li>• Export to Word and PDF formats</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Document Info */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{currentDocument.originalName}</h3>
                    <p className="text-sm text-gray-500">
                      {Math.round(currentDocument.fileSize / 1024)} KB • {currentDocument.fileType}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload New'}
                </Button>
              </div>
            </Card>

            {/* Document Formatter */}
            <DocumentFormatter 
              document={currentDocument}
              onDocumentUpdate={handleDocumentUpdate}
            />
          </div>
        )}
      </main>
    </div>
  );
}