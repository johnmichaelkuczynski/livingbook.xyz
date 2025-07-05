import { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface DualFileUploadProps {
  onFilesUploaded: (documents: any[]) => void;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
}

export default function DualFileUpload({ onFilesUploaded, isUploading, setIsUploading }: DualFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 2) {
      toast({
        title: "Too many files",
        description: "Please select exactly 2 files for comparison.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 2) {
      toast({
        title: "Too many files",
        description: "Please select exactly 2 files for comparison.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length !== 2) {
      toast({
        title: "Select 2 files",
        description: "Please select exactly 2 files for comparison.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => formData.append('documents', file));
      
      const response = await fetch('/api/documents/upload-dual', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onFilesUploaded(data.documents);
      setSelectedFiles([]);
      
      toast({
        title: "Upload successful",
        description: "Both documents have been processed and are ready for comparison.",
      });
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const acceptedTypes = '.pdf,.docx,.doc,.txt';
  const acceptedTypesList = ['PDF', 'Word', 'Text'];

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Compare Documents</h2>
        <p className="text-gray-600">Upload two documents to compare and analyze side by side</p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-orange-500 bg-orange-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mb-4">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
        </div>
        
        <div className="mb-4">
          <p className="text-lg font-medium text-gray-900 mb-2">
            Drop 2 files here or click to select
          </p>
          <p className="text-sm text-gray-600">
            Supported formats: {acceptedTypesList.join(', ')}
          </p>
        </div>

        <Button 
          variant="outline" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          Choose Files
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Selected Files Display */}
      {selectedFiles.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Selected Files ({selectedFiles.length}/2)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {selectedFiles.length < 2 && (
            <div className="flex items-center space-x-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Please select one more file to compare</span>
            </div>
          )}

          {selectedFiles.length === 2 && (
            <Button 
              onClick={handleUpload} 
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? 'Processing...' : 'Upload & Compare Documents'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}