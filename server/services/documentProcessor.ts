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

// Preserve original math notation without modification
export function processMathNotation(text: string): string {
  // Return text as-is to preserve original formatting
  return text;
}
