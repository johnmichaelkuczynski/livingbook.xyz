import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lightbulb, RefreshCw, Copy, Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface DocumentSummaryThesisModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}

export default function DocumentSummaryThesisModal({ isOpen, onClose, document }: DocumentSummaryThesisModalProps) {
  const [summaryThesisContent, setSummaryThesisContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { toast } = useToast();

  const generateSummaryThesis = async () => {
    if (!document) return;

    setIsGenerating(true);
    setSummaryThesisContent('');

    try {
      const response = await apiRequest('POST', '/api/generate-document-summary-thesis', {
        documentId: document.id,
        provider: 'openai'
      });

      if (response.ok) {
        const data = await response.json();
        setSummaryThesisContent(data.summaryThesis);
        
        toast({
          title: "Summary + Thesis Generated",
          description: "Document analysis complete with thesis and explanation.",
        });
      } else {
        throw new Error('Failed to generate summary+thesis');
      }
    } catch (error) {
      console.error('Summary+thesis generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to create summary+thesis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setIsInitialLoad(false);
    }
  };

  // Auto-generate summary+thesis when modal opens
  useEffect(() => {
    if (isOpen && document && !summaryThesisContent && !isGenerating && isInitialLoad) {
      generateSummaryThesis();
    }
  }, [isOpen, document]);

  const parseSummaryThesis = (content: string) => {
    const thesisMatch = content.match(/THESIS:\s*([\s\S]*?)(?=EXPLANATION:|$)/);
    const explanationMatch = content.match(/EXPLANATION:\s*([\s\S]*?)$/);
    
    return {
      thesis: thesisMatch ? thesisMatch[1].trim() : '',
      explanation: explanationMatch ? explanationMatch[1].trim() : content
    };
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryThesisContent);
      toast({
        title: "Copied",
        description: "Summary + Thesis copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([summaryThesisContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document?.originalName || 'document'}_summary_thesis.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Summary + Thesis saved to your device.",
    });
  };

  const parsedContent = summaryThesisContent ? parseSummaryThesis(summaryThesisContent) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <Lightbulb className="w-6 h-6" />
              Summary + Thesis
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Loading State */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <h3 className="text-lg font-medium">Generating Summary + Thesis...</h3>
              <p className="text-sm text-gray-600">Analyzing document for key arguments and thesis</p>
            </div>
          )}

          {/* Content Display */}
          {parsedContent && !isGenerating && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-sm">
                  Document Analysis
                </Badge>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCopy} 
                    variant="outline" 
                    size="sm"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button 
                    onClick={handleDownload} 
                    variant="outline" 
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button 
                    onClick={generateSummaryThesis} 
                    variant="outline" 
                    size="sm"
                    disabled={isGenerating}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              </div>

              <Card className="overflow-hidden">
                <CardContent className="p-6 space-y-6">
                  {/* Thesis Section */}
                  {parsedContent.thesis && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">THESIS:</h3>
                      <p className="text-gray-800 leading-relaxed">
                        {parsedContent.thesis}
                      </p>
                    </div>
                  )}

                  {/* Explanation Section */}
                  {parsedContent.explanation && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">EXPLANATION:</h3>
                      <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {parsedContent.explanation}
                      </div>
                    </div>
                  )}

                  {/* Fallback for unparsed content */}
                  {!parsedContent.thesis && !parsedContent.explanation && summaryThesisContent && (
                    <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {summaryThesisContent}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}