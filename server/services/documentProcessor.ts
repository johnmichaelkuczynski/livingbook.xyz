import fs from 'fs/promises';
import path from 'path';

// For PDF processing with layout heuristics
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const pdfParse = await import('pdf-parse');
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse.default(buffer);
    
    let text = data.text;
    
    // Apply layout heuristics to preserve paragraph structure
    // Split on multiple spaces or line breaks that indicate paragraph boundaries
    text = text.replace(/\n\s*\n/g, '\n\n'); // Normalize paragraph breaks
    text = text.replace(/([.!?])\s*\n(?=[A-Z])/g, '$1\n\n'); // Sentence endings followed by capitals
    text = text.replace(/\n(?=\d+\.)/g, '\n\n'); // Numbered lists
    text = text.replace(/\n(?=[•·\-\*])/g, '\n\n'); // Bullet points
    text = text.replace(/([a-z])\s*\n([A-Z][a-z])/g, '$1 $2'); // Join broken words
    
    // Clean up excessive whitespace while preserving structure
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    text = text.replace(/^\s+|\s+$/g, '');
    
    return text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to extract text from PDF: ${error}`);
  }
}

// For DOCX processing with preserved formatting
async function extractTextFromDOCX(filePath: string): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const buffer = await fs.readFile(filePath);
    
    // Extract with paragraph structure preserved
    const result = await mammoth.convertToHtml({ buffer });
    
    // Convert HTML to structured text preserving paragraphs
    let text = result.value;
    
    // Replace HTML elements with structured text markers
    text = text.replace(/<h[1-6][^>]*>/gi, '\n## ');
    text = text.replace(/<\/h[1-6]>/gi, ' ##\n');
    text = text.replace(/<p[^>]*>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<br[^>]*>/gi, '\n');
    text = text.replace(/<li[^>]*>/gi, '\n• ');
    text = text.replace(/<\/li>/gi, '');
    text = text.replace(/<ul[^>]*>|<\/ul>/gi, '\n');
    text = text.replace(/<ol[^>]*>|<\/ol>/gi, '\n');
    text = text.replace(/<strong[^>]*>|<\/strong>/gi, '**');
    text = text.replace(/<em[^>]*>|<\/em>/gi, '*');
    text = text.replace(/<[^>]+>/g, ''); // Remove remaining HTML tags
    
    // Clean up extra whitespace while preserving paragraph structure
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Multiple newlines to double
    text = text.replace(/^\s+|\s+$/g, ''); // Trim start/end
    
    return text;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error(`Failed to extract text from DOCX: ${error}`);
  }
}

// For TXT files - preserve existing structure
async function extractTextFromTXT(filePath: string): Promise<string> {
  try {
    const text = await fs.readFile(filePath, 'utf-8');
    
    // Normalize line endings and preserve paragraph structure
    let normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Clean up excessive whitespace while preserving intentional formatting
    normalizedText = normalizedText.replace(/\n\s*\n\s*\n/g, '\n\n');
    normalizedText = normalizedText.replace(/^\s+|\s+$/g, '');
    
    return normalizedText;
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

// Preserve original math notation without modification
export function processMathNotation(text: string): string {
  // Return text as-is to preserve original formatting
  return text;
}
