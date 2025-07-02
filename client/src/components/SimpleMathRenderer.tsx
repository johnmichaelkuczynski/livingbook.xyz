import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface SimpleMathRendererProps {
  content: string;
  className?: string;
}

export default function SimpleMathRenderer({ content, className = '' }: SimpleMathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let processedContent = content;

    // Handle display math $$...$$
    processedContent = processedContent.replace(/\$\$([^$]+)\$\$/g, (match, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
      } catch (e) {
        return `<div class="math-error">$$${math}$$</div>`;
      }
    });

    // Handle inline math $...$
    processedContent = processedContent.replace(/\$([^$]+)\$/g, (match, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
      } catch (e) {
        return `<span class="math-error">$${math}$</span>`;
      }
    });

    // Handle line breaks
    processedContent = processedContent.replace(/\n/g, '<br>');

    containerRef.current.innerHTML = processedContent;
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className={`text-sm ${className}`}
    />
  );
}