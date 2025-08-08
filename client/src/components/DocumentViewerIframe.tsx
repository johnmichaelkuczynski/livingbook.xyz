import { useEffect, useRef, memo } from 'react';

interface DocumentViewerIframeProps {
  content: string;
  onTextSelection?: (selectedText: string) => void;
  className?: string;
}

function DocumentViewerIframe({ content, onTextSelection, className = '' }: DocumentViewerIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!doc) return;

    // Create the HTML content with styles and the document content
    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Document Viewer</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: Georgia, "Times New Roman", serif; 
              line-height: 1.6; 
              font-size: 14px;
              color: #374151;
              background: white;
              overflow-x: hidden;
              word-wrap: break-word;
              hyphens: auto;
            }
            p {
              margin-bottom: 1.2em;
              text-align: justify;
            }
            h1, h2, h3, h4, h5, h6 {
              color: #1f2937;
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              font-weight: bold;
            }
            h1 { font-size: 1.6em; }
            h2 { font-size: 1.4em; }
            h3 { font-size: 1.2em; }
            ul, ol {
              margin: 1em 0;
              padding-left: 2em;
            }
            li {
              margin-bottom: 0.5em;
            }
            .math-block {
              text-align: center;
              font-family: 'Times New Roman', serif;
              font-style: italic;
              margin: 1em 0;
              padding: 0.5em;
              background: linear-gradient(145deg, #f8f9fa, #e9ecef);
              border-radius: 8px;
              border: 1px solid #dee2e6;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .math-inline {
              font-family: 'Times New Roman', serif;
              font-style: italic;
              background: #f8f9fa;
              padding: 2px 6px;
              border-radius: 4px;
              border: 1px solid #e9ecef;
            }
            /* Selection highlighting */
            ::selection {
              background: #3b82f6;
              color: white;
            }
            ::-moz-selection {
              background: #3b82f6;
              color: white;
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Add text selection listener inside the iframe
    if (onTextSelection) {
      const handleSelection = () => {
        const selection = doc.getSelection();
        const selectedText = selection?.toString().trim() || '';
        
        if (selectedText.length > 10) {
          onTextSelection(selectedText);
        }
      };

      doc.addEventListener('mouseup', handleSelection);
      doc.addEventListener('keyup', handleSelection);
      
      return () => {
        doc.removeEventListener('mouseup', handleSelection);
        doc.removeEventListener('keyup', handleSelection);
      };
    }
  }, [content, onTextSelection]);

  return (
    <iframe
      ref={iframeRef}
      className={`document-iframe ${className}`}
      style={{
        width: '100%',
        height: '600px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: 'white'
      }}
      sandbox="allow-same-origin"
      title="Document Viewer"
    />
  );
}

// Memoize to prevent re-renders - but this is overkill since iframe content is isolated anyway
export default memo(DocumentViewerIframe, (prevProps, nextProps) => {
  return prevProps.content === nextProps.content;
});