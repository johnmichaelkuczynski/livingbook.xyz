import { useState } from 'react';
import { Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileUpload from '@/components/FileUpload';
import DocumentViewer from '@/components/DocumentViewer';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  const [currentDocument, setCurrentDocument] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUploaded = (document: any) => {
    setCurrentDocument(document);
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">DocMath AI</h1>
                <p className="text-xs text-gray-500">Document Processing & AI Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Info className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-64px)]">
        <div className={`grid grid-cols-1 gap-8 h-full ${currentDocument ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          
          {/* Left Column: File Upload & Document Viewer */}
          <div className={`flex flex-col space-y-6 h-full ${currentDocument ? 'lg:col-span-2' : ''}`}>
            <FileUpload 
              onFileUploaded={handleFileUploaded}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
            />
            <div className="flex-1 min-h-0">
              <DocumentViewer 
                document={currentDocument}
                isLoading={isUploading}
              />
            </div>
          </div>

          {/* Right Column: AI Chat Interface */}
          <div className="flex flex-col h-full">
            <ChatInterface document={currentDocument} />
          </div>
        </div>
      </div>


    </div>
  );
}
