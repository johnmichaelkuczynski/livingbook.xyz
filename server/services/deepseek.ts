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

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        max_tokens: 4000,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content;
    
    if (!assistantMessage) {
      throw new Error("No response generated");
    }

    return { message: assistantMessage };
  } catch (error) {
    console.error("DeepSeek API error:", error);
    return { 
      message: "I apologize, but I'm having trouble processing your request right now. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}