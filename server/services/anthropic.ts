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
      `You are a helpful AI assistant. The user has uploaded a document with the following content:

"""
${documentContent}
"""

You can help with:
1. Questions about the document content
2. Mathematical concepts and equations
3. Writing essays, reports, and analyses
4. General academic and creative assistance
5. Any other requests the user may have

When the user asks about the document, refer to its content. For other requests, provide helpful and comprehensive responses.` :
      `You are a helpful AI assistant. You can assist with:
1. Writing essays, articles, and academic content
2. Mathematical problem solving and explanations
3. General knowledge questions
4. Creative writing and analysis
5. Research assistance
6. Any other tasks the user requests

Provide thorough, helpful responses to all user requests.`;

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
      max_tokens: 1000,
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