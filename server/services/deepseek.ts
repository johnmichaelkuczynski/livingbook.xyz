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