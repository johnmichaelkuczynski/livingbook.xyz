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

FORMATTING GUIDELINES FOR ALL RESPONSES:
- When creating study guides, use clear hierarchical structure with proper headings
- Use line breaks and paragraph spacing for readability
- For study guides: Create sections like "Overview", "Key Concepts", "Main Arguments", "Important Details"
- Use numbered or bulleted lists where appropriate
- Ensure professional academic formatting throughout
- Never use markdown symbols (**, ##, etc.) - use plain text with proper structure

CONTENT REQUIREMENTS:
- Provide comprehensive, detailed responses
- When asked for study guides, include: summaries, key points, important quotes, and analysis
- Maintain academic rigor and thoroughness
- Reference specific content from the uploaded document
- Structure information logically and systematically

Your responses should be publication-ready with perfect formatting and comprehensive content.` :
      `You are a professional academic writing assistant. You can assist with:

FORMATTING GUIDELINES FOR ALL RESPONSES:
- Use clear hierarchical structure with proper headings
- Use line breaks and paragraph spacing for readability
- Use numbered or bulleted lists where appropriate
- Ensure professional academic formatting throughout
- Never use markdown symbols (**, ##, etc.) - use plain text with proper structure

CONTENT REQUIREMENTS:
- Provide comprehensive, detailed responses
- Maintain academic rigor and thoroughness
- Structure information logically and systematically
- Your responses should be publication-ready with perfect formatting

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