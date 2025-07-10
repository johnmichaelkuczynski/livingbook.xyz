import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

interface WordDocumentOptions {
  title?: string;
  content: string;
  filename?: string;
  author?: string;
  description?: string;
}

// Function to clean markdown formatting from text
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
    .replace(/\*(.*?)\*/g, '$1')     // Remove italic markdown
    .replace(/#{1,6}\s+/g, '')       // Remove heading markers
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1') // Remove code blocks
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Remove links, keep text
    .replace(/^\s*[-*+]\s+/gm, '• ')  // Convert list markers to bullets
    .replace(/^\s*\d+\.\s+/gm, '')    // Remove numbered list markers
    .trim();
}

// Function to parse content into structured paragraphs
function parseContentToParagraphs(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split('\n');
  
  let currentParagraph = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Empty line indicates paragraph break
    if (line === '') {
      if (currentParagraph.trim()) {
        paragraphs.push(createParagraph(currentParagraph.trim()));
        currentParagraph = '';
      }
      continue;
    }
    
    // Check for headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      // Finish current paragraph if exists
      if (currentParagraph.trim()) {
        paragraphs.push(createParagraph(currentParagraph.trim()));
        currentParagraph = '';
      }
      
      // Create heading
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      paragraphs.push(createHeading(headingText, level));
      continue;
    }
    
    // Check for list items
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      // Finish current paragraph if exists
      if (currentParagraph.trim()) {
        paragraphs.push(createParagraph(currentParagraph.trim()));
        currentParagraph = '';
      }
      
      // Create list item
      const listText = listMatch[3];
      paragraphs.push(createListItem(listText));
      continue;
    }
    
    // Regular line - add to current paragraph
    if (currentParagraph) {
      currentParagraph += ' ' + line;
    } else {
      currentParagraph = line;
    }
  }
  
  // Add final paragraph if exists
  if (currentParagraph.trim()) {
    paragraphs.push(createParagraph(currentParagraph.trim()));
  }
  
  return paragraphs;
}

// Create a regular paragraph
function createParagraph(text: string, alignment: AlignmentType = AlignmentType.JUSTIFIED): Paragraph {
  const cleanText = cleanMarkdown(text);
  
  // Handle bold and italic formatting within the text
  const runs: TextRun[] = [];
  const parts = cleanText.split(/(\*\*.*?\*\*|\*.*?\*)/);
  
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Bold text
      runs.push(new TextRun({
        text: part.slice(2, -2),
        bold: true,
      }));
    } else if (part.startsWith('*') && part.endsWith('*')) {
      // Italic text
      runs.push(new TextRun({
        text: part.slice(1, -1),
        italics: true,
      }));
    } else if (part.trim()) {
      // Regular text
      runs.push(new TextRun({
        text: part,
      }));
    }
  }
  
  return new Paragraph({
    children: runs.length > 0 ? runs : [new TextRun(cleanText)],
    alignment,
    spacing: {
      after: 120, // 6pt spacing after paragraph
    },
    indent: {
      firstLine: 720, // 0.5 inch first line indent
    },
  });
}

// Create a heading
function createHeading(text: string, level: number): Paragraph {
  const cleanText = cleanMarkdown(text);
  
  const headingLevels = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ];
  
  return new Paragraph({
    children: [new TextRun({
      text: cleanText,
      bold: true,
      size: Math.max(20, 32 - (level * 2)), // Decreasing font size by level
    })],
    heading: headingLevels[Math.min(level - 1, 5)],
    alignment: level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: {
      before: level === 1 ? 240 : 200, // Extra space before headings
      after: 120,
    },
  });
}

// Create a list item
function createListItem(text: string): Paragraph {
  const cleanText = cleanMarkdown(text);
  
  return new Paragraph({
    children: [new TextRun({
      text: cleanText,
    })],
    bullet: {
      level: 0,
    },
    spacing: {
      after: 60, // Smaller spacing for list items
    },
    indent: {
      left: 720, // 0.5 inch left indent for list items
    },
  });
}

// Main function to generate and download Word document
export async function generateWordDocument(options: WordDocumentOptions): Promise<void> {
  const { title = 'Document', content, filename, author = 'DocMath AI', description } = options;
  
  try {
    // Create title paragraph
    const titleParagraph = new Paragraph({
      children: [new TextRun({
        text: title,
        bold: true,
        size: 32,
        color: '1a365d',
      })],
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 400, // 20pt spacing after title
      },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: 'e2e8f0',
        },
      },
    });
    
    // Parse content into structured paragraphs
    const contentParagraphs = parseContentToParagraphs(content);
    
    // Create document
    const doc = new Document({
      creator: author,
      title: title,
      description: description || `Generated document from ${author}`,
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              right: 1440,  // 1 inch
              bottom: 1440, // 1 inch
              left: 1440,   // 1 inch
            },
          },
        },
        children: [
          titleParagraph,
          ...contentParagraphs,
        ],
      }],
    });
    
    // Generate and download
    const blob = await Packer.toBlob(doc);
    const finalFilename = filename || `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
    
    saveAs(blob, finalFilename);
    
  } catch (error) {
    console.error('Error generating Word document:', error);
    throw new Error('Failed to generate Word document');
  }
}

// Helper function for AI response downloads
export async function downloadAIResponseAsWord(content: string, responseId: string | number, title?: string): Promise<void> {
  await generateWordDocument({
    title: title || 'AI Response',
    content,
    filename: `ai-response-${responseId}.docx`,
    author: 'DocMath AI',
    description: `AI-generated response from DocMath AI (ID: ${responseId})`,
  });
}

// Helper function for document chunk downloads
export async function downloadChunkAsWord(content: string, chunkId: string | number, documentTitle?: string): Promise<void> {
  await generateWordDocument({
    title: `${documentTitle || 'Document'} - Chunk ${chunkId}`,
    content,
    filename: `${documentTitle?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'document'}_chunk_${chunkId}.docx`,
    author: 'DocMath AI',
    description: `Document chunk ${chunkId} processed by DocMath AI`,
  });
}

// Helper function for rewritten content downloads
export async function downloadRewrittenContentAsWord(content: string, documentTitle?: string): Promise<void> {
  await generateWordDocument({
    title: `${documentTitle || 'Document'} - Rewritten`,
    content,
    filename: `${documentTitle?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'document'}_rewritten.docx`,
    author: 'DocMath AI',
    description: `Rewritten document content processed by DocMath AI`,
  });
}