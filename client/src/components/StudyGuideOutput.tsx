import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import KaTeXRenderer from './KaTeXRenderer';

interface StudyGuideOutputProps {
  content: string;
  isVisible: boolean;
  isLoading?: boolean;
}

export default function StudyGuideOutput({ content, isVisible, isLoading = false }: StudyGuideOutputProps) {
  const [copied, setCopied] = useState(false);
  
  console.log('StudyGuideOutput props:', { content: content?.substring(0, 100), isVisible, isLoading });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      id="study-guide-container"
      style={{ 
        width: '100%',
        marginTop: '16px',
        border: '3px solid #3b82f6',
        borderRadius: '8px',
        backgroundColor: '#eff6ff',
        minHeight: '250px',
        display: 'block',
        position: 'relative',
        zIndex: 999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: '#dbeafe',
        borderBottom: '1px solid #93c5fd'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#1e40af',
          margin: 0
        }}>
          📚 STUDY GUIDE GENERATED ✅
        </h3>
        <button
          onClick={handleCopy}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#2563eb',
            cursor: 'pointer',
            padding: '4px'
          }}
          title="Copy study guide"
          disabled={isLoading}
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>
      
      <div style={{
        padding: '16px',
        maxHeight: '400px',
        overflowY: 'auto',
        backgroundColor: 'white',
        color: '#374151'
      }}>
        {isLoading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{ marginLeft: '12px', color: '#3b82f6' }}>
              Generating study guide...
            </span>
          </div>
        ) : content ? (
          <div style={{ lineHeight: '1.6' }}>
            <KaTeXRenderer content={content} />
          </div>
        ) : (
          <div style={{
            color: '#ef4444',
            padding: '16px',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            ERROR: No study guide content available
          </div>
        )}
      </div>
    </div>
  );
}