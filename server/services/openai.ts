import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "sk-placeholder"
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

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      })),
      { role: "user", content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0]?.message?.content;
    
    if (!assistantMessage) {
      throw new Error("No response generated");
    }

    return { message: assistantMessage };
  } catch (error) {
    console.error("OpenAI API error:", error);
    return { 
      message: "I apologize, but I'm having trouble processing your request right now. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
