// Utility functions for math notation rendering

export function processMathNotation(text: string): string {
  // This function processes text to identify and mark math expressions
  // In production, you'd integrate with KaTeX or MathJax here
  
  let processedText = text;
  
  // Mark inline math expressions (content between $ symbols)
  processedText = processedText.replace(
    /\$([^$]+)\$/g, 
    '<span class="math-inline">$1</span>'
  );
  
  // Mark display math expressions (content between $$ symbols)
  processedText = processedText.replace(
    /\$\$([^$]+)\$\$/g, 
    '<div class="math-display">$1</div>'
  );
  
  // Common math notation formatting
  processedText = processedText.replace(/x\^2/g, 'x²');
  processedText = processedText.replace(/x\^3/g, 'x³');
  processedText = processedText.replace(/sqrt\(([^)]+)\)/g, '√($1)');
  
  return processedText;
}

export function containsMath(text: string): boolean {
  // Simple check for common math patterns
  const mathPatterns = [
    /\$.*\$/,  // LaTeX-style math
    /\^[0-9]/,  // Superscripts
    /sqrt\(/,   // Square roots
    /[α-ω]/,    // Greek letters
    /[±≤≥≠≈∞∑∫]/  // Math symbols
  ];
  
  return mathPatterns.some(pattern => pattern.test(text));
}
