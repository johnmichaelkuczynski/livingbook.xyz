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
    const systemPrompt = `You are an AI assistant specialized in helping users understand documents, especially those containing mathematical content. 

The user has uploaded a document with the following content:
"""
${documentContent}
"""

Your role is to:
1. Answer questions about the document content
2. Explain mathematical concepts and equations
3. Help solve problems mentioned in the document
4. Provide clear, educational responses
5. When discussing math, use proper mathematical notation in your responses

Always refer to the specific content in the document when answering questions. If the user asks about something not in the document, politely clarify that you're focused on helping with the uploaded document.`;

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