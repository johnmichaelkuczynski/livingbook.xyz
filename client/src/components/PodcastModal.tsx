import React from 'react';
import { X, Copy } from 'lucide-react';

interface PodcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  dialogue: string;
  type: 'standard' | 'modern';
  selectedText: string;
}

export default function PodcastModal({
  isOpen,
  onClose,
  dialogue,
  type,
  selectedText
}: PodcastModalProps) {
  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(dialogue);
    // Could add a toast notification here
  };

  const formatDialogue = (text: string) => {
    // Split by speaker lines and format
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      if (line.startsWith('Speaker 1:')) {
        return (
          <div key={index} style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontWeight: 'bold', 
              color: '#1d4ed8', 
              marginBottom: '4px' 
            }}>
              Speaker 1:
            </div>
            <div style={{ 
              color: '#374151', 
              lineHeight: '1.6',
              paddingLeft: '16px'
            }}>
              {line.replace('Speaker 1:', '').trim()}
            </div>
          </div>
        );
      } else if (line.startsWith('Speaker 2:')) {
        return (
          <div key={index} style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontWeight: 'bold', 
              color: '#dc2626', 
              marginBottom: '4px' 
            }}>
              Speaker 2:
            </div>
            <div style={{ 
              color: '#374151', 
              lineHeight: '1.6',
              paddingLeft: '16px'
            }}>
              {line.replace('Speaker 2:', '').trim()}
            </div>
          </div>
        );
      } else {
        // Handle non-speaker lines
        return (
          <div key={index} style={{ 
            color: '#6b7280', 
            marginBottom: '8px',
            fontStyle: 'italic'
          }}>
            {line}
          </div>
        );
      }
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
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#1f2937',
              margin: '0 0 4px 0'
            }}>
              Podcast Dialogue
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0
            }}>
              {type === 'standard' ? 'Standard Summary Dialogue' : 'Modern Reconstruction (5 min)'}
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleCopy}
              style={{
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Copy size={16} />
              Copy
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

        {/* Selected Text Preview */}
        {selectedText && (
          <div style={{
            padding: '16px 24px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Original Text
            </div>
            <div style={{
              fontSize: '14px',
              color: '#6b7280',
              lineHeight: '1.5',
              maxHeight: '100px',
              overflow: 'auto'
            }}>
              {selectedText.length > 200 ? selectedText.substring(0, 200) + '...' : selectedText}
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '24px',
          overflow: 'auto'
        }}>
          <div style={{
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {formatDialogue(dialogue)}
          </div>
        </div>
      </div>
    </div>
  );
}