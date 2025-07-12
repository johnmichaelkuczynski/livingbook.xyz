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
    console.log(`🤖 OPENAI SERVICE - Generating response for: "${userMessage.substring(0, 50)}..."`);
    
    const requestId = Math.random().toString(36).substring(2, 8);
    console.log(`🔑 OPENAI REQUEST ID: ${requestId}`);
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
      max_tokens: 4000,
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0]?.message?.content;
    
    if (!assistantMessage) {
      throw new Error("No response generated");
    }

    console.log(`✅ OPENAI RESPONSE (${requestId}): "${assistantMessage.substring(0, 100)}..."`);
    return { message: assistantMessage };
  } catch (error) {
    console.error("OpenAI API error:", error);
    return { 
      message: "I apologize, but I'm having trouble processing your request right now. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
