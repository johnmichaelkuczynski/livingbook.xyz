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

    // COMPLETELY REMOVE ALL MATH MARKUP AND SYMBOLS
    processedContent = processedContent.replace(/\$\$([^$]*?)\$\$/g, '$1');  // Remove $$...$$
    processedContent = processedContent.replace(/\$([^$]*?)\$/g, '$1');      // Remove $...$
    processedContent = processedContent.replace(/\\([a-zA-Z]+)/g, '$1');     // Remove \commands
    processedContent = processedContent.replace(/\\\(/g, '(');               // Remove \(
    processedContent = processedContent.replace(/\\\)/g, ')');               // Remove \)
    processedContent = processedContent.replace(/\\\[/g, '[');               // Remove \[
    processedContent = processedContent.replace(/\\\]/g, ']');               // Remove \]
    processedContent = processedContent.replace(/\\{/g, '{');                // Remove \{
    processedContent = processedContent.replace(/\\}/g, '}');                // Remove \}
    processedContent = processedContent.replace(/\*\*([^*]*?)\*\*/g, '$1');  // Remove **...**
    processedContent = processedContent.replace(/\*([^*]*?)\*/g, '$1');      // Remove *...*
    processedContent = processedContent.replace(/#{1,6}\s*/g, '');           // Remove ### headers
    processedContent = processedContent.replace(/`([^`]*?)`/g, '$1');        // Remove `...`
    processedContent = processedContent.replace(/_([^_]*?)_/g, '$1');        // Remove _..._
    
    // Clean up remaining backslashes and symbols
    processedContent = processedContent.replace(/\\/g, '');                  // Remove all backslashes
    processedContent = processedContent.replace(/[{}]/g, '');                // Remove curly braces
    
    // Handle line breaks
    processedContent = processedContent.replace(/\n/g, '<br>');

    // Set the clean content
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