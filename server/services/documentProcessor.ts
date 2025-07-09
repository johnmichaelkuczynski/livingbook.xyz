import fs from 'fs/promises';
import path from 'path';

// For PDF processing
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    // Dynamic import to avoid module loading issues
    const pdfParse = await import('pdf-parse');
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse.default(buffer);
    
    // Aggressive PDF text formatting for proper paragraph structure
    let text = data.text;
    
    // First, normalize all line breaks and preserve existing structure
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    
    // Split into lines and process each line
    const lines = text.split('\n');
    const processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        // Empty line - preserve as paragraph break
        processedLines.push('');
        continue;
      }
      
      // Check if this is a heading (short line, title case, or numbered)
      const isHeading = line.length < 100 && 
        (line.match(/^\d+\.?\s+[A-Z]/) || // Numbered heading
         line.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]*){1,4}$/) || // Title case
         line.match(/^CHAPTER|^SECTION|^PART/i)); // Chapter markers
      
      if (isHeading) {
        processedLines.push('');
        processedLines.push(line);
        processedLines.push('');
        continue;
      }
      
      // Regular content line
      processedLines.push(line);
    }
    
    // Join back and create proper paragraphs
    text = processedLines.join('\n');
    
    // Additional paragraph detection based on sentence patterns
    text = text
      .replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2')  // Sentence end + capital = new paragraph
      .replace(/([a-z])\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]*){2,})\s+([A-Z])/g, '$1\n\n$2\n\n$3')  // Title case sequences
      .replace(/\n{3,}/g, '\n\n')  // Normalize multiple breaks to double
      .replace(/^\s+|\s+$/gm, '')  // Trim each line
      .replace(/([a-z])\s*\n\s*([a-z])/g, '$1 $2')  // Join word fragments within sentences
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
