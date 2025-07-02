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

    // REMOVE ALL MATH MARKUP AND SYMBOLS COMPLETELY
    processedContent = processedContent.replace(/\$\$([^$]*?)\$\$/g, '$1');  // Remove $$...$$
    processedContent = processedContent.replace(/\$([^$]*?)\$/g, '$1');      // Remove $...$
    processedContent = processedContent.replace(/\\\[([\s\S]*?)\\\]/g, '$1'); // Remove \[...\]
    processedContent = processedContent.replace(/\\\(([\s\S]*?)\\\)/g, '$1'); // Remove \(...\)
    processedContent = processedContent.replace(/\\([a-zA-Z]+)/g, '$1');     // Remove \commands
    processedContent = processedContent.replace(/\*\*([^*]*?)\*\*/g, '$1');  // Remove **...**
    processedContent = processedContent.replace(/\*([^*]*?)\*/g, '$1');      // Remove *...*
    processedContent = processedContent.replace(/#{1,6}\s*/g, '');           // Remove ### headers
    processedContent = processedContent.replace(/`([^`]*?)`/g, '$1');        // Remove `...`
    processedContent = processedContent.replace(/_([^_]*?)_/g, '$1');        // Remove _..._
    
    // Clean up ALL remaining symbols and markup
    processedContent = processedContent.replace(/\\/g, '');                  // Remove all backslashes
    processedContent = processedContent.replace(/[{}[\]]/g, '');             // Remove brackets and braces
    processedContent = processedContent.replace(/\^/g, '');                  // Remove carets
    processedContent = processedContent.replace(/~/g, '');                   // Remove tildes
    
    // Handle line breaks
    processedContent = processedContent.replace(/\n/g, '<br>');

    // Set the completely clean content
    containerRef.current.innerHTML = processedContent;
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