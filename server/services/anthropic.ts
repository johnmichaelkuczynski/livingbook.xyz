import Anthropic from '@anthropic-ai/sdk';

// The newest Anthropic model is "claude-sonnet-4-20250514", not "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022" nor "claude-3-sonnet-20240229"
const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ChatResponse {
  message: string;
  error?: string;
}

export async function generateChatResponse(
  userMessage: string,
  documentContent: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<ChatResponse> {
  try {
    const systemPrompt = documentContent && documentContent.trim() ? 
      `You are a professional academic writing assistant specializing in document analysis and educational content creation. The user has uploaded a document with the following content:

"""
${documentContent}
"""

CRITICAL FORMATTING REQUIREMENTS:
- Use double line breaks between sections for proper paragraph separation
- Create clear section headings followed by detailed content
- For study guides, structure as follows:

TITLE OF STUDY GUIDE

Overview
[Detailed overview content with proper paragraphs]

Key Concepts  
[Detailed concepts with explanations]

Main Arguments
[Detailed arguments with analysis]

Important Details
[Specific details and examples]

FORMATTING RULES:
- Use clear section titles
- Separate all paragraphs with double line breaks
- Use proper sentence structure and academic language
- Never use markdown symbols (**, ##, etc.)
- Structure content with clear headings and detailed explanations
- Make responses comprehensive and thorough` :
      `You are a professional academic writing assistant. You can assist with:

CRITICAL FORMATTING REQUIREMENTS:
- Use double line breaks between all sections and paragraphs
- Create clear section headings 
- Structure all responses with proper paragraph separation
- Use comprehensive, detailed explanations
- Never use markdown symbols (**, ##, etc.)
- Make responses thorough and academically rigorous

You excel at: writing essays, academic analysis, mathematical explanations, research assistance, and creating structured educational content.`;

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ];

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL_STR,
      system: systemPrompt,
      max_tokens: 4000,
      temperature: 0.7,
      messages,
    });

    const assistantMessage = response.content[0]?.type === 'text' ? response.content[0].text : null;
    
    if (!assistantMessage) {
      throw new Error("No response generated");
    }

    return { message: assistantMessage };
  } catch (error) {
    console.error("Anthropic API error:", error);
    return { 
      message: "I apologize, but I'm having trouble processing your request right now. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}