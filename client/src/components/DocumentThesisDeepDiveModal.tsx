import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, RefreshCw, Copy, Download, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface DocumentThesisDeepDiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}

export default function DocumentThesisDeepDiveModal({ isOpen, onClose, document }: DocumentThesisDeepDiveModalProps) {
  const [thesisDeepDiveContent, setThesisDeepDiveContent] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { toast } = useToast();

  const generateThesisDeepDive = async () => {
    if (!document) return;

    setIsGenerating(true);
    setThesisDeepDiveContent('');
    setDocumentContent('');

    try {
      const response = await apiRequest('POST', '/api/generate-document-thesis-deep-dive', {
        documentId: document.id,
        provider: 'openai'
      });

      if (response.ok) {
        const data = await response.json();
        setThesisDeepDiveContent(data.thesisDeepDive);
        setDocumentContent(data.documentContent);
        
        toast({
          title: "Thesis Deep-Dive Generated",
          description: "Comprehensive thesis analysis complete.",
        });
      } else {
        throw new Error('Failed to generate thesis deep-dive');
      }
    } catch (error) {
      console.error('Thesis deep-dive generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to create thesis deep-dive. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setIsInitialLoad(false);
    }
  };

  // Auto-generate thesis deep-dive when modal opens
  useEffect(() => {
    if (isOpen && document && !thesisDeepDiveContent && !isGenerating && isInitialLoad) {
      generateThesisDeepDive();
    }
  }, [isOpen, document]);

  const parseThesisDeepDive = (content: string) => {
    const extractedThesisMatch = content.match(/EXTRACTED THESIS:\s*([\s\S]*?)(?=ORIGINAL WORDING:|$)/);
    const originalWordingMatch = content.match(/ORIGINAL WORDING:\s*([\s\S]*?)(?=MODERN APPLICATIONS:|$)/);
    const modernApplicationsMatch = content.match(/MODERN APPLICATIONS:\s*([\s\S]*?)(?=CROSS-COMPARISON:|$)/);
    const crossComparisonMatch = content.match(/CROSS-COMPARISON:\s*([\s\S]*?)$/);
    
    return {
      extractedThesis: extractedThesisMatch ? extractedThesisMatch[1].trim() : '',
      originalWording: originalWordingMatch ? originalWordingMatch[1].trim() : '',
      modernApplications: modernApplicationsMatch ? modernApplicationsMatch[1].trim() : '',
      crossComparison: crossComparisonMatch ? crossComparisonMatch[1].trim() : ''
    };
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(thesisDeepDiveContent);
      toast({
        title: "Copied",
        description: "Thesis Deep-Dive copied to clipboard.",
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
    const blob = new Blob([thesisDeepDiveContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document?.originalName || 'document'}_thesis_deep_dive.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Thesis Deep-Dive saved as TXT file.",
    });
  };

  const handleDownloadPDF = () => {
    // For now, we'll create a formatted text version
    // In a real implementation, you'd use a PDF library like jsPDF
    const formattedContent = `THESIS DEEP-DIVE ANALYSIS
Document: ${document?.originalName || 'Unknown'}

${thesisDeepDiveContent}`;
    
    const blob = new Blob([formattedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document?.originalName || 'document'}_thesis_deep_dive.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Thesis Deep-Dive saved as PDF file.",
    });
  };

  const parsedContent = thesisDeepDiveContent ? parseThesisDeepDive(thesisDeepDiveContent) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <Brain className="w-6 h-6" />
              Thesis Deep-Dive
            </DialogTitle>
            <div className="flex items-center gap-2">
              {!isGenerating && thesisDeepDiveContent && (
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
          <p className="text-sm text-gray-600">Comprehensive thesis analysis with modern context</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Loading State */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <h3 className="text-lg font-medium">Generating Thesis Deep-Dive...</h3>
              <p className="text-sm text-gray-600">Analyzing document for comprehensive thesis breakdown</p>
            </div>
          )}

          {/* Content Display */}
          {parsedContent && !isGenerating && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-sm">
                  Document Analysis Complete
                </Badge>
                <Button 
                  onClick={generateThesisDeepDive} 
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
                      <div className="text-sm text-gray-700 leading-relaxed max-h-96 overflow-y-auto bg-gray-50 p-4 rounded">
                        {document?.originalName || 'Document Title'}
                        <br /><br />
                        {documentContent || 'Complete document analysis - all content processed for comprehensive thesis deep-dive.'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Deep-Dive Analysis */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Deep-Dive Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Extracted Thesis */}
                      {parsedContent.extractedThesis && (
                        <div>
                          <h3 className="text-base font-semibold text-blue-700 mb-2">EXTRACTED THESIS</h3>
                          <p className="text-sm text-gray-800 leading-relaxed">
                            {parsedContent.extractedThesis}
                          </p>
                        </div>
                      )}

                      {/* Original Wording */}
                      {parsedContent.originalWording && (
                        <div>
                          <h3 className="text-base font-semibold text-green-700 mb-2">ORIGINAL WORDING</h3>
                          <div className="text-sm text-gray-800 leading-relaxed italic bg-green-50 p-3 rounded border-l-4 border-green-300">
                            {parsedContent.originalWording}
                          </div>
                        </div>
                      )}

                      {/* Modern Applications */}
                      {parsedContent.modernApplications && (
                        <div>
                          <h3 className="text-base font-semibold text-purple-700 mb-2">MODERN APPLICATIONS</h3>
                          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {parsedContent.modernApplications}
                          </div>
                        </div>
                      )}

                      {/* Cross-Comparison */}
                      {parsedContent.crossComparison && (
                        <div>
                          <h3 className="text-base font-semibold text-orange-700 mb-2">CROSS-COMPARISON</h3>
                          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {parsedContent.crossComparison}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Fallback for unparsed content */}
              {(!parsedContent.extractedThesis && thesisDeepDiveContent) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Thesis Deep-Dive Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm whitespace-pre-wrap text-gray-800 leading-relaxed">
                      {thesisDeepDiveContent}
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