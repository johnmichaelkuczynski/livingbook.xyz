import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DocumentUpload from "./components/DocumentUpload";
import DocumentViewer from "./components/DocumentViewer";

const queryClient = new QueryClient();

interface Document {
  id: number;
  originalName: string;
  content: string;
  fileType: string;
  fileSize: number;
  totalWords: number;
}

function App() {
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);

  const handleUploadSuccess = (document: Document) => {
    setCurrentDocument(document);
  };

  const resetDocument = () => {
    setCurrentDocument(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Viewer</h1>
            <p className="text-gray-600">Upload and view documents with perfect formatting preservation</p>
          </header>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div>
              <DocumentUpload onUploadSuccess={handleUploadSuccess} />
              {currentDocument && (
                <div className="mt-4">
                  <button
                    onClick={resetDocument}
                    className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Upload New Document
                  </button>
                </div>
              )}
            </div>
            
            {/* Document View Section */}
            <div>
              {currentDocument ? (
                <DocumentViewer 
                  content={currentDocument.content}
                  title={currentDocument.originalName}
                />
              ) : (
                <div className="w-full h-96 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Upload a document to view it here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;