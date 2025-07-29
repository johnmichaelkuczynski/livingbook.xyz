import React, { useState } from 'react';
import { X, Copy, Download, Printer } from 'lucide-react';

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  isLoading?: boolean;
}

export default function TestModal({ isOpen, onClose, content, isLoading = false }: TestModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleDownloadTXT = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test.txt';
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
            <title>Test Questions</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                line-height: 1.6; 
                padding: 20px; 
                max-width: 800px;
                margin: 0 auto;
              }
              h1 { 
                color: #333; 
                border-bottom: 2px solid #333; 
                text-align: center;
              }
              h2 { 
                color: #555; 
                margin-top: 30px; 
              }
              p { 
                margin-bottom: 15px; 
              }
              .question {
                margin-bottom: 20px;
                page-break-inside: avoid;
              }
              .answer-choice {
                margin-left: 20px;
                margin-bottom: 5px;
              }
              .divider {
                border-top: 2px solid #ddd;
                margin: 30px 0;
                padding-top: 20px;
              }
            </style>
          </head>
          <body>
            <h1>Test Questions</h1>
            <div style="white-space: pre-wrap; font-family: Arial, sans-serif;">${content}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
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
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827'
          }}>
            📝 Test Questions
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopy}
              disabled={isLoading || !content}
              style={{
                backgroundColor: copied ? '#10b981' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              <Copy size={16} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownloadTXT}
              disabled={isLoading || !content}
              style={{
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              <Download size={16} />
              TXT
            </button>
            <button
              onClick={handlePrint}
              disabled={isLoading || !content}
              style={{
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              <Printer size={16} />
              Print
            </button>
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
            >
              <X size={20} color="#6b7280" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflow: 'auto',
          backgroundColor: 'white'
        }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              gap: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{
                color: '#6b7280',
                fontSize: '16px',
                margin: 0
              }}>
                Generating test questions...
              </p>
            </div>
          ) : content ? (
            <div style={{
              lineHeight: '1.8',
              fontSize: '15px',
              color: '#374151',
              whiteSpace: 'pre-wrap',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {content}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6b7280'
            }}>
              <p>No test content available</p>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
}