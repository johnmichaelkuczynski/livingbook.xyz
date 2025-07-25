import * as openaiService from "./openai";
import * as anthropicService from "./anthropic";
import * as deepseekService from "./deepseek";
import * as perplexityService from "./perplexity";

export interface PodcastScript {
  title: string;
  summary: string;
  strengthsWeaknesses: string;
  readerGains: string;
  quotations: string[];
  fullScript: string;
}

export async function generatePodcastScript(
  selectedText: string,
  documentTitle: string,
  provider: string = 'openai',
  customInstructions?: string
): Promise<{ script: PodcastScript; error?: string }> {
  try {
    console.log(`🎙️ PODCAST GENERATOR - Creating script for ${selectedText.length} characters`);
    console.log(`🎙️ PODCAST GENERATOR - Using provider: ${provider}`);

    const basePrompt = customInstructions || `You are creating a podcast-style analysis of a selected passage from "${documentTitle}". 

Selected passage:
"""
${selectedText}
"""

Create a comprehensive podcast script following this EXACT structure:

PODCAST TITLE: [Create an engaging title for this passage]

SUMMARY: [Provide a brief, clear summary of the selected passage in 2-3 sentences]

STRENGTHS AND WEAKNESSES: [Discuss the strengths and potential weaknesses or limitations of this passage - what does it do well, what might be unclear or problematic]

READER GAINS: [Explain what the reader can gain from this passage and what might be difficult or subtle to understand]

KEY QUOTATIONS: [Provide exactly 5 representative and high-quality quotations from the selected text, each on a new line starting with "Quote 1:", "Quote 2:", etc.]

FULL SCRIPT: [Write the complete podcast narration script that flows naturally and incorporates all the above elements into a cohesive, engaging spoken narrative suitable for audio]

CRITICAL REQUIREMENTS:
- Use clear section headers exactly as shown above
- Make the FULL SCRIPT section sound natural when spoken aloud
- Include all 5 quotations within the full script
- Structure for audio consumption, not reading
- Keep academic rigor while being accessible
- Total length should be 3-5 minutes when spoken (roughly 400-700 words for full script)`;

    const customPrompt = customInstructions ? `${customInstructions}

Selected passage:
"""
${selectedText}
"""

Please analyze this passage according to your custom instructions above.` : basePrompt;

    // Select AI service based on provider
    let generateChatResponse;
    switch (provider.toLowerCase()) {
      case 'openai':
        generateChatResponse = openaiService.generateChatResponse;
        break;
      case 'anthropic':
        generateChatResponse = anthropicService.generateChatResponse;
        break;
      case 'perplexity':
        generateChatResponse = perplexityService.generateChatResponse;
        break;
      case 'deepseek':
      default:
        generateChatResponse = deepseekService.generateChatResponse;
        break;
    }

    const aiResponse = await generateChatResponse(customPrompt, "", []);
    
    if (aiResponse.error) {
      return { script: {} as PodcastScript, error: aiResponse.error };
    }

    // Parse the structured response
    const script = parsePodcastResponse(aiResponse.message);
    console.log(`✅ PODCAST GENERATOR - Script generated successfully`);
    
    return { script };

  } catch (error) {
    console.error("Podcast generation error:", error);
    return {
      script: {} as PodcastScript,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

function parsePodcastResponse(response: string): PodcastScript {
  const sections = {
    title: extractSection(response, "PODCAST TITLE:", ["SUMMARY:", "STRENGTHS"]),
    summary: extractSection(response, "SUMMARY:", ["STRENGTHS AND WEAKNESSES:", "READER GAINS:"]),
    strengthsWeaknesses: extractSection(response, "STRENGTHS AND WEAKNESSES:", ["READER GAINS:", "KEY QUOTATIONS:"]),
    readerGains: extractSection(response, "READER GAINS:", ["KEY QUOTATIONS:", "FULL SCRIPT:"]),
    quotations: extractQuotations(response),
    fullScript: extractSection(response, "FULL SCRIPT:", [])
  };

  return {
    title: sections.title || "Podcast Analysis",
    summary: sections.summary || "Analysis of selected passage",
    strengthsWeaknesses: sections.strengthsWeaknesses || "Examining the passage's merits and limitations",
    readerGains: sections.readerGains || "Insights and understanding from this passage",
    quotations: sections.quotations,
    fullScript: sections.fullScript || response // Fallback to full response if parsing fails
  };
}

function extractSection(text: string, startMarker: string, endMarkers: string[]): string {
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) return "";

  const contentStart = startIndex + startMarker.length;
  let contentEnd = text.length;

  for (const endMarker of endMarkers) {
    const endIndex = text.indexOf(endMarker, contentStart);
    if (endIndex !== -1 && endIndex < contentEnd) {
      contentEnd = endIndex;
    }
  }

  return text.slice(contentStart, contentEnd).trim();
}

function extractQuotations(text: string): string[] {
  const quotations: string[] = [];
  const quotationSection = extractSection(text, "KEY QUOTATIONS:", ["FULL SCRIPT:"]);
  
  // Look for numbered quotes
  for (let i = 1; i <= 5; i++) {
    const quoteMarker = `Quote ${i}:`;
    const quoteIndex = quotationSection.indexOf(quoteMarker);
    if (quoteIndex !== -1) {
      const quoteStart = quoteIndex + quoteMarker.length;
      let quoteEnd = quotationSection.length;
      
      // Find the end of this quote (next quote or end of section)
      const nextQuoteMarker = `Quote ${i + 1}:`;
      const nextQuoteIndex = quotationSection.indexOf(nextQuoteMarker, quoteStart);
      if (nextQuoteIndex !== -1) {
        quoteEnd = nextQuoteIndex;
      }
      
      const quote = quotationSection.slice(quoteStart, quoteEnd).trim();
      if (quote) {
        quotations.push(quote);
      }
    }
  }
  
  return quotations;
}

export function truncateScriptForUnregistered(script: PodcastScript, maxWords: number = 100): PodcastScript {
  const truncateText = (text: string): string => {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '... [Full content available for registered users]';
  };

  return {
    ...script,
    summary: truncateText(script.summary),
    strengthsWeaknesses: truncateText(script.strengthsWeaknesses),
    readerGains: truncateText(script.readerGains),
    fullScript: truncateText(script.fullScript)
  };
}