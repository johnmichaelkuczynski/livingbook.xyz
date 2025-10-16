import React, { useState } from 'react';

interface SimpleStudyGuideProps {
  content: string;
  isLoading?: boolean;
}

export default function SimpleStudyGuide({ content, isLoading = false }: SimpleStudyGuideProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  return (
    <div 
      id="simple-study-guide"
      style={{ 
        width: '100%',
        marginTop: '20px',
        border: '3px solid #dc2626',
        borderRadius: '8px',
        backgroundColor: '#fef2f2',
        minHeight: '300px',
        display: 'block',
        position: 'relative',
        zIndex: 999,
        boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        backgroundColor: '#fee2e2',
        borderBottom: '2px solid #dc2626'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#dc2626',
          margin: 0
        }}>
          📚 STUDY GUIDE IS HERE! ✅ VISIBLE NOW
        </h2>
        <button
          onClick={handleCopy}
          style={{
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
          title="Copy study guide"
          disabled={isLoading}
        >
          {copied ? 'COPIED!' : 'COPY'}
        </button>
      </div>
      
      <div style={{
        padding: '20px',
        maxHeight: '500px',
        overflowY: 'auto',
        backgroundColor: 'white',
        color: '#1f2937',
        fontSize: '15px',
        lineHeight: '1.7'
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
              borderTop: '4px solid #dc2626',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{ marginLeft: '16px', color: '#dc2626', fontSize: '16px', fontWeight: 'bold' }}>
              GENERATING STUDY GUIDE...
            </span>
          </div>
        ) : content ? (
          <div style={{ 
            whiteSpace: 'pre-wrap',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '15px',
            lineHeight: '1.7'
          }}>
            {content}
          </div>
        ) : (
          <div style={{
            color: '#dc2626',
            padding: '20px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '16px'
          }}>
            NO STUDY GUIDE CONTENT AVAILABLE - PLEASE TRY AGAIN
          </div>
        )}
      </div>
    </div>
  );
}