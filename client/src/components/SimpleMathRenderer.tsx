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

// Helper function to clean markdown formatting
function cleanMarkdownFormatting(text: string): string {
  return text
    .replace(/\*\*/g, '')         // Remove bold markdown
    .replace(/\*/g, '')           // Remove italic markdown  
    .replace(/#{1,6}\s?/g, '')    // Remove headers
    .replace(/`{1,3}/g, '')       // Remove code blocks
    .replace(/^\s*[-\*\+]\s+/gm, '') // Remove bullet points
    .replace(/^\s*\d+\.\s+/gm, '')   // Remove numbered lists
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
    .replace(/^\s*>\s?/gm, '')    // Remove blockquotes
    .replace(/\|/g, ' ')          // Remove table separators
    .replace(/---+/g, '')         // Remove horizontal rules
    .replace(/\n{3,}/g, '\n\n')   // Reduce multiple newlines
    .trim();
}

export default function SimpleMathRenderer({ content, className = '' }: SimpleMathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean markdown formatting first
    let processedContent = cleanMarkdownFormatting(content);

    // Preserve original math notation for MathJax processing
    // Convert line breaks to HTML
    processedContent = processedContent.replace(/\n/g, '<br>');
    
    // Set the content with original math notation preserved
    containerRef.current.innerHTML = processedContent;

    // Trigger MathJax re-typesetting after content is set
    const typesetMath = () => {
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([containerRef.current])
          .then(() => {
            console.log('MathJax typeset complete');
          })
          .catch((err: any) => {
            console.warn('MathJax typeset failed:', err);
          });
      } else if (window.MathJax && window.MathJax.Hub) {
        // Fallback for MathJax v2
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, containerRef.current]);
      }
    };

    // Wait for MathJax to be ready, then typeset
    if (window.MathJax) {
      setTimeout(typesetMath, 100);
    } else {
      // If MathJax not loaded yet, wait and retry
      const checkMathJax = setInterval(() => {
        if (window.MathJax) {
          clearInterval(checkMathJax);
          typesetMath();
        }
      }, 100);
      
      // Clear interval after 10 seconds to prevent infinite loop
      setTimeout(() => clearInterval(checkMathJax), 10000);
    }
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