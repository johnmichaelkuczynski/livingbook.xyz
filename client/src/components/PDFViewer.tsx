import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

interface PDFViewerProps {
  document: any;
  onTextSelection?: (selectedText: string, pageNumber: number) => void;
}

export default function PDFViewer({ document, onTextSelection }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [selectedText, setSelectedText] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle document load success
  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        const text = selection.toString().trim();
        setSelectedText(text);
        if (onTextSelection) {
          onTextSelection(text, pageNumber);
        }
      }
    };

    // Add event listener for text selection
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, [pageNumber, onTextSelection]);

  // Zoom functions
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const rotate = () => setRotation(prev => (prev + 90) % 360);

  // Navigation functions
  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));

  if (!document) {
    return <div className="flex items-center justify-center h-full text-gray-500">No document loaded</div>;
  }

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {pageNumber} of {numPages || '?'}
          </span>
          <Button
            onClick={goToNextPage}
            disabled={pageNumber >= (numPages || 1)}
            variant="outline"
            size="sm"
          >
            Next
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button onClick={zoomOut} variant="outline" size="sm">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button onClick={zoomIn} variant="outline" size="sm">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button onClick={rotate} variant="outline" size="sm">
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Document */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-200 p-4"
      >
        <div className="flex justify-center">
          <div className="bg-white shadow-lg">
            <Document
              file={`/api/documents/${document.id}/pdf`}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="text-gray-500">Loading PDF...</div>
                </div>
              }
              error={
                <div className="flex items-center justify-center p-8">
                  <div className="text-red-500">Failed to load PDF</div>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        </div>
      </div>

      {/* Selected Text Display */}
      {selectedText && (
        <div className="p-3 bg-blue-50 border-t border-blue-200">
          <div className="text-sm text-blue-800 font-medium">Selected Text:</div>
          <div className="text-sm text-blue-700 mt-1 max-h-20 overflow-y-auto">
            {selectedText}
          </div>
        </div>
      )}
    </div>
  );
}