import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface SummaryThesisModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
}

export default function SummaryThesisModal({ isOpen, onClose, selectedText }: SummaryThesisModalProps) {
  const [summaryThesis, setSummaryThesis] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate summary+thesis when modal opens
  useEffect(() => {
    if (isOpen && selectedText && !summaryThesis && !isGenerating) {
      generateSummaryThesis();
    }
  }, [isOpen, selectedText]);

  const generateSummaryThesis = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/summary-thesis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText,
          provider: 'openai'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary and thesis');
      }

      const data = await response.json();
      setSummaryThesis(data.summaryThesis);
    } catch (error) {
      console.error('Error generating summary thesis:', error);
      setError('Failed to generate summary and thesis. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setSummaryThesis('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Summary + Thesis</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden">
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-lg font-semibold">Analyzing Text</p>
              <p className="text-sm text-gray-600 text-center">
                Generating main thesis and explanation...
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <p className="text-red-600 text-center">{error}</p>
              <Button onClick={generateSummaryThesis}>
                Try Again
              </Button>
            </div>
          )}

          {summaryThesis && !isGenerating && (
            <ScrollArea className="h-full">
              <div className="prose prose-gray max-w-none">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {summaryThesis}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t space-x-2">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}