import React, { useState } from 'react';
import { X, Copy, Download, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SuggestedReadingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  content: string;
  isLoading: boolean;
}

export default function SuggestedReadingsModal({
  isOpen,
  onClose,
  selectedText,
  content,
  isLoading
}: SuggestedReadingsModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const copyToClipboard = async () => {
    try {
      const textToCopy = `SELECTED PASSAGE:\n${selectedText}\n\nSUGGESTED READINGS:\n\n${content}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const downloadAsText = () => {
    const textContent = `SUGGESTED READINGS\n\nSelected Text:\n${selectedText}\n\nRecommended Academic Works:\n\n${content}`;
    
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suggested-readings-${Date.now()}.txt`;
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
            <title>Suggested Readings</title>
            <style>
              body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
              h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
              h2 { color: #34495e; margin-top: 30px; }
              .selected-text { background-color: #f8f9fa; padding: 20px; border-left: 4px solid #3498db; margin: 20px 0; }
              .reading-entry { margin: 15px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
              .content { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>Suggested Readings</h1>
            
            <h2>Selected Passage</h2>
            <div class="selected-text">${selectedText}</div>
            
            <h2>Recommended Academic Works</h2>
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
          title: 'Suggested Readings'
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `suggested-readings-${Date.now()}.pdf`;
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

  const parseReadings = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const readings: Array<{title: string, author: string, relevance: string}> = [];
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      // Match format: "Title by Author — [relevance]"
      const match = trimmedLine.match(/^(.+?)\s+by\s+(.+?)\s*—\s*(.+)$/);
      if (match) {
        const [, title, author, relevance] = match;
        readings.push({
          title: title.trim(),
          author: author.trim(),
          relevance: relevance.trim()
        });
      } else if (trimmedLine.includes(' by ') && trimmedLine.includes('—')) {
        // Fallback parsing for slight variations
        const parts = trimmedLine.split('—');
        if (parts.length >= 2) {
          const titleAuthor = parts[0].trim();
          const relevance = parts.slice(1).join('—').trim();
          const byIndex = titleAuthor.lastIndexOf(' by ');
          if (byIndex > 0) {
            const title = titleAuthor.substring(0, byIndex).trim();
            const author = titleAuthor.substring(byIndex + 4).trim();
            readings.push({ title, author, relevance });
          }
        }
      }
    });
    
    return readings;
  };

  const renderReadings = (text: string) => {
    const readings = parseReadings(text);
    
    if (readings.length === 0) {
      // Fallback: display as plain text if parsing fails
      return (
        <div className="space-y-4">
          {text.split('\n').filter(line => line.trim()).map((line, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="text-gray-800 leading-relaxed">{line.trim()}</p>
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {readings.map((reading, index) => (
          <div key={index} className="border-l-4 border-green-500 pl-4 py-3 bg-gray-50 rounded-r">
            <div className="flex items-start space-x-2">
              <BookOpen className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {reading.title}
                </h4>
                <p className="text-gray-700 text-sm mb-2">
                  by <span className="font-medium">{reading.author}</span>
                </p>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {reading.relevance}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Suggested Readings</h2>
            <p className="text-sm text-gray-600 mt-1">Relevant academic and intellectual works</p>
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
          <div className="w-1/3 flex flex-col">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Selected Passage</h3>
            <ScrollArea className="flex-1 bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {selectedText}
              </div>
            </ScrollArea>
          </div>

          {/* Readings Panel */}
          <div className="w-2/3 flex flex-col">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Recommended Works</h3>
            <ScrollArea className="flex-1 bg-white border border-gray-200 p-6 rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Generating reading recommendations...</p>
                  </div>
                </div>
              ) : (
                renderReadings(content)
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}