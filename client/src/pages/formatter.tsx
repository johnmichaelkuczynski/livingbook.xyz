import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Upload, 
  FileText, 
  Wand2, 
  Download,
  RotateCcw,
  AlignCenter,
  AlignLeft,
  Indent,
  Minus,
  RefreshCw,
  Save
} from 'lucide-react';

interface FormattingOperation {
  instruction: string;
  type: 'natural_language' | 'preset';
}

interface Document {
  id: number;
  filename: string;
  originalName: string;
  content: string;
  formattedContent?: string;
}

const PRESET_BUTTONS = [
  { key: 'fix_spacing', label: 'Fix Spacing', icon: RefreshCw },
  { key: 'indent_paragraphs', label: 'Indent Paragraphs', icon: Indent },
  { key: 'center_title', label: 'Center Title', icon: AlignCenter },
  { key: 'remove_double_breaks', label: 'Remove Double Breaks', icon: Minus },
  { key: 'normalize_headers', label: 'Normalize Headers', icon: AlignLeft },
];

export default function DocumentFormatter() {
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [formattedContent, setFormattedContent] = useState<string>('');
  const [naturalLanguageInstruction, setNaturalLanguageInstruction] = useState<string>('');
  const [appliedOperations, setAppliedOperations] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      const response = await apiRequest('POST', '/api/documents/upload', formData);
      return response.json();
    },
    onSuccess: (document: Document) => {
      setCurrentDocument(document);
      setFormattedContent(document.content);
      setAppliedOperations([]);
      toast({
        title: "Document uploaded successfully",
        description: `"${document.originalName}" is ready for formatting.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Formatting mutation
  const formatMutation = useMutation({
    mutationFn: async (operations: FormattingOperation[]) => {
      if (!currentDocument) throw new Error('No document selected');
      
      const response = await apiRequest('POST', '/api/documents/format', {
        documentId: currentDocument.id,
        operations,
        currentContent: formattedContent
      });
      return response.json();
    },
    onSuccess: (result: { formattedContent: string; appliedOperations: string[] }) => {
      setFormattedContent(result.formattedContent);
      setAppliedOperations(prev => [...prev, ...result.appliedOperations]);
      toast({
        title: "Formatting applied",
        description: `Applied ${result.appliedOperations.length} formatting operation(s).`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Formatting failed",
        description: error.message || "Failed to apply formatting. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Export mutations
  const exportMutation = useMutation({
    mutationFn: async (format: 'pdf' | 'docx' | 'txt') => {
      if (!currentDocument) throw new Error('No document selected');
      
      const response = await apiRequest('POST', '/api/documents/export', {
        documentId: currentDocument.id,
        content: formattedContent,
        format
      });
      return response.blob();
    },
    onSuccess: (blob: Blob, format: 'pdf' | 'docx' | 'txt') => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentDocument?.originalName || 'document'}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: `Document exported as ${format.toUpperCase()}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.md')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt, .docx, or .md file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePresetFormat = (operationKey: string) => {
    const operations: FormattingOperation[] = [
      { instruction: operationKey, type: 'preset' }
    ];
    formatMutation.mutate(operations);
  };

  const handleNaturalLanguageFormat = () => {
    if (!naturalLanguageInstruction.trim()) {
      toast({
        title: "No instruction provided",
        description: "Please enter a formatting instruction.",
        variant: "destructive",
      });
      return;
    }

    const operations: FormattingOperation[] = [
      { instruction: naturalLanguageInstruction.trim(), type: 'natural_language' }
    ];
    formatMutation.mutate(operations);
    setNaturalLanguageInstruction('');
  };

  const handleContentChange = (newContent: string) => {
    setFormattedContent(newContent);
  };

  const handleReset = () => {
    if (currentDocument) {
      setFormattedContent(currentDocument.content);
      setAppliedOperations([]);
      toast({
        title: "Content reset",
        description: "Document reverted to original content.",
      });
    }
  };

  const handleSave = async () => {
    if (!currentDocument) return;
    
    try {
      await apiRequest('PUT', `/api/documents/${currentDocument.id}`, {
        formattedContent: formattedContent
      });
      
      toast({
        title: "Document saved",
        description: "Formatted content has been saved.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save document. Please try again.",
        variant: "destructive",
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
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Document Formatter</h1>
                <p className="text-xs text-gray-500">Auto-format with AI-powered instructions</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Uploading...' : 'Upload Document'}</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.docx,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentDocument ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload a Document</h2>
            <p className="text-gray-600 mb-6">
              Upload a .txt, .docx, or .md file to start formatting
            </p>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Uploading...' : 'Choose File'}</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formatting Controls */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Wand2 className="w-5 h-5" />
                    <span>Quick Format</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {PRESET_BUTTONS.map(({ key, label, icon: Icon }) => (
                    <Button
                      key={key}
                      variant="outline"
                      onClick={() => handlePresetFormat(key)}
                      disabled={formatMutation.isPending}
                      className="w-full flex items-center space-x-2 justify-start"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Natural Language Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={naturalLanguageInstruction}
                    onChange={(e) => setNaturalLanguageInstruction(e.target.value)}
                    placeholder="e.g., 'remove all double spaces and center the title'"
                    className="min-h-20"
                    disabled={formatMutation.isPending}
                  />
                  <Button
                    onClick={handleNaturalLanguageFormat}
                    disabled={formatMutation.isPending || !naturalLanguageInstruction.trim()}
                    className="w-full"
                  >
                    {formatMutation.isPending ? 'Formatting...' : 'Format Now'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="flex-1"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                    <Button
                      onClick={handleSave}
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => exportMutation.mutate('txt')}
                      disabled={exportMutation.isPending}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      TXT
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => exportMutation.mutate('docx')}
                      disabled={exportMutation.isPending}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      DOCX
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => exportMutation.mutate('pdf')}
                      disabled={exportMutation.isPending}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {appliedOperations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Applied Formatting</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {appliedOperations.map((operation, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {operation}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Document Preview */}
            <div className="lg:col-span-2">
              <Card className="h-[calc(100vh-200px)]">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Document Preview</span>
                    <span className="text-sm font-normal text-gray-500">
                      {currentDocument.originalName}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <Textarea
                    value={formattedContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="w-full h-full resize-none border-0 focus:ring-0 font-mono text-sm"
                    placeholder="Your formatted document will appear here..."
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}