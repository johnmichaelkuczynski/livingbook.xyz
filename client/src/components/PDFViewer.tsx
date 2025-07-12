import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, FileText, Download } from 'lucide-react';

interface PDFViewerProps {
  document: any;
  onTextSelection?: (selectedText: string, pageNumber: number) => void;
}

export default function PDFViewer({ document: pdfDocument, onTextSelection }: PDFViewerProps) {
  const [selectedText, setSelectedText] = useState<string>('');
  const [scale, setScale] = useState<number>(100);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handle text selection from iframe
  useEffect(() => {
    const handleSelection = () => {
      try {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
          const selection = iframe.contentWindow.getSelection();
          if (selection && selection.toString().trim()) {
            const text = selection.toString().trim();
            setSelectedText(text);
            if (onTextSelection) {
              onTextSelection(text, 1); // PDF page number not easily available in iframe
            }
          }
        }
      } catch (error) {
        // Cross-origin restrictions may prevent access
        console.log('Text selection from PDF iframe not available due to security restrictions');
      }
    };

    // Add event listener for text selection
    window.addEventListener('mouseup', handleSelection);
    
    return () => {
      window.removeEventListener('mouseup', handleSelection);
    };
  }, [onTextSelection]);

  // Zoom functions
  const zoomIn = () => setScale(prev => Math.min(prev + 25, 200));
  const zoomOut = () => setScale(prev => Math.max(prev - 25, 50));
  const resetZoom = () => setScale(100);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/api/documents/${pdfDocument.id}/pdf`;
    link.download = pdfDocument.originalName;
    link.click();
  };

  if (!pdfDocument) {
    return <div className="flex items-center justify-center h-full text-gray-500">No document loaded</div>;
  }

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-800 truncate max-w-xs">
            {pdfDocument.originalName}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button onClick={zoomOut} variant="outline" size="sm">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button onClick={resetZoom} variant="outline" size="sm">
            {scale}%
          </Button>
          <Button onClick={zoomIn} variant="outline" size="sm">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Document via iframe */}
      <div className="flex-1 overflow-hidden bg-gray-200">
        <iframe
          ref={iframeRef}
          src={`/api/documents/${pdfDocument.id}/pdf#zoom=${scale}`}
          className="w-full h-full border-none"
          title={`PDF Viewer - ${pdfDocument.originalName}`}
          onLoad={() => {
            console.log('PDF loaded successfully');
          }}
          onError={() => {
            console.error('Failed to load PDF');
          }}
        />
      </div>

      {/* Manual Text Selection Input */}
      <div className="p-3 bg-white border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Copy and paste text from PDF to analyze with AI..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedText}
            onChange={(e) => setSelectedText(e.target.value)}
          />
          <Button
            onClick={() => {
              if (selectedText.trim() && onTextSelection) {
                onTextSelection(selectedText.trim(), 1);
              }
            }}
            disabled={!selectedText.trim()}
            size="sm"
          >
            Analyze
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Select text in the PDF above and copy it here, or type directly to analyze with AI
        </p>
      </div>
    </div>
  );
}