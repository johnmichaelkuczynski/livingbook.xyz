import fs from 'fs/promises';
import path from 'path';

// For PDF processing - use PDF.js for proper structure extraction
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    // Use pdfjs-dist for better structure preservation
    const pdfjs = await import('pdfjs-dist');
    const buffer = await fs.readFile(filePath);
    
    // Load PDF document
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true
    }).promise;
    
    let fullText = '';
    
    // Extract text from each page with positioning info
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let pageText = '';
      let lastY = 0;
      
      for (const item of textContent.items) {
        if ('str' in item && 'transform' in item) {
          const currentY = item.transform[5];
          
          // Detect paragraph breaks based on vertical spacing
          if (lastY > 0 && Math.abs(lastY - currentY) > 15) {
            pageText += '\n\n';
          }
          
          pageText += item.str + ' ';
          lastY = currentY;
        }
      }
      
      fullText += pageText + '\n\n';
    }
    
    // Convert to proper HTML with paragraph structure
    const paragraphs = fullText.split(/\n\s*\n/);
    
    const htmlContent = paragraphs
      .filter(para => para.trim().length > 20) // Filter out short fragments
      .map(para => {
        const cleanPara = para.replace(/\s+/g, ' ').trim();
        
        // Detect headings based on length and capitalization
        if (cleanPara.length < 80 && (
          cleanPara === cleanPara.toUpperCase() || 
          cleanPara.match(/^[A-Z][^.]*$/) ||
          cleanPara.split(' ').length < 10
        )) {
          return `<h2 style="font-size: 1.4em; font-weight: bold; margin: 2em 0 1em 0; text-align: left;">${cleanPara}</h2>`;
        }
        
        // Regular paragraphs
        return `<p style="margin-bottom: 1.5em; text-indent: 1.5em; text-align: justify; line-height: 1.6;">${cleanPara}</p>`;
      })
      .join('');
    
    return htmlContent;
  } catch (error) {
    console.error('PDF.js parsing error:', error);
    // Fallback to pdf-parse if PDF.js fails
    const pdfParse = await import('pdf-parse');
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse.default(buffer);
    
    // Simple paragraph creation as fallback
    const sentences = data.text.match(/[^.!?]*[.!?]+/g) || [data.text];
    const paragraphs = [];
    
    for (let i = 0; i < sentences.length; i += 4) {
      const chunk = sentences.slice(i, i + 4).join(' ').trim();
      if (chunk.length > 0) {
        paragraphs.push(`<p style="margin-bottom: 1.5em; text-indent: 1.5em; text-align: justify; line-height: 1.6;">${chunk}</p>`);
      }
    }
    
    return paragraphs.join('');
  }
}

// For DOCX processing - preserve HTML formatting completely
async function extractTextFromDOCX(filePath: string): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const buffer = await fs.readFile(filePath);
    
    // Extract HTML to preserve ALL formatting
    const result = await mammoth.convertToHtml({ buffer });
    
    console.log('Raw mammoth output length:', result.value.length);
    console.log('Raw mammoth sample:', result.value.substring(0, 500));
    
    // Extract raw text if mammoth only gives us plain text
    let htmlContent = result.value;
    
    // If mammoth didn't generate proper HTML, create it from the text
    if (!htmlContent.includes('<p>') || htmlContent.replace(/<[^>]*>/g, '').length === htmlContent.length) {
      console.log('Converting plain text to HTML...');
      const plainText = htmlContent.replace(/<[^>]*>/g, '');
      const paragraphs = plainText.split(/\n\s*\n/);
      
      htmlContent = paragraphs
        .filter(para => para.trim().length > 10)
        .map(para => {
          const cleanPara = para.replace(/\s+/g, ' ').trim();
          
          // Detect headings
          if (cleanPara.length < 100 && !cleanPara.endsWith('.')) {
            return `<h2 style="font-size: 1.4em; font-weight: bold; margin: 2em 0 1em 0;">${cleanPara}</h2>`;
          }
          
          return `<p style="margin-bottom: 1.5em; text-indent: 1.5em; text-align: justify; line-height: 1.6;">${cleanPara}</p>`;
        })
        .join('');
    } else {
      // Clean and enhance existing HTML
      htmlContent = htmlContent
        // Remove invalid characters
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Style paragraphs
        .replace(/<p([^>]*)>/gi, '<p style="margin-bottom: 1.5em; text-indent: 1.5em; text-align: justify; line-height: 1.6;">')
        // Style headings
        .replace(/<h1([^>]*)>/gi, '<h1 style="font-size: 1.6em; font-weight: bold; margin: 2em 0 1em 0;">')
        .replace(/<h2([^>]*)>/gi, '<h2 style="font-size: 1.4em; font-weight: bold; margin: 1.8em 0 0.8em 0;">')
        .replace(/<h3([^>]*)>/gi, '<h3 style="font-size: 1.2em; font-weight: bold; margin: 1.5em 0 0.6em 0;">')
        // Style lists
        .replace(/<ul([^>]*)>/gi, '<ul style="margin: 1em 0; padding-left: 2em;">')
        .replace(/<ol([^>]*)>/gi, '<ol style="margin: 1em 0; padding-left: 2em;">')
        .replace(/<li([^>]*)>/gi, '<li style="margin-bottom: 0.5em;">')
        // Ensure bold/italic are preserved
        .replace(/<strong([^>]*)>/gi, '<strong style="font-weight: bold;">')
        .replace(/<em([^>]*)>/gi, '<em style="font-style: italic;">')
        .replace(/<b([^>]*)>/gi, '<b style="font-weight: bold;">')
        .replace(/<i([^>]*)>/gi, '<i style="font-style: italic;">')
        // Clean up entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
    }
    
    console.log('Final HTML length:', htmlContent.length);
    console.log('Final HTML sample:', htmlContent.substring(0, 500));
    
    return htmlContent;
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
