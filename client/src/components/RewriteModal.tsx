import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, X, FileEdit, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import LoadingIndicator from './LoadingIndicator';

interface RewriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
  selectedText: string;
}

export default function RewriteModal({ isOpen, onClose, document, selectedText }: RewriteModalProps) {
  const [instructions, setInstructions] = useState('');
  const [rewrittenContent, setRewrittenContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateRewrite = async () => {
    if (!instructions.trim()) {
      toast({
        title: "Instructions Required",
        description: "Please provide instructions for how you want the content rewritten.",
        variant: "destructive",
      });
      return;
    }

    if (!document) {
      toast({
        title: "No Document",
        description: "Please upload a document first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setRewrittenContent('');

    try {
      const response = await fetch('/api/rewrite-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: document.id,
          selectedText: selectedText || '',
          instructions: instructions.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rewrite content');
      }

      const data = await response.json();
      setRewrittenContent(data.rewrittenContent);

      toast({
        title: "Content Rewritten",
        description: "Your content has been successfully rewritten according to your instructions.",
      });
    } catch (error) {
      console.error('Rewrite error:', error);
      toast({
        title: "Rewrite Failed",
        description: error instanceof Error ? error.message : "Failed to rewrite content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(rewrittenContent);
    toast({
      title: "Copied",
      description: "Rewritten content copied to clipboard.",
    });
  };

  const handleDownloadContent = () => {
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
      description: "Rewritten content saved to your device.",
    });
  };

  const handleClose = () => {
    setInstructions('');
    setRewrittenContent('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="w-5 h-5" />
            Rewrite Content
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-4">
          {/* Content Source Indicator */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                Content Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedText ? (
                <div>
                  <Badge variant="secondary" className="mb-2">Selected Text ({selectedText.length} characters)</Badge>
                  <div className="p-3 bg-gray-50 rounded border text-sm max-h-32 overflow-auto">
                    {selectedText.substring(0, 200)}
                    {selectedText.length > 200 && '...'}
                  </div>
                </div>
              ) : (
                <div>
                  <Badge variant="outline" className="mb-2">Full Document</Badge>
                  <p className="text-sm text-gray-600">
                    No text selected. You can specify document sections (e.g., "Chapter 2", "Introduction") in your instructions below.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions Input */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Rewrite Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={selectedText 
                  ? "Describe how you want the selected text rewritten. Example: 'Make this more concise and academic', 'Rewrite in simple language for beginners', 'Convert to bullet points'..."
                  : "Specify which part of the document to rewrite and how. Example: 'Rewrite Chapter 2 to be more concise', 'Simplify the Introduction section', 'Convert the conclusion to bullet points'..."
                }
                className="min-h-[100px] resize-none"
                disabled={isGenerating}
              />
              <div className="flex justify-between items-center mt-3">
                <p className="text-xs text-gray-500">
                  {selectedText ? 'Working with selected text' : 'Specify document sections in your instructions'}
                </p>
                <Button
                  onClick={handleGenerateRewrite}
                  disabled={!instructions.trim() || isGenerating}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                      Rewriting...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Generate Rewrite
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rewritten Content Display */}
          {(rewrittenContent || isGenerating) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Rewritten Content</span>
                  {rewrittenContent && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyContent}
                        className="flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadContent}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                      <p className="mt-3 text-sm text-gray-600">
                        Analyzing content and applying your instructions...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <div className="p-4 bg-gray-50 rounded border max-h-96 overflow-auto whitespace-pre-wrap text-gray-900 font-medium leading-relaxed">
                      {rewrittenContent}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex-shrink-0 flex justify-between gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
          <Button 
            onClick={handleGenerateRewrite}
            disabled={!instructions.trim() || isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                Rewriting...
              </>
            ) : (
              <>
                <FileEdit className="w-4 h-4" />
                {rewrittenContent ? 'Rewrite Again' : 'Rewrite Content'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}