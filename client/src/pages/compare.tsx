import { useState } from 'react';
import DualFileUpload from '@/components/DualFileUpload';
import DualDocumentViewer from '@/components/DualDocumentViewer';
import ChatInterface from '@/components/ChatInterface';

export default function ComparePage() {
  const [documents, setDocuments] = useState<any[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const handleFilesUploaded = (uploadedDocuments: any[]) => {
    setDocuments(uploadedDocuments);
    setShowChat(true);
  };

  const handleUploadClick = () => {
    setDocuments(null);
    setShowChat(false);
  };

  const handleStartChat = () => {
    setShowChat(true);
  };

  if (!documents) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
          <DualFileUpload
            onFilesUploaded={handleFilesUploaded}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
          />
        </div>
      </div>
    );
  }

  if (showChat) {
    return (
      <div className="h-screen flex bg-gray-50">
        {/* Left Panel - Documents */}
        <div className="w-1/2 bg-white border-r">
          <DualDocumentViewer
            documents={documents}
            isLoading={isUploading}
            onUploadClick={handleUploadClick}
            onStartChat={handleStartChat}
          />
        </div>

        {/* Right Panel - Chat */}
        <div className="w-1/2 flex flex-col">
          <ChatInterface
            document={null}
            documents={documents}
            showInputInline={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50">
      <DualDocumentViewer
        documents={documents}
        isLoading={isUploading}
        onUploadClick={handleUploadClick}
        onStartChat={handleStartChat}
      />
    </div>
  );
}