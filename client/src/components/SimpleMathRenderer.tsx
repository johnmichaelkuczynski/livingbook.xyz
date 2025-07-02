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

    // Enhanced math pattern matching with better LaTeX support
    // Handle display math $$...$$
    processedContent = processedContent.replace(/\$\$([^$]+?)\$\$/g, (match, math) => {
      try {
        const cleanMath = math.trim();
        return `<div class="katex-display">${katex.renderToString(cleanMath, { 
          displayMode: true, 
          throwOnError: false,
          trust: true,
          strict: false
        })}</div>`;
      } catch (e) {
        console.warn('KaTeX display math error:', e);
        return `<div class="math-fallback display-math">$$${math}$$</div>`;
      }
    });

    // Handle inline math $...$
    processedContent = processedContent.replace(/\$([^$\n]+?)\$/g, (match, math) => {
      try {
        const cleanMath = math.trim();
        return `<span class="katex-inline">${katex.renderToString(cleanMath, { 
          displayMode: false, 
          throwOnError: false,
          trust: true,
          strict: false
        })}</span>`;
      } catch (e) {
        console.warn('KaTeX inline math error:', e);
        return `<span class="math-fallback inline-math">$${math}$</span>`;
      }
    });

    // Handle LaTeX commands like \frac, \lim, \to, etc.
    processedContent = processedContent.replace(/\\([a-zA-Z]+)(\{[^}]*\})?/g, (match, command, args) => {
      try {
        // Common LaTeX commands that should be rendered as math
        const mathCommands = ['frac', 'lim', 'to', 'infty', 'delta', 'epsilon', 'alpha', 'beta', 'gamma', 'theta', 'lambda', 'mu', 'pi', 'sigma', 'omega', 'Delta', 'Gamma', 'Lambda', 'Omega', 'sum', 'int', 'partial', 'nabla', 'sqrt', 'sin', 'cos', 'tan', 'log', 'ln', 'exp'];
        
        if (mathCommands.includes(command)) {
          return katex.renderToString(match, { 
            displayMode: false, 
            throwOnError: false,
            trust: true,
            strict: false
          });
        }
        return match;
      } catch (e) {
        return match;
      }
    });

    // Handle common mathematical symbols and expressions
    processedContent = processedContent.replace(/([a-zA-Z]\([a-zA-Z0-9\s\+\-\*\/\^]+\))/g, (match) => {
      try {
        return katex.renderToString(match, { 
          displayMode: false, 
          throwOnError: false,
          trust: true,
          strict: false
        });
      } catch (e) {
        return match;
      }
    });

    // Handle line breaks
    processedContent = processedContent.replace(/\n/g, '<br>');

    containerRef.current.innerHTML = processedContent;
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className={`text-sm leading-relaxed ${className}`}
      style={{
        lineHeight: '1.6'
      }}
    />
  );
}