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
      className="mt-4 border-2 border-blue-500 rounded-lg bg-blue-50 shadow-lg z-50 relative"
      style={{ 
        minHeight: '200px',
        display: 'block',
        position: 'relative',
        backgroundColor: '#eff6ff',
        border: '2px solid #3b82f6'
      }}
    >
      <div className="flex items-center justify-between p-3 border-b border-blue-200 bg-blue-100">
        <h3 className="text-lg font-bold text-blue-800 flex items-center">
          📚 STUDY GUIDE GENERATED
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 h-8 w-8 p-0"
          title="Copy study guide"
          disabled={isLoading}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
      
      <div className="p-4 max-h-96 overflow-y-auto bg-white" style={{ backgroundColor: 'white' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-blue-600">Generating study guide...</span>
          </div>
        ) : content ? (
          <div className="prose prose-sm max-w-none text-gray-700" style={{ color: '#374151' }}>
            <KaTeXRenderer content={content} />
          </div>
        ) : (
          <div className="text-red-500 py-4 text-center font-bold" style={{ color: 'red' }}>
            ERROR: No study guide content available
          </div>
        )}
      </div>
    </div>
  );
}