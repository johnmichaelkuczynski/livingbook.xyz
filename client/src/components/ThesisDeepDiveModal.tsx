import React, { useState, useRef, useEffect } from 'react';
import { X, Copy, Download, Search, Move, Maximize2 } from 'lucide-react';
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
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [size, setSize] = useState({ width: 80, height: 90 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const modalRef = useRef<HTMLDivElement>(null);

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

  // Mouse event handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - (position.x * window.innerWidth / 100),
        y: e.clientY - (position.y * window.innerHeight / 100)
      });
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = ((e.clientX - dragStart.x) / window.innerWidth) * 100;
        const newY = ((e.clientY - dragStart.y) / window.innerHeight) * 100;
        
        // Constrain to viewport
        setPosition({
          x: Math.max(0, Math.min(100 - size.width, newX)),
          y: Math.max(0, Math.min(100 - size.height, newY))
        });
      }
      
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        const newWidth = Math.max(40, Math.min(95, resizeStart.width + (deltaX / window.innerWidth) * 100));
        const newHeight = Math.max(40, Math.min(95, resizeStart.height + (deltaY / window.innerHeight) * 100));
        
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, size]);

  // Reset position and size when modal opens
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 10, y: 5 });
      setSize({ width: 80, height: 90 });
    }
  }, [isOpen]);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div 
        ref={modalRef}
        className="absolute bg-white rounded-lg shadow-xl flex flex-col cursor-move"
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          width: `${size.width}%`,
          height: `${size.height}%`,
          minWidth: '400px',
          minHeight: '300px',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg drag-handle">
          <div className="flex items-center space-x-3">
            <Move className="w-4 h-4 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Thesis Deep-Dive</h2>
              <p className="text-xs text-gray-600">Comprehensive thesis analysis with modern context</p>
            </div>
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
        <div className="px-4 py-2 bg-gray-50 border-b flex-shrink-0">
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

        <div className="flex-1 flex gap-4 overflow-hidden relative">
          {/* Selected Text Panel */}
          <div className="w-1/3 flex flex-col p-4 pr-2">
            <h3 className="text-sm font-medium text-gray-900 mb-2 flex-shrink-0">Selected Passage</h3>
            <div className="flex-1 bg-gray-50 rounded-lg overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-3 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedText}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Analysis Panel */}
          <div className="w-2/3 flex flex-col p-4 pl-2">
            <h3 className="text-sm font-medium text-gray-900 mb-2 flex-shrink-0">Deep-Dive Analysis</h3>
            <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-3"></div>
                        <p className="text-gray-600 text-sm">Generating comprehensive thesis analysis...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pb-8">
                      {renderFormattedContent(content)}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Resize Handle */}
          <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 hover:bg-gray-400 transition-colors"
            style={{
              clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)'
            }}
            onMouseDown={handleResizeMouseDown}
          >
            <Maximize2 className="w-3 h-3 text-gray-600 absolute bottom-0.5 right-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}