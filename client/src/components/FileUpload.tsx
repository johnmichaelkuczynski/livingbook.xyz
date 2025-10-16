import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Upload, File, X, CheckCircle, Type, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFileUploaded: (document: any) => void;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
}

export default function FileUpload({ onFileUploaded, isUploading, setIsUploading }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [textInput, setTextInput] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      // Only set to false if we're leaving the drop zone itself, not a child element
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      
      if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
        setDragActive(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (isUploading) {
      return;
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    // Validate file type - check both MIME type and file extension for better compatibility
    const allowedTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword', // .doc files
      'text/plain'
    ];
    const fileName = file.name.toLowerCase();
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    
    // Accept if either MIME type matches OR extension is valid (for drag-drop compatibility)
    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      console.log('File rejected - Type:', file.type, 'Name:', file.name);
      toast({
        title: "Unsupported file type",
        description: "Please upload a PDF, DOCX, or TXT file.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('File accepted - Type:', file.type, 'Name:', file.name, 'Size:', file.size);

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 50MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const document = await response.json();
      setUploadedFile(document);
      onFileUploaded(document);
      
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been processed and is ready for viewing.`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      toast({
        title: "Empty text",
        description: "Please enter some text before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Create a document object from the text input
    const textDocument = {
      id: Date.now(), // Simple ID generation
      originalName: `Text Input (${new Date().toLocaleTimeString()})`,
      fileType: 'text/plain',
      fileSize: new Blob([textInput]).size,
      content: textInput.trim(),
      uploadedAt: new Date().toISOString()
    };

    setUploadedFile(textDocument);
    onFileUploaded(textDocument);
    
    toast({
      title: "Text processed successfully",
      description: "Your text is ready for analysis.",
    });
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setTextInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="mb-4">
      {!uploadedFile ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Enter Text
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="mt-4">
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                dragActive || isUploading
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-primary hover:bg-primary/5'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex items-center justify-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  ) : (
                    <Upload className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {isUploading ? 'Processing...' : 'Upload Document'}
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, DOCX, TXT (Max 50MB)
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt"
                onChange={handleFileInput}
                disabled={isUploading}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="text" className="mt-4">
            <div className="space-y-4">
              <Textarea
                placeholder="Type or paste your text here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="min-h-[200px] resize-vertical"
                disabled={isUploading}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {textInput.length} characters • {textInput.trim().split(/\s+/).filter(word => word.length > 0).length} words
                </p>
                <Button 
                  onClick={handleTextSubmit} 
                  disabled={!textInput.trim() || isUploading}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Process Text
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                <File className="w-3 h-3 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{uploadedFile.originalName}</p>
                <p className="text-xs text-gray-500">{formatFileSize(uploadedFile.fileSize)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Ready
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="text-gray-400 hover:text-gray-600 h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
