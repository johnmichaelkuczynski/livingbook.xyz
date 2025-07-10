import fs from 'fs/promises';
import path from 'path';

// For PDF processing - preserve formatting and structure
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const pdfParse = await import('pdf-parse');
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse.default(buffer);
    
    // Preserve PDF structure with intelligent paragraph detection
    let formattedText = data.text
      // Fix broken words that span lines (common in PDFs)
      .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2')
      // Preserve intentional paragraph breaks (sentences ending with punctuation followed by line break)
      .replace(/([.!?:;])\s*\n\s*([A-Z])/g, '$1\n\n$2')
      // Convert single line breaks within sentences to spaces (removes unwanted PDF line breaks)
      .replace(/([a-z,])\s*\n\s*([a-z])/g, '$1 $2')
      // Clean up excessive whitespace but preserve paragraph structure
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      // Remove page numbers and headers (lines with just numbers or short text)
      .replace(/^\s*\d+\s*$/gm, '')
      .replace(/^\s*[A-Z\s]{2,20}\s*$/gm, '')
      // Preserve section breaks and clean up multiple line breaks
      .replace(/\n{4,}/g, '\n\n\n')
      .replace(/\n{2,3}/g, '\n\n')
      // Remove form feed characters
      .replace(/\f/g, '\n\n')
      .trim();
    
    return formattedText;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to extract text from PDF: ${error}`);
  }
}

// For DOCX processing - preserve formatting
async function extractTextFromDOCX(filePath: string): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const buffer = await fs.readFile(filePath);
    
    // Extract HTML to preserve formatting, then convert to formatted text
    const result = await mammoth.convertToHtml({ buffer });
    
    // Convert HTML to formatted text while preserving structure
    let formattedText = result.value
      // Convert headings to formatted text with line breaks
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
      // Convert paragraphs with proper spacing
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      // Convert line breaks
      .replace(/<br[^>]*>/gi, '\n')
      // Convert bold text (keep markers for emphasis)
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      // Convert italic text
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      // Convert lists with proper indentation
      .replace(/<ul[^>]*>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '\n')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Clean up entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      // Clean up excessive whitespace while preserving intentional spacing
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .trim();
    
    return formattedText;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error(`Failed to extract text from DOCX: ${error}`);
  }
}

// For TXT files - preserve all original formatting
async function extractTextFromTXT(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    // Return as-is to preserve all original formatting
    return content;
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
