import { useState } from 'react';
import { X, Download, Printer, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DialecticalAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  isLoading?: boolean;
}

export default function DialecticalAnalysisModal({ 
  isOpen, 
  onClose, 
  content, 
  isLoading = false
}: DialecticalAnalysisModalProps) {
  if (!isOpen) return null;

  const removeMarkdown = (text: string): string => {
    return text
      .replace(/#{1,6}\s*/g, '') // Remove heading symbols ### ## #
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
      .replace(/\*(.*?)\*/g, '$1') // Remove italic *text*
      .replace(/__(.*?)__/g, '$1') // Remove bold __text__
      .replace(/_(.*?)_/g, '$1') // Remove italic _text_
      .replace(/`(.*?)`/g, '$1') // Remove inline code `text`
      .trim();
  };

  const cleanContent = content.split('\n').map(line => removeMarkdown(line)).join('\n');

  const handleDownloadTXT = () => {
    const blob = new Blob([cleanContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dialectical-analysis.txt';
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
            <title>Dialectical Analysis</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
              h1 { color: #333; border-bottom: 2px solid #7c3aed; }
              h2, h3 { color: #4c1d95; margin-top: 20px; }
              blockquote { 
                margin: 10px 0 20px 20px; 
                padding: 10px 20px; 
                border-left: 4px solid #7c3aed; 
                background-color: #f3f4f6;
                font-style: italic;
              }
              ul, ol { margin-left: 20px; }
              li { margin-bottom: 8px; }
              p { margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <h1>Dialectical Analysis</h1>
            <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${cleanContent}</pre>
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
      const cleanLine = removeMarkdown(line);
      
      if (line.startsWith('>')) {
        return (
          <blockquote 
            key={index}
            style={{
              margin: '10px 0 20px 20px',
              padding: '10px 20px',
              borderLeft: '4px solid #7c3aed',
              backgroundColor: '#f5f3ff',
              fontStyle: 'italic',
              color: '#4b5563'
            }}
          >
            {removeMarkdown(line.substring(1).trim())}
          </blockquote>
        );
      }
      if (line.match(/^#{1,3}\s/)) {
        return (
          <h3 key={index} style={{ 
            color: '#4c1d95', 
            fontWeight: '600',
            marginTop: '16px',
            marginBottom: '8px',
            fontSize: '15px'
          }}>
            {cleanLine}
          </h3>
        );
      }
      return (
        <p key={index} style={{ margin: '0 0 8px 0' }}>
          {cleanLine}
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
        maxWidth: '900px',
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
          backgroundColor: '#f5f3ff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={20} color="#7c3aed" />
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827'
            }}>
              Dialectical Analysis
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
            data-testid="button-close-dialectical-modal"
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <div style={{
          padding: '16px 20px',
          backgroundColor: '#faf5ff',
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
            Identifies tensions, contradictions, hidden assumptions, and conceptual fault lines in the text. 
            This reveals the places where the author's reasoning strains, hides premises, or leaves problems unresolved.
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
                borderTop: '4px solid #7c3aed',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span style={{ marginLeft: '16px', color: '#6b7280' }}>
                Analyzing dialectical tensions...
              </span>
            </div>
          ) : content ? (
            <div style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#374151',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {renderContent()}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#9ca3af',
              padding: '40px',
              fontSize: '14px'
            }}>
              No dialectical analysis available
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
            data-testid="button-download-dialectical"
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
            data-testid="button-print-dialectical"
          >
            <Printer size={16} />
            Print/PDF
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-close-dialectical"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
