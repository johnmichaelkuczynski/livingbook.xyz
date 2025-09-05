import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit3, Copy, Download, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface DocumentRewriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}

export default function DocumentRewriteModal({ isOpen, onClose, document }: DocumentRewriteModalProps) {
  const [rewriteInstructions, setRewriteInstructions] = useState('');
  const [rewrittenContent, setRewrittenContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const { toast } = useToast();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setRewriteInstructions('');
      setRewrittenContent('');
      setOriginalContent('');
      setHasGenerated(false);
    }
  }, [isOpen]);

  const generateRewrite = async () => {
    if (!document || !rewriteInstructions.trim()) {
      toast({
        title: "Instructions Required",
        description: "Please provide rewrite instructions.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setRewrittenContent('');
    setOriginalContent('');

    try {
      const response = await apiRequest('POST', '/api/generate-document-rewrite', {
        documentId: document.id,
        rewriteInstructions: rewriteInstructions.trim(),
        provider: 'openai'
      });

      if (response.ok) {
        const data = await response.json();
        setRewrittenContent(data.rewrittenContent);
        setOriginalContent(data.originalContent);
        setHasGenerated(true);
        
        toast({
          title: "Rewrite Generated",
          description: "Content has been rewritten according to your instructions.",
        });
      } else {
        throw new Error('Failed to generate rewrite');
      }
    } catch (error) {
      console.error('Rewrite generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to rewrite content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rewrittenContent);
      toast({
        title: "Copied",
        description: "Rewritten content copied to clipboard.",
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
    const blob = new Blob([rewrittenContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document?.originalName || 'document'}_rewritten.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Rewritten content saved as TXT file.",
    });
  };

  const handleDownloadPDF = () => {
    const formattedContent = `REWRITTEN CONTENT
Original Document: ${document?.originalName || 'Unknown'}
Rewrite Instructions: ${rewriteInstructions}

${rewrittenContent}`;
    
    const blob = new Blob([formattedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document?.originalName || 'document'}_rewritten.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Rewritten content saved as PDF file.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <Edit3 className="w-6 h-6" />
                Rewrite Content
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {hasGenerated && rewrittenContent && (
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

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Content Source */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content Source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  Selected Text ({document?.content ? document.content.length : 0} characters)
                </div>
                <div className="bg-gray-50 p-4 rounded text-sm text-gray-700 max-h-32 overflow-y-auto">
                  {document?.originalName || 'Document Title'}
                  <br /><br />
                  {document?.content ? 
                    (document.content.length > 200 ? 
                      document.content.substring(0, 200) + '...' : 
                      document.content
                    ) : 
                    'Complete document selected for rewriting.'
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rewrite Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rewrite Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Describe how you want the selected text rewritten. Example: 'Make this more concise and academic', 'Rewrite in simple language for beginners', 'Convert to bullet points'..."
                value={rewriteInstructions}
                onChange={(e) => setRewriteInstructions(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <div className="mt-4 text-sm text-gray-600">
                Working with selected text
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button 
              onClick={generateRewrite}
              disabled={isGenerating || !rewriteInstructions.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Rewrite'
              )}
            </Button>
          </div>

          {/* Rewritten Content Display */}
          {hasGenerated && rewrittenContent && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Rewritten Content</CardTitle>
                  <Badge variant="outline" className="text-sm">
                    Generation Complete
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-white border rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {rewrittenContent}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bottom Actions */}
        {hasGenerated && rewrittenContent && (
          <div className="flex-shrink-0 flex justify-center pt-4 border-t">
            <Button 
              onClick={handleCopy}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              Copy Rewritten Content
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}