import { generateChatResponse } from './deepseek.js';

export interface FormattingInstruction {
  instruction: string;
  type: 'natural_language' | 'preset';
}

export interface FormattingResult {
  formattedContent: string;
  appliedOperations: string[];
  success: boolean;
  error?: string;
}

// Common formatting operations
export const PRESET_OPERATIONS = {
  'fix_spacing': {
    name: 'Fix Spacing',
    description: 'Remove extra spaces and normalize whitespace',
    apply: (text: string) => text.replace(/\s+/g, ' ').replace(/\n\s*\n\s*\n/g, '\n\n').trim()
  },
  'indent_paragraphs': {
    name: 'Indent Paragraphs',
    description: 'Add indentation to the first line of each paragraph',
    apply: (text: string) => text.replace(/^(.+)$/gm, (match, line) => {
      if (line.trim() && !line.startsWith('    ')) {
        return '    ' + line;
      }
      return line;
    })
  },
  'center_title': {
    name: 'Center Title',
    description: 'Center the first line (title) of the document',
    apply: (text: string) => {
      const lines = text.split('\n');
      if (lines.length > 0) {
        const title = lines[0].trim();
        if (title) {
          lines[0] = title.padStart(Math.floor((80 + title.length) / 2));
        }
      }
      return lines.join('\n');
    }
  },
  'remove_double_breaks': {
    name: 'Remove Double Line Breaks',
    description: 'Replace multiple line breaks with single line breaks',
    apply: (text: string) => text.replace(/\n\n+/g, '\n')
  },
  'normalize_headers': {
    name: 'Normalize Headers',
    description: 'Format section headers consistently',
    apply: (text: string) => {
      return text.replace(/^(#{1,6})\s*(.+)$/gm, (match, hashes, content) => {
        return hashes + ' ' + content.trim();
      });
    }
  }
};

// Apply preset formatting operation
export function applyPresetOperation(text: string, operationKey: string): string {
  const operation = PRESET_OPERATIONS[operationKey as keyof typeof PRESET_OPERATIONS];
  if (!operation) {
    throw new Error(`Unknown preset operation: ${operationKey}`);
  }
  return operation.apply(text);
}

// Use AI to understand and apply natural language formatting instructions
export async function applyNaturalLanguageFormatting(
  text: string, 
  instruction: string
): Promise<FormattingResult> {
  try {
    const systemPrompt = `You are a document formatting assistant. Your task is to apply formatting instructions to text content.

Given the user's formatting instruction, modify the text accordingly. Common formatting operations include:
- Removing extra spaces or line breaks
- Indenting paragraphs
- Centering titles or headers
- Adjusting spacing between sections
- Normalizing punctuation
- Reformatting lists or bullet points
- Adjusting capitalization

IMPORTANT: Return ONLY the formatted text, nothing else. Do not add explanations, comments, or wrap the response in code blocks.

Original text:
"""
${text}
"""

Formatting instruction: "${instruction}"

Apply the formatting instruction and return the modified text:`;

    const response = await generateChatResponse(instruction, systemPrompt, []);
    
    if (response.error) {
      return {
        formattedContent: text,
        appliedOperations: [],
        success: false,
        error: response.error
      };
    }

    return {
      formattedContent: response.message.trim(),
      appliedOperations: [instruction],
      success: true
    };
  } catch (error) {
    return {
      formattedContent: text,
      appliedOperations: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Apply multiple formatting operations
export async function applyMultipleFormatting(
  text: string,
  instructions: FormattingInstruction[]
): Promise<FormattingResult> {
  let currentText = text;
  const appliedOperations: string[] = [];
  
  for (const instruction of instructions) {
    try {
      if (instruction.type === 'preset') {
        currentText = applyPresetOperation(currentText, instruction.instruction);
        const presetOp = PRESET_OPERATIONS[instruction.instruction as keyof typeof PRESET_OPERATIONS];
        appliedOperations.push(presetOp?.name || instruction.instruction);
      } else {
        const result = await applyNaturalLanguageFormatting(currentText, instruction.instruction);
        if (result.success) {
          currentText = result.formattedContent;
          appliedOperations.push(instruction.instruction);
        } else {
          return result;
        }
      }
    } catch (error) {
      return {
        formattedContent: currentText,
        appliedOperations,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  return {
    formattedContent: currentText,
    appliedOperations,
    success: true
  };
}

// Auto-apply common formatting fixes
export function autoFormat(text: string): string {
  let formatted = text;
  
  // Fix multiple spaces
  formatted = formatted.replace(/[ \t]+/g, ' ');
  
  // Fix multiple line breaks (keep maximum 2)
  formatted = formatted.replace(/\n\s*\n\s*\n+/g, '\n\n');
  
  // Remove trailing spaces
  formatted = formatted.replace(/[ \t]+$/gm, '');
  
  // Remove leading/trailing whitespace
  formatted = formatted.trim();
  
  return formatted;
}