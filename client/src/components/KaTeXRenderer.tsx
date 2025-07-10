import { useEffect, useRef } from 'react';

interface KaTeXRendererProps {
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

// Enhanced math pattern detection and rendering
function renderMathContent(content: string): string {
  let processedContent = cleanMarkdownFormatting(content);
  
  // Convert line breaks to HTML
  processedContent = processedContent.replace(/\n/g, '<br>');
  
  // Enhanced math rendering with better fallbacks
  // Block math: $$...$$
  processedContent = processedContent.replace(/\$\$([^$]+)\$\$/g, (match, expr) => {
    const cleanExpr = expr.trim();
    return `<div class="math-block" style="text-align: center; font-family: 'Times New Roman', serif; font-style: italic; margin: 1em 0; padding: 0.5em; background: linear-gradient(145deg, #f8f9fa, #e9ecef); border-radius: 8px; border: 1px solid #dee2e6; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${cleanExpr}</div>`;
  });
  
  // Inline math: $...$
  processedContent = processedContent.replace(/\$([^$\n]+)\$/g, (match, expr) => {
    const cleanExpr = expr.trim();
    return `<span class="math-inline" style="font-family: 'Times New Roman', serif; font-style: italic; background: #f8f9fa; padding: 2px 6px; border-radius: 4px; border: 1px solid #e9ecef;">${cleanExpr}</span>`;
  });
  
  // Enhanced Greek letters and symbols
  const greekMap: { [key: string]: string } = {
    'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ', 'epsilon': 'ε',
    'zeta': 'ζ', 'eta': 'η', 'theta': 'θ', 'iota': 'ι', 'kappa': 'κ',
    'lambda': 'λ', 'mu': 'μ', 'nu': 'ν', 'xi': 'ξ', 'omicron': 'ο',
    'pi': 'π', 'rho': 'ρ', 'sigma': 'σ', 'tau': 'τ', 'upsilon': 'υ',
    'phi': 'φ', 'chi': 'χ', 'psi': 'ψ', 'omega': 'ω',
    'Alpha': 'Α', 'Beta': 'Β', 'Gamma': 'Γ', 'Delta': 'Δ', 'Epsilon': 'Ε',
    'Zeta': 'Ζ', 'Eta': 'Η', 'Theta': 'Θ', 'Iota': 'Ι', 'Kappa': 'Κ',
    'Lambda': 'Λ', 'Mu': 'Μ', 'Nu': 'Ν', 'Xi': 'Ξ', 'Omicron': 'Ο',
    'Pi': 'Π', 'Rho': 'Ρ', 'Sigma': 'Σ', 'Tau': 'Τ', 'Upsilon': 'Υ',
    'Phi': 'Φ', 'Chi': 'Χ', 'Psi': 'Ψ', 'Omega': 'Ω'
  };
  
  // Replace Greek letter names with symbols
  Object.entries(greekMap).forEach(([name, symbol]) => {
    const regex = new RegExp(`\\\\${name}\\b`, 'g');
    processedContent = processedContent.replace(regex, symbol);
  });
  
  // Mathematical symbols
  const symbolMap: { [key: string]: string } = {
    '\\infty': '∞', '\\sum': '∑', '\\prod': '∏', '\\int': '∫',
    '\\partial': '∂', '\\nabla': '∇', '\\in': '∈', '\\notin': '∉',
    '\\subset': '⊂', '\\supset': '⊃', '\\subseteq': '⊆', '\\supseteq': '⊇',
    '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅', '\\forall': '∀',
    '\\exists': '∃', '\\neg': '¬', '\\land': '∧', '\\lor': '∨',
    '\\implies': '⇒', '\\iff': '⇔', '\\leq': '≤', '\\geq': '≥',
    '\\neq': '≠', '\\approx': '≈', '\\equiv': '≡', '\\pm': '±',
    '\\times': '×', '\\div': '÷', '\\cdot': '⋅', '\\sqrt': '√',
    '\\therefore': '∴', '\\because': '∵'
  };
  
  Object.entries(symbolMap).forEach(([latex, symbol]) => {
    const regex = new RegExp(latex.replace(/\\/g, '\\\\'), 'g');
    processedContent = processedContent.replace(regex, symbol);
  });
  
  // Fractions: \frac{a}{b} -> a/b
  processedContent = processedContent.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  
  // Superscripts: ^{...} or ^x
  processedContent = processedContent.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>');
  processedContent = processedContent.replace(/\^([a-zA-Z0-9])/g, '<sup>$1</sup>');
  
  // Subscripts: _{...} or _x
  processedContent = processedContent.replace(/\_\{([^}]+)\}/g, '<sub>$1</sub>');
  processedContent = processedContent.replace(/\_([a-zA-Z0-9])/g, '<sub>$1</sub>');
  
  return processedContent;
}

export default function KaTeXRenderer({ content, className = '' }: KaTeXRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Process content with enhanced math rendering
    const processedContent = renderMathContent(content);
    
    // Set the content
    containerRef.current.innerHTML = processedContent;
    
  }, [content]);

  return (
    <div 
      ref={containerRef} 
      className={`prose prose-sm max-w-none ${className}`}
      style={{ 
        lineHeight: '1.6',
        wordWrap: 'break-word',
        overflowWrap: 'break-word'
      }}
    />
  );
}