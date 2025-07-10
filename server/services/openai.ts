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

    return { message: assistantMessage };
  } catch (error) {
    console.error("OpenAI API error:", error);
    return { 
      message: "I apologize, but I'm having trouble processing your request right now. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
