import React, { useState } from 'react';
import { X, Copy, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface ThesisDeepDiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  content: string;
  isLoading: boolean;
  onRegenerate?: (comparisonTarget?: string) => void;
}

export default function ThesisDeepDiveModal({
  isOpen,
  onClose,
  selectedText,
  content,
  isLoading,
  onRegenerate
}: ThesisDeepDiveModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [comparisonTarget, setComparisonTarget] = useState('');

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
    const textContent = `THESIS DEEP-DIVE ANALYSIS\n\nSelected Text:\n${selectedText}\n\n${content}`;
    
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thesis-deep-dive-${Date.now()}.txt`;
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
            <title>Thesis Deep-Dive Analysis</title>
            <style>
              body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
              h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
              h2 { color: #34495e; margin-top: 30px; }
              .selected-text { background-color: #f8f9fa; padding: 20px; border-left: 4px solid #3498db; margin: 20px 0; }
              .content { white-space: pre-wrap; }
              .section { margin: 20px 0; }
            </style>
          </head>
          <body>
            <h1>Thesis Deep-Dive Analysis</h1>
            
            <h2>Selected Passage</h2>
            <div class="selected-text">${selectedText}</div>
            
            <h2>Deep-Dive Analysis</h2>
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
          title: 'Thesis Deep-Dive Analysis'
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thesis-deep-dive-${Date.now()}.pdf`;
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

  const handleComparisonRegenerate = () => {
    if (onRegenerate) {
      onRegenerate(comparisonTarget.trim() || undefined);
    }
  };

  const renderFormattedContent = (text: string) => {
    const sections = text.split('\n\n');
    
    return sections.map((section, index) => {
      const trimmedSection = section.trim();
      if (!trimmedSection) return null;

      if (trimmedSection.toLowerCase().startsWith('extracted thesis:')) {
        return (
          <div key={index} className="border-l-4 border-blue-500 pl-4 mb-6">
            <p className="font-semibold text-blue-700 text-sm uppercase tracking-wide mb-2">
              Extracted Thesis
            </p>
            <p className="text-gray-800 font-medium leading-relaxed">
              {trimmedSection.replace(/^extracted thesis:\s*/i, '')}
            </p>
          </div>
        );
      } else if (trimmedSection.toLowerCase().startsWith('original wording:')) {
        return (
          <div key={index} className="border-l-4 border-purple-500 pl-4 mb-6">
            <p className="font-semibold text-purple-700 text-sm uppercase tracking-wide mb-2">
              Original Wording
            </p>
            <p className="text-gray-800 italic leading-relaxed bg-gray-50 p-3 rounded">
              "{trimmedSection.replace(/^original wording:\s*/i, '')}"
            </p>
          </div>
        );
      } else if (trimmedSection.toLowerCase().startsWith('modern applications:')) {
        return (
          <div key={index} className="border-l-4 border-green-500 pl-4 mb-6">
            <p className="font-semibold text-green-700 text-sm uppercase tracking-wide mb-2">
              Modern Applications
            </p>
            <p className="text-gray-800 leading-relaxed">
              {trimmedSection.replace(/^modern applications:\s*/i, '')}
            </p>
          </div>
        );
      } else if (trimmedSection.toLowerCase().startsWith('cross-comparison:')) {
        return (
          <div key={index} className="border-l-4 border-orange-500 pl-4 mb-6">
            <p className="font-semibold text-orange-700 text-sm uppercase tracking-wide mb-2">
              Cross-Comparison
            </p>
            <p className="text-gray-800 leading-relaxed">
              {trimmedSection.replace(/^cross-comparison:\s*/i, '')}
            </p>
          </div>
        );
      } else {
        return (
          <p key={index} className="text-gray-800 leading-relaxed mb-4">
            {trimmedSection}
          </p>
        );
      }
    }).filter(Boolean);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Thesis Deep-Dive</h2>
            <p className="text-sm text-gray-600 mt-1">Comprehensive thesis analysis with modern context</p>
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

        {/* Comparison Target Input */}
        <div className="px-6 py-3 bg-gray-50 border-b">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <Input
                placeholder="Optional: Compare against specific author/field (e.g., 'Kant', 'modern neuroscience')"
                value={comparisonTarget}
                onChange={(e) => setComparisonTarget(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button
              onClick={handleComparisonRegenerate}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
              disabled={isLoading}
            >
              <Search className="w-4 h-4" />
              <span>Compare</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 p-6 flex gap-6 overflow-hidden">
          {/* Selected Text Panel */}
          <div className="w-1/3 flex flex-col">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Selected Passage</h3>
            <ScrollArea className="flex-1 bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {selectedText}
              </div>
            </ScrollArea>
          </div>

          {/* Analysis Panel */}
          <div className="w-2/3 flex flex-col">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Deep-Dive Analysis</h3>
            <ScrollArea className="flex-1 bg-white border border-gray-200 p-6 rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Generating comprehensive thesis analysis...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {renderFormattedContent(content)}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}