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
    
    // FORCE paragraph breaks every few sentences to create readable structure
    // Split text into sentences first
    const sentences = formattedText.match(/[^.!?]*[.!?]+[^.!?]*/g) || [formattedText];
    
    // Group sentences into paragraphs (every 3-4 sentences)
    const paragraphs = [];
    for (let i = 0; i < sentences.length; i += 3) {
      const paragraphText = sentences.slice(i, i + 3).join(' ').trim();
      if (paragraphText.length > 0) {
        paragraphs.push(paragraphText);
      }
    }
    
    let htmlContent = paragraphs
      .filter(para => para.trim().length > 0)
      .map(para => {
        const cleanPara = para.replace(/\s+/g, ' ').trim();
        
        // Detect headings (all caps or short lines)
        if (cleanPara.length < 100 && (cleanPara === cleanPara.toUpperCase() || cleanPara.match(/^[A-Z][^.]*$/))) {
          return `<h2 style="font-size: 1.5em; font-weight: bold; margin: 1.5em 0 1em 0; text-align: center;">${cleanPara}</h2>`;
        }
        
        // Regular paragraphs with forced spacing and clear breaks
        return `<p style="margin-bottom: 2em; text-indent: 2em; text-align: justify; line-height: 1.6; display: block; clear: both;">${cleanPara}</p>`;
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
    
    // If no proper HTML structure exists, force paragraph creation
    if (!result.value.includes('<p>') && !result.value.includes('<h1>') && !result.value.includes('<h2>')) {
      // Convert plain text to proper HTML paragraphs
      const paragraphs = result.value.split(/\n\s*\n/);
      result.value = paragraphs
        .filter(para => para.trim().length > 0)
        .map(para => `<p>${para.trim()}</p>`)
        .join('');
    }

    // Clean and enhance HTML while preserving structure
    let formattedHtml = result.value
      // Remove any invalid control characters that could cause parsing errors
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Ensure paragraphs have STRONG visual separation
      .replace(/<p>/gi, '<p style="margin-bottom: 2em; text-indent: 2em; text-align: justify; line-height: 1.6; display: block; clear: both;">')
      // Style headings appropriately with strong margins
      .replace(/<h1>/gi, '<h1 style="font-size: 1.8em; font-weight: bold; margin: 2em 0 1.5em 0; text-align: center; display: block;">')
      .replace(/<h2>/gi, '<h2 style="font-size: 1.5em; font-weight: bold; margin: 2em 0 1em 0; display: block;">')
      .replace(/<h3>/gi, '<h3 style="font-size: 1.3em; font-weight: bold; margin: 1.5em 0 0.8em 0; display: block;">')
      // Style lists with proper indentation and spacing
      .replace(/<ul>/gi, '<ul style="margin: 1.5em 0; padding-left: 2em; display: block;">')
      .replace(/<ol>/gi, '<ol style="margin: 1.5em 0; padding-left: 2em; display: block;">')
      .replace(/<li>/gi, '<li style="margin-bottom: 0.8em; display: list-item;">')
      // Preserve bold and italic formatting
      .replace(/<strong>/gi, '<strong style="font-weight: bold;">')
      .replace(/<em>/gi, '<em style="font-style: italic;">')
      .replace(/<b>/gi, '<b style="font-weight: bold;">')
      .replace(/<i>/gi, '<i style="font-style: italic;">')
      // Clean up entities but preserve HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      // Remove empty paragraphs
      .replace(/<p[^>]*>\s*<\/p>/gi, '')
      // Fix any potential malformed tags
      .replace(/<([^>]+)(?![>])/g, '<$1>')
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
    
    // Force paragraph breaks every few sentences for TXT files too
    const sentences = content.trim().match(/[^.!?]*[.!?]+[^.!?]*/g) || [content.trim()];
    
    // Group sentences into paragraphs (every 3-4 sentences)
    const paragraphs = [];
    for (let i = 0; i < sentences.length; i += 3) {
      const paragraphText = sentences.slice(i, i + 3).join(' ').trim();
      if (paragraphText.length > 0) {
        paragraphs.push(paragraphText);
      }
    }
    
    const htmlContent = paragraphs
      .filter(para => para.trim().length > 0)
      .map(para => {
        const cleanPara = para.replace(/\s+/g, ' ').trim();
        
        // Detect headings (lines that are short and don't end with punctuation)
        if (cleanPara.length < 100 && !cleanPara.match(/[.!?]$/)) {
          return `<h2 style="font-size: 1.5em; font-weight: bold; margin: 2em 0 1em 0; display: block;">${cleanPara}</h2>`;
        }
        
        // Regular paragraphs with strong visual separation
        return `<p style="margin-bottom: 2em; text-indent: 2em; text-align: justify; line-height: 1.6; display: block; clear: both;">${cleanPara}</p>`;
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
