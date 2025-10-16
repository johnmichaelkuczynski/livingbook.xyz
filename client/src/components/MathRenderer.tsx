import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  expression: string;
  displayMode?: boolean;
  className?: string;
}

export default function MathRenderer({ 
  expression, 
  displayMode = false, 
  className = '' 
}: MathRendererProps) {
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      try {
        katex.render(expression, elementRef.current, {
          displayMode,
          throwOnError: false,
          strict: false,
        });
      } catch (error) {
        // If KaTeX fails, fall back to plain text
        elementRef.current.textContent = expression;
      }
    }
  }, [expression, displayMode]);

  return (
    <span 
      ref={elementRef} 
      className={`math-katex ${displayMode ? 'display' : 'inline'} ${className}`}
    />
  );
}