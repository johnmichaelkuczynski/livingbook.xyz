import fs from 'fs/promises';
import path from 'path';

// For PDF processing
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    // Dynamic import to avoid module loading issues
    const pdfParse = await import('pdf-parse');
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse.default(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to extract text from PDF: ${error}`);
  }
}

// For DOCX processing
async function extractTextFromDOCX(filePath: string): Promise<string> {
  try {
    // Dynamic import to avoid module loading issues
    const mammoth = await import('mammoth');
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error(`Failed to extract text from DOCX: ${error}`);
  }
}

// For TXT files
async function extractTextFromTXT(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read text file: ${error}`);
  }
}

export async function extractTextFromDocument(filePath: string, fileType: string): Promise<string> {
  const extension = fileType.toLowerCase();
  
  switch (extension) {
    case 'pdf':
    case 'application/pdf':
      return extractTextFromPDF(filePath);
    
    case 'docx':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractTextFromDOCX(filePath);
    
    case 'txt':
    case 'text/plain':
      return extractTextFromTXT(filePath);
    
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}

// Convert plain text math expressions to a more readable format
export function processMathNotation(text: string): string {
  let processedText = text;
  
  // Enhanced math pattern detection and conversion
  // Convert common plaintext math to LaTeX format for better rendering
  
  // Handle fractions: a/b -> $\frac{a}{b}$ (wrap in LaTeX delimiters)
  processedText = processedText.replace(/(\d+)\/(\d+)/g, '$\\frac{$1}{$2}$');
  
  // Handle square roots: sqrt(x) -> $\sqrt{x}$
  processedText = processedText.replace(/sqrt\(([^)]+)\)/g, '$\\sqrt{$1}$');
  
  // Handle powers: x^2 -> $x^{2}$, x^(n+1) -> $x^{n+1}$
  processedText = processedText.replace(/([a-zA-Z])\^(\d+)/g, '$$$1^{$2}$$');
  processedText = processedText.replace(/([a-zA-Z])\^(\([^)]+\))/g, '$$$1^{$2}$$');
  
  // Handle subscripts: x_i -> $x_{i}$
  processedText = processedText.replace(/([a-zA-Z])_(\w)/g, '$$$1_{$2}$$');
  
  // Common math symbol replacements
  const mathReplacements: Array<[RegExp, string]> = [
    // Greek letters (convert to LaTeX)
    [/\balpha\b/g, '$\\alpha$'],
    [/\bbeta\b/g, '$\\beta$'],
    [/\bgamma\b/g, '$\\gamma$'],
    [/\bdelta\b/g, '$\\delta$'],
    [/\bepsilon\b/g, '$\\epsilon$'],
    [/\btheta\b/g, '$\\theta$'],
    [/\blambda\b/g, '$\\lambda$'],
    [/\bmu\b/g, '$\\mu$'],
    [/\bpi\b/g, '$\\pi$'],
    [/\bsigma\b/g, '$\\sigma$'],
    [/\bphi\b/g, '$\\phi$'],
    [/\bomega\b/g, '$\\omega$'],
    
    // Mathematical operators
    [/\+\/-/g, '±'],
    [/\+-/g, '±'],
    [/<=/g, '≤'],
    [/>=/g, '≥'],
    [/!=/g, '≠'],
    [/~=/g, '≈'],
    [/\binfinity\b/g, '∞'],
    [/\bsum\b/g, '$\\sum$'],
    [/\bintegral\b/g, '$\\int$'],
    
    // Enhance existing expressions
    [/\^2/g, '²'],
    [/\^3/g, '³'],
  ];
  
  mathReplacements.forEach(([pattern, replacement]) => {
    processedText = processedText.replace(pattern, replacement);
  });
  
  return processedText;
}
