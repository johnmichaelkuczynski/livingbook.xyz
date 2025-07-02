import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    MathJax: any;
  }
}

interface SimpleMathRendererProps {
  content: string;
  className?: string;
}

export default function SimpleMathRenderer({ content, className = '' }: SimpleMathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let processedContent = content;

    // Handle line breaks first
    processedContent = processedContent.replace(/\n/g, '<br>');

    // Set the content without modifying math notation
    containerRef.current.innerHTML = processedContent;

    // Trigger MathJax re-typesetting after content is set
    const typesetMath = async () => {
      if (window.MathJax && window.MathJax.typesetPromise) {
        try {
          await window.MathJax.typesetPromise([containerRef.current]);
        } catch (err) {
          console.warn('MathJax typeset failed:', err);
        }
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(typesetMath, 100);
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className={`text-lg leading-relaxed ${className}`}
      style={{
        lineHeight: '1.8',
        fontSize: '18px'
      }}
    />
  );
}