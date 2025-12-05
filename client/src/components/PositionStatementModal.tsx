import { useState } from 'react';
import { X, Download, Printer, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PositionStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  isLoading?: boolean;
  withQuotes?: boolean;
}

export default function PositionStatementModal({ 
  isOpen, 
  onClose, 
  content, 
  isLoading = false,
  withQuotes = false 
}: PositionStatementModalProps) {
  if (!isOpen) return null;

  const title = withQuotes ? 'Position Statements with Quotations' : 'Position Statements';
  const filename = withQuotes ? 'position-statements-with-quotes' : 'position-statements';

  const handleDownloadTXT = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
              h1 { color: #333; border-bottom: 2px solid #333; }
              blockquote { 
                margin: 10px 0 20px 20px; 
                padding: 10px 20px; 
                border-left: 4px solid #3b82f6; 
                background-color: #f3f4f6;
                font-style: italic;
              }
              p { margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${content}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const renderContent = () => {
    if (!content) return null;
    
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('>')) {
        return (
          <blockquote 
            key={index}
            style={{
              margin: '10px 0 20px 20px',
              padding: '10px 20px',
              borderLeft: '4px solid #3b82f6',
              backgroundColor: '#f3f4f6',
              fontStyle: 'italic',
              color: '#4b5563'
            }}
          >
            {line.substring(1).trim()}
          </blockquote>
        );
      }
      return (
        <p key={index} style={{ margin: '0 0 8px 0' }}>
          {line}
        </p>
      );
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Quote size={20} color="#3b82f6" />
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827'
            }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            data-testid="button-close-position-modal"
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <div style={{
          padding: '16px 20px',
          backgroundColor: '#f3f4f6',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151'
          }}>
            About This Analysis
          </h3>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: '#6b7280',
            lineHeight: '1.5'
          }}>
            {withQuotes 
              ? 'Each position statement is paired with a direct quotation from the text that supports and evidences that philosophical claim.'
              : 'A numbered list of core philosophical claims or positions taken in the text, stated clearly and succinctly without quotations.'
            }
          </p>
        </div>

        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          minHeight: '300px'
        }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span style={{ marginLeft: '16px', color: '#6b7280' }}>
                Analyzing positions...
              </span>
            </div>
          ) : content ? (
            <div style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#374151',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {withQuotes ? renderContent() : (
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {content}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#9ca3af',
              padding: '40px',
              fontSize: '14px'
            }}>
              No position statements available
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '16px 20px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTXT}
            className="flex items-center gap-2"
            disabled={isLoading || !content}
            data-testid="button-download-position"
          >
            <Download size={16} />
            Download TXT
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-2"
            disabled={isLoading || !content}
            data-testid="button-print-position"
          >
            <Printer size={16} />
            Print/PDF
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-close-position"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
