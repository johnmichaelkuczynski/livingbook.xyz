import fs from 'fs/promises';
import path from 'path';

// For PDF processing
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    // Dynamic import to avoid module loading issues
    const pdfParse = await import('pdf-parse');
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse.default(buffer);
    
    // Enhanced paragraph handling for PDF
    let text = data.text;
    
    // Normalize line breaks and preserve paragraph structure
    text = text
      .replace(/\r\n/g, '\n')  // Normalize Windows line breaks
      .replace(/\r/g, '\n')    // Normalize Mac line breaks
      .replace(/\s+/g, ' ')    // Normalize multiple spaces to single space
      .replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2') // Add paragraph breaks after sentences followed by capitals
      .replace(/([a-z])\s+([A-Z][a-z]+\s+[A-Z])/g, '$1\n\n$2') // Break before title case (likely headings)
      .replace(/\.\s*\n\s*([A-Z])/g, '.\n\n$1') // Ensure sentence endings start new paragraphs
      .replace(/([a-z])\s*\n\s*([A-Z])/g, '$1\n\n$2') // Add breaks between lowercase-to-uppercase transitions
      .replace(/\n{3,}/g, '\n\n') // Reduce excessive line breaks to double
      .replace(/^\s+|\s+$/gm, '') // Trim whitespace from each line
      .trim();
    
    return text;
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
    // Use extractRawText to preserve paragraph structure
    const result = await mammoth.extractRawText({ buffer });
    
    // Better paragraph handling for DOCX
    let text = result.value;
    
    // Normalize line breaks and preserve paragraph structure
    text = text
      .replace(/\r\n/g, '\n')  // Normalize Windows line breaks
      .replace(/\r/g, '\n')    // Normalize Mac line breaks
      .replace(/\n{3,}/g, '\n\n') // Reduce excessive line breaks to double
      .trim();
    
    return text;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error(`Failed to extract text from DOCX: ${error}`);
  }
}

// For TXT files
async function extractTextFromTXT(filePath: string): Promise<string> {
  try {
    let text = await fs.readFile(filePath, 'utf-8');
    
    // Normalize line breaks and preserve paragraph structure
    text = text
      .replace(/\r\n/g, '\n')  // Normalize Windows line breaks
      .replace(/\r/g, '\n')    // Normalize Mac line breaks
      .replace(/\n{3,}/g, '\n\n') // Reduce excessive line breaks to double
      .trim();
    
    return text;
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
