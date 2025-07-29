import React, { useState } from 'react';
import { X, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SummaryThesisModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  content: string;
  isLoading: boolean;
}

export default function SummaryThesisModal({
  isOpen,
  onClose,
  selectedText,
  content,
  isLoading
}: SummaryThesisModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const copyToClipboard = async () => {
    try {
      const textToCopy = `SELECTED PASSAGE:\n${selectedText}\n\n${content}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const downloadAsText = () => {
    const textContent = `SUMMARY & THESIS ANALYSIS\n\nSelected Text:\n${selectedText}\n\n${content}`;
    
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary-thesis-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsPDF = async () => {
    try {
      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <title>Summary & Thesis Analysis</title>
            <style>
              body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
              h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
              h2 { color: #34495e; margin-top: 30px; }
              .selected-text { background-color: #f8f9fa; padding: 20px; border-left: 4px solid #3498db; margin: 20px 0; }
              .thesis { font-weight: bold; margin: 20px 0; }
              .summary { margin: 20px 0; }
              .content { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>Summary & Thesis Analysis</h1>
            
            <h2>Selected Passage</h2>
            <div class="selected-text">${selectedText}</div>
            
            <h2>Analysis</h2>
            <div class="content">${content}</div>
          </body>
        </html>
      `;

      const response = await fetch('/api/export-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: htmlContent,
          title: 'Summary & Thesis Analysis'
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `summary-thesis-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('PDF download error:', error);
      // Fallback to text download
      downloadAsText();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Summary & Thesis</h2>
            <p className="text-sm text-gray-600 mt-1">Concise thesis and structured summary</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={downloadAsPDF}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
              disabled={isLoading}
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </Button>
            <Button
              onClick={downloadAsText}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
              disabled={isLoading}
            >
              <Download className="w-4 h-4" />
              <span>TXT</span>
            </Button>
            <Button
              onClick={copyToClipboard}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
              disabled={isLoading}
            >
              <Copy className="w-4 h-4" />
              <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 p-6 flex gap-6 overflow-hidden">
          {/* Selected Text Panel */}
          <div className="w-1/2 flex flex-col">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Selected Passage</h3>
            <ScrollArea className="flex-1 bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {selectedText}
              </div>
            </ScrollArea>
          </div>

          {/* Summary & Thesis Panel */}
          <div className="w-1/2 flex flex-col">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Analysis</h3>
            <ScrollArea className="flex-1 bg-white border border-gray-200 p-4 rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Generating summary and thesis...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {content.split('\n\n').map((paragraph, index) => {
                    if (paragraph.toLowerCase().startsWith('thesis:')) {
                      return (
                        <div key={index} className="border-l-4 border-blue-500 pl-4">
                          <p className="font-semibold text-blue-700 text-sm uppercase tracking-wide mb-2">
                            Thesis
                          </p>
                          <p className="text-gray-800 font-medium leading-relaxed">
                            {paragraph.replace(/^thesis:\s*/i, '')}
                          </p>
                        </div>
                      );
                    } else if (paragraph.toLowerCase().startsWith('summary:')) {
                      return (
                        <div key={index} className="border-l-4 border-green-500 pl-4">
                          <p className="font-semibold text-green-700 text-sm uppercase tracking-wide mb-2">
                            Summary
                          </p>
                          <p className="text-gray-800 leading-relaxed">
                            {paragraph.replace(/^summary:\s*/i, '')}
                          </p>
                        </div>
                      );
                    } else {
                      return (
                        <p key={index} className="text-gray-800 leading-relaxed">
                          {paragraph}
                        </p>
                      );
                    }
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}