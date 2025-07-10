import fs from 'fs/promises';
import path from 'path';

// For PDF processing - convert to properly formatted HTML
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const pdfParse = await import('pdf-parse');
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse.default(buffer);
    
    // Convert PDF text to HTML with proper paragraph structure
    let formattedText = data.text
      // Fix hyphenated words split across lines
      .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2')
      // Remove unwanted line breaks within sentences
      .replace(/([a-z,])\s*\n+\s*([a-z])/g, '$1 $2')
      // Clean excessive spaces
      .replace(/[ \t]+/g, ' ')
      // Remove page numbers and headers
      .replace(/^\s*\d+\s*$/gm, '')
      .replace(/^\s*[A-Z\s]{1,20}\s*$/gm, '')
      .trim();
    
    // Convert to HTML with proper paragraph structure
    const paragraphs = formattedText.split(/\n\s*\n/);
    
    let htmlContent = paragraphs
      .filter(para => para.trim().length > 0)
      .map(para => {
        const cleanPara = para.replace(/\n/g, ' ').trim();
        
        // Detect headings (all caps or short lines)
        if (cleanPara.length < 100 && (cleanPara === cleanPara.toUpperCase() || cleanPara.match(/^[A-Z][^.]*$/))) {
          return `<h2 style="font-size: 1.5em; font-weight: bold; margin: 1.5em 0 1em 0; text-align: center;">${cleanPara}</h2>`;
        }
        
        // Regular paragraphs
        return `<p style="margin-bottom: 1.2em; text-indent: 2em; text-align: justify; line-height: 1.6;">${cleanPara}</p>`;
      })
      .join('');
    
    return htmlContent;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to extract text from PDF: ${error}`);
  }
}

// For DOCX processing - preserve HTML formatting completely
async function extractTextFromDOCX(filePath: string): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const buffer = await fs.readFile(filePath);
    
    // Extract HTML to preserve ALL formatting
    const result = await mammoth.convertToHtml({ buffer });
    
    // Clean and enhance HTML while preserving structure
    let formattedHtml = result.value
      // Ensure paragraphs have proper styling
      .replace(/<p>/gi, '<p style="margin-bottom: 1.2em; text-indent: 2em; text-align: justify; line-height: 1.6;">')
      // Style headings appropriately
      .replace(/<h1>/gi, '<h1 style="font-size: 1.8em; font-weight: bold; margin: 1.5em 0 1em 0; text-align: center;">')
      .replace(/<h2>/gi, '<h2 style="font-size: 1.5em; font-weight: bold; margin: 1.3em 0 0.8em 0;">')
      .replace(/<h3>/gi, '<h3 style="font-size: 1.3em; font-weight: bold; margin: 1.2em 0 0.6em 0;">')
      // Style lists with proper indentation
      .replace(/<ul>/gi, '<ul style="margin: 1em 0; padding-left: 2em;">')
      .replace(/<ol>/gi, '<ol style="margin: 1em 0; padding-left: 2em;">')
      .replace(/<li>/gi, '<li style="margin-bottom: 0.5em;">')
      // Clean up entities but preserve HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      // Remove empty paragraphs
      .replace(/<p[^>]*>\s*<\/p>/gi, '')
      .trim();
    
    // Return HTML instead of plain text
    return formattedHtml;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error(`Failed to extract text from DOCX: ${error}`);
  }
}

// For TXT files - convert to HTML while preserving structure
async function extractTextFromTXT(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Convert text to HTML preserving paragraph structure
    const paragraphs = content.trim().split(/\n\s*\n/);
    
    const htmlContent = paragraphs
      .filter(para => para.trim().length > 0)
      .map(para => {
        const cleanPara = para.replace(/\n/g, ' ').trim();
        
        // Detect headings (lines that are short and don't end with punctuation)
        if (cleanPara.length < 100 && !cleanPara.match(/[.!?]$/)) {
          return `<h2 style="font-size: 1.5em; font-weight: bold; margin: 1.5em 0 1em 0;">${cleanPara}</h2>`;
        }
        
        // Regular paragraphs
        return `<p style="margin-bottom: 1.2em; text-indent: 2em; text-align: justify; line-height: 1.6;">${cleanPara}</p>`;
      })
      .join('');
    
    return htmlContent;
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
