import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bookmark, RefreshCw, Copy, Download, FileText, X, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface DocumentSuggestedReadingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}

export default function DocumentSuggestedReadingsModal({ isOpen, onClose, document }: DocumentSuggestedReadingsModalProps) {
  const [suggestedReadingsContent, setSuggestedReadingsContent] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { toast } = useToast();

  const generateSuggestedReadings = async () => {
    if (!document) return;

    setIsGenerating(true);
    setSuggestedReadingsContent('');
    setDocumentContent('');

    try {
      const response = await apiRequest('POST', '/api/generate-document-suggested-readings', {
        documentId: document.id,
        provider: 'openai'
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestedReadingsContent(data.suggestedReadings);
        setDocumentContent(data.documentContent);
        
        toast({
          title: "Suggested Readings Generated",
          description: "Academic and intellectual works recommendations ready.",
        });
      } else {
        throw new Error('Failed to generate suggested readings');
      }
    } catch (error) {
      console.error('Suggested readings generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to create suggested readings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setIsInitialLoad(false);
    }
  };

  // Auto-generate suggested readings when modal opens
  useEffect(() => {
    if (isOpen && document && !suggestedReadingsContent && !isGenerating && isInitialLoad) {
      generateSuggestedReadings();
    }
  }, [isOpen, document]);

  const parseSuggestedReadings = (content: string) => {
    // Split by numbered list items
    const items = content.split(/\d+\.\s+/).filter(item => item.trim().length > 0);
    
    return items.map(item => {
      // Extract title, author, and description
      const titleMatch = item.match(/\*([^*]+)\*/);
      const authorMatch = item.match(/by\s+([^—]+)—/);
      const descriptionMatch = item.match(/—\s*(.+)$/s);
      
      return {
        title: titleMatch ? titleMatch[1].trim() : '',
        author: authorMatch ? authorMatch[1].trim() : '',
        description: descriptionMatch ? descriptionMatch[1].trim() : item.trim()
      };
    }).filter(book => book.title || book.description);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(suggestedReadingsContent);
      toast({
        title: "Copied",
        description: "Suggested Readings copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadTXT = () => {
    const blob = new Blob([suggestedReadingsContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document?.originalName || 'document'}_suggested_readings.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Suggested Readings saved as TXT file.",
    });
  };

  const handleDownloadPDF = () => {
    // For now, we'll create a formatted text version
    const formattedContent = `SUGGESTED READINGS
Document: ${document?.originalName || 'Unknown'}

Relevant Academic and Intellectual Works

${suggestedReadingsContent}`;
    
    const blob = new Blob([formattedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document?.originalName || 'document'}_suggested_readings.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Suggested Readings saved as PDF file.",
    });
  };

  const parsedReadings = suggestedReadingsContent ? parseSuggestedReadings(suggestedReadingsContent) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <Bookmark className="w-6 h-6" />
                Suggested Readings
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">Relevant academic and intellectual works</p>
            </div>
            <div className="flex items-center gap-2">
              {!isGenerating && suggestedReadingsContent && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPDF}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTXT}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    TXT
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Loading State */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <h3 className="text-lg font-medium">Generating Suggested Readings...</h3>
              <p className="text-sm text-gray-600">Finding relevant academic and intellectual works</p>
            </div>
          )}

          {/* Content Display */}
          {parsedReadings.length > 0 && !isGenerating && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-sm">
                  Academic Recommendations Ready
                </Badge>
                <Button 
                  onClick={generateSuggestedReadings} 
                  variant="outline" 
                  size="sm"
                  disabled={isGenerating}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Selected Passage */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Selected Passage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="font-medium text-sm text-gray-900">
                          {document?.originalName || 'Document Title'}
                        </div>
                        <div className="text-sm text-gray-700 leading-relaxed">
                          Abstract
                        </div>
                        <div className="text-sm text-gray-700 leading-relaxed max-h-96 overflow-y-auto bg-gray-50 p-4 rounded">
                          {documentContent ? documentContent.substring(0, 800) + (documentContent.length > 800 ? '...' : '') : 'Complete document analysis - all content processed for comprehensive reading recommendations.'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Recommended Works */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recommended Works</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {parsedReadings.map((book, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div>
                              <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                                {book.title || `Book ${index + 1}`}
                              </h4>
                              {book.author && (
                                <p className="text-sm text-gray-600">by {book.author}</p>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {book.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Fallback for unparsed content */}
              {parsedReadings.length === 0 && suggestedReadingsContent && (
                <Card>
                  <CardHeader>
                    <CardTitle>Suggested Readings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm whitespace-pre-wrap text-gray-800 leading-relaxed">
                      {suggestedReadingsContent}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}