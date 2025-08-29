import React, { useState } from 'react';
import { X, Download, Copy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface SynthesizeDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentA: any;
  documentB: any;
}

export default function SynthesizeDocumentsModal({ 
  isOpen, 
  onClose, 
  documentA, 
  documentB 
}: SynthesizeDocumentsModalProps) {
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState('');
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!documentA || !documentB) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/synthesize-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentA: documentA.content,
          documentB: documentB.content,
          titleA: documentA.title || 'Document A',
          titleB: documentB.title || 'Document B',
          customInstructions: customInstructions.trim() || undefined,
          provider: 'deepseek'
        }),
      });

      if (!response.ok) {
        throw new Error(`Synthesis failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data.synthesis || 'No synthesis generated');
      
      toast({
        title: "Documents synthesized",
        description: "Successfully combined insights from both documents.",
      });
      
    } catch (error) {
      console.error('Synthesis error:', error);
      toast({
        title: "Synthesis failed",
        description: "Failed to synthesize documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast({
      title: "Copied",
      description: "Synthesis copied to clipboard.",
    });
  };

  const handleDownload = () => {
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document-synthesis.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setResult('');
    setCustomInstructions('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Synthesize Documents
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Documents to Synthesize:
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <strong>Document A:</strong> {documentA?.title || 'Untitled'}
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <strong>Document B:</strong> {documentB?.title || 'Untitled'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Instructions (Optional)
            </label>
            <Textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Enter specific instructions for how you want the documents synthesized (e.g., 'Focus on comparing methodologies', 'Create a unified timeline', 'Identify contradictions')..."
              className="min-h-[100px]"
            />
          </div>

          {!result ? (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? 'Synthesizing Documents...' : 'Generate Synthesis'}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Document Synthesis
                </h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg max-h-[400px] overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                  {result}
                </pre>
              </div>
              
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                variant="outline"
                className="w-full"
              >
                {isGenerating ? 'Regenerating...' : 'Regenerate Synthesis'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}