// Utility functions for math notation rendering

export function processMathNotation(text: string): string {
  let processedText = text;
  
  // Enhanced math pattern detection and conversion
  // Convert common plaintext math to LaTeX format
  
  // Handle fractions: a/b -> \frac{a}{b}
  processedText = processedText.replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');
  
  // Handle square roots: sqrt(x) -> \sqrt{x}
  processedText = processedText.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
  
  // Handle powers: x^2 -> x^{2}, x^(n+1) -> x^{n+1}
  processedText = processedText.replace(/\^(\d+)/g, '^{$1}');
  processedText = processedText.replace(/\^(\([^)]+\))/g, '^{$1}');
  
  // Handle subscripts: x_i -> x_{i}
  processedText = processedText.replace(/_(\w)/g, '_{$1}');
  
  // Handle infinity symbol
  processedText = processedText.replace(/\binfinity\b/g, '\\infty');
  
  // Handle summation
  processedText = processedText.replace(/\bsum\b/g, '\\sum');
  
  // Handle integrals
  processedText = processedText.replace(/\bintegral\b/g, '\\int');
  
  // Handle Greek letters
  const greekLetters = {
    'alpha': '\\alpha', 'beta': '\\beta', 'gamma': '\\gamma', 'delta': '\\delta',
    'epsilon': '\\epsilon', 'zeta': '\\zeta', 'eta': '\\eta', 'theta': '\\theta',
    'iota': '\\iota', 'kappa': '\\kappa', 'lambda': '\\lambda', 'mu': '\\mu',
    'nu': '\\nu', 'xi': '\\xi', 'pi': '\\pi', 'rho': '\\rho',
    'sigma': '\\sigma', 'tau': '\\tau', 'upsilon': '\\upsilon', 'phi': '\\phi',
    'chi': '\\chi', 'psi': '\\psi', 'omega': '\\omega'
  };
  
  Object.entries(greekLetters).forEach(([name, latex]) => {
    const regex = new RegExp(`\\b${name}\\b`, 'g');
    processedText = processedText.replace(regex, latex);
  });
  
  // Handle mathematical operators
  processedText = processedText.replace(/\+\/-/g, '\\pm');
  processedText = processedText.replace(/<=/g, '\\leq');
  processedText = processedText.replace(/>=/g, '\\geq');
  processedText = processedText.replace(/!=/g, '\\neq');
  processedText = processedText.replace(/~=/g, '\\approx');
  
  // Mark display math expressions (content between $$ symbols) for KaTeX rendering
  processedText = processedText.replace(
    /\$\$([^$]+)\$\$/g, 
    '<div class="katex-math-display" data-math="$1">$$1$$</div>'
  );
  
  // Mark inline math expressions (content between $ symbols) for KaTeX rendering
  processedText = processedText.replace(
    /\$([^$]+)\$/g, 
    '<span class="katex-math-inline" data-math="$1">$1</span>'
  );
  
  return processedText;
}

export function containsMath(text: string): boolean {
  // Enhanced check for common math patterns
  const mathPatterns = [
    /\$.*\$/,  // LaTeX-style math (single $)
    /\$\$.*\$\$/,  // LaTeX-style display math (double $$)
    /\\\w+\{.*\}/,  // LaTeX commands like \frac{}, \sqrt{}
    /\^[0-9]/,  // Superscripts
    /sqrt\(/,   // Square roots
    /[α-ω]/,    // Greek letters
    /[±≤≥≠≈∞∑∫]/,  // Math symbols
    /\\frac/,   // Fractions
    /\\sqrt/,   // Square roots
    /\\sum/,    // Summation
    /\\int/,    // Integration
    /\\alpha|\\beta|\\gamma|\\delta/,  // Common Greek letters
    /\\text\{.*\}/,  // Text inside math
    /\\\(/,     // LaTeX inline math \( ... \)
    /\\\[/      // LaTeX display math \[ ... \]
  ];
  
  return mathPatterns.some(pattern => pattern.test(text));
}
