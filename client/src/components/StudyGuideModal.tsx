import React, { useState } from 'react';
import { X, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StudyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  isLoading?: boolean;
}

export default function StudyGuideModal({ isOpen, onClose, content, isLoading = false }: StudyGuideModalProps) {
  if (!isOpen) return null;

  const handleDownloadTXT = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study-guide.txt';
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
            <title>Study Guide</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
              h1 { color: #333; border-bottom: 2px solid #333; }
              h2 { color: #555; margin-top: 20px; }
              p { margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <h1>Study Guide</h1>
            <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${content}</pre>
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
        maxWidth: '800px',
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
            Complete Study Guide
          </h2>
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

        {/* Instructions */}
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
            Instructions
          </h3>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: '#6b7280',
            lineHeight: '1.5'
          }}>
            Create a comprehensive study guide with key concepts, definitions, important arguments, main themes, and essential points to understand from the philosophical content. Include clear explanations and organize the material for effective learning.
          </p>
        </div>

        {/* Content */}
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
                Generating study guide...
              </span>
            </div>
          ) : content ? (
            <div style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#374151',
              whiteSpace: 'pre-wrap',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {content}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#9ca3af',
              padding: '40px',
              fontSize: '14px'
            }}>
              No study guide content available
            </div>
          )}
        </div>

        {/* Footer */}
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
          >
            <Printer size={16} />
            Print/PDF
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}