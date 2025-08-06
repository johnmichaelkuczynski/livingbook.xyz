import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { storage } from "./storage";
import { extractTextFromDocument, processMathNotation } from "./services/documentProcessor";
import { chunkDocument } from "./services/documentChunker";
import * as openaiService from "./services/openai";
import * as anthropicService from "./services/anthropic";
import * as deepseekService from "./services/deepseek";
import * as perplexityService from "./services/perplexity";
import * as emailService from "./services/email";
import * as azureSpeechService from "./services/azureSpeech";

import { insertDocumentSchema, insertChatMessageSchema, insertComparisonSessionSchema, insertComparisonMessageSchema } from "@shared/schema";

// Helper function to clean markup symbols and metadata from AI responses
function removeMarkupSymbols(text: string): string {
  let cleaned = text
    .replace(/\*\*/g, '')     // Remove bold markdown
    .replace(/\*/g, '')       // Remove italic markdown
    .replace(/#{1,6}\s?/g, '') // Remove headers
    .replace(/`{1,3}/g, '')   // Remove code blocks
    .replace(/^\s*[-\*\+]\s+/gm, '') // Remove bullet points
    .replace(/^\s*\d+\.\s+/gm, '')   // Remove numbered lists
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links
    .replace(/^\s*>\s?/gm, '') // Remove blockquotes
    .replace(/\|/g, ' ')      // Remove table separators
    .replace(/---+/g, '')     // Remove horizontal rules
    .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
    .trim();

  // Remove common metadata patterns at the end of text
  cleaned = cleaned
    .replace(/\(.*continues.*\)$/gi, '') // Remove continuation notes
    .replace(/\(.*debate.*continues.*\)$/gi, '') // Remove debate continuation notes
    .replace(/\(.*reader.*to.*weigh.*\)$/gi, '') // Remove reader instruction notes
    .replace(/\(.*leaving.*reader.*\)$/gi, '') // Remove reader leaving notes
    .replace(/\(.*end.*of.*rewrite.*\)$/gi, '') // Remove rewrite end notes
    .replace(/\(.*note:.*\)$/gi, '') // Remove general notes
    .replace(/\(.*commentary.*\)$/gi, '') // Remove commentary notes
    .replace(/\(.*analysis.*\)$/gi, '') // Remove analysis notes
    .replace(/\s*\.\s*\)$/g, '.')  // Fix orphaned closing parentheses after periods
    .trim();

  return cleaned;
}

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for large documents
    fieldSize: 50 * 1024 * 1024, // 50MB field size limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload PDF, DOCX, or TXT files.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Create document from text content (AI response conversion)
  app.post("/api/documents/create-from-text", async (req, res) => {
    try {
      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      // Process the text content like we do with uploaded documents
      const processedContent = processMathNotation(content);
      
      // Calculate word count
      const totalWords = processedContent.split(/\s+/).filter(word => word.length > 0).length;
      
      // Create document entry
      const documentData = {
        originalName: title,
        filename: `text_input_${Date.now()}.txt`,
        content: processedContent,
        fileType: 'text/plain',
        fileSize: content.length,
        totalWords: totalWords
      };
      
      const validatedDocument = insertDocumentSchema.parse(documentData);
      const document = await storage.createDocument(validatedDocument);
      
      res.json(document);
      
    } catch (error) {
      console.error("Create document error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to create document" 
      });
    }
  });

  // Upload document (main route) - keeping legacy /api/upload for compatibility
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { originalname, filename, mimetype, size, path: filePath } = req.file;
      
      // Extract text from the document with detailed error handling
      let extractedText = '';
      try {
        extractedText = await extractTextFromDocument(filePath, mimetype);
        
        // Check if we got meaningful content
        if (!extractedText || extractedText.trim().length < 10) {
          throw new Error('No readable text could be extracted from this document');
        }
        
        console.log('Document processing successful, extracted text length:', extractedText.length);
        
      } catch (extractionError) {
        console.error('Document extraction error:', extractionError);
        
        // For PDFs, provide specific error message
        if (mimetype === 'application/pdf') {
          throw new Error('This PDF file could not be processed. It may be corrupted, password-protected, or use an unsupported format. Please try a different PDF or convert it to Word/text format.');
        }
        
        // For other file types
        throw new Error(`Failed to process ${originalname}: ${extractionError instanceof Error ? extractionError.message : 'Unknown error'}`);
      }
      
      // Process math notation
      extractedText = processMathNotation(extractedText);
      
      // Save document to storage
      const documentData = {
        filename,
        originalName: originalname,
        fileType: mimetype,
        fileSize: size,
        content: extractedText,
        totalWords: extractedText.split(/\s+/).filter(word => word.length > 0).length
      };
      

      const validatedData = insertDocumentSchema.parse(documentData);
      const document = await storage.createDocument(validatedData);
      
      // Create a chat session for this document
      await storage.createChatSession({ documentId: document.id });
      
      // Clean up uploaded file
      await fs.unlink(filePath);
      
      res.json({
        id: document.id,
        originalName: document.originalName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        content: document.content,
        uploadedAt: document.uploadedAt
      });
      
    } catch (error) {
      console.error("Upload error:", error);
      
      // Clean up file if it exists
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error("Error cleaning up file:", unlinkError);
        }
      }
      
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to process document" 
      });
    }
  });



  // Get document by ID
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get document" 
      });
    }
  });

  // Update document content
  app.put("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      const existingDocument = await storage.getDocument(id);
      if (!existingDocument) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Update the document with new content
      const updatedDocument = await storage.updateDocument(id, { content });
      
      res.json(updatedDocument);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to update document" 
      });
    }
  });

  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get documents" 
      });
    }
  });

  // Format text using AI
  app.post("/api/format-text", async (req, res) => {
    try {
      const { content, instruction } = req.body;
      
      if (!content || !instruction) {
        return res.status(400).json({ error: "Content and instruction are required" });
      }

      // Use OpenAI to format the text according to instructions
      const { generateChatResponse } = await import('./services/openai');
      
      const formatPrompt = `You are a text formatting assistant. Apply the following formatting instruction to the provided text:

Instruction: "${instruction}"

Original text:
"""
${content}
"""

Return only the formatted text without any explanations or markdown formatting. Preserve the overall structure and meaning while applying the requested formatting changes.`;

      const response = await generateChatResponse(formatPrompt, '', []);
      
      res.json({ formattedContent: response.message });
    } catch (error) {
      console.error("Format text error:", error);
      res.status(500).json({ error: "Failed to format text" });
    }
  });

  // Rewrite text chunk
  app.post("/api/rewrite-chunk", async (req, res) => {
    try {
      const { chunkText, instructions, provider = 'deepseek' } = req.body;
      
      if (!chunkText || !instructions) {
        return res.status(400).json({ error: "Chunk text and instructions are required" });
      }

      const rewritePrompt = `You are tasked with rewriting the following text according to the user's instructions. Follow the instructions precisely while maintaining the original meaning and important information.

User Instructions: ${instructions}

Original Text:
"""
${chunkText}
"""

Please rewrite the text according to the instructions. Return only the rewritten text without any explanations, quotation marks, or markdown formatting.`;

      let response;
      switch (provider) {
        case 'openai':
          response = await import('./services/openai').then(m => m.generateChatResponse(rewritePrompt, '', []));
          break;
        case 'anthropic':
          response = await import('./services/anthropic').then(m => m.generateChatResponse(rewritePrompt, '', []));
          break;
        case 'perplexity':
          response = await import('./services/perplexity').then(m => m.generateChatResponse(rewritePrompt, '', []));
          break;
        default:
          response = await import('./services/deepseek').then(m => m.generateChatResponse(rewritePrompt, '', []));
      }
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Clean the response of any markdown formatting
      const cleanedText = removeMarkupSymbols(response.message);
      
      res.json({ rewrittenText: cleanedText });
    } catch (error) {
      console.error("Rewrite chunk error:", error);
      res.status(500).json({ error: "Failed to rewrite chunk" });
    }
  });

  // Export document
  app.post("/api/export-document", async (req, res) => {
    try {
      const { content, format, title } = req.body;
      
      if (!content || !format) {
        return res.status(400).json({ error: "Content and format are required" });
      }

      if (format === 'pdf') {
        // Enhanced PDF export with KaTeX math rendering
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${title || 'AI Response'}</title>
            <meta charset="utf-8">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
            <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
            <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
            <style>
              @page { 
                margin: 1in; 
                size: letter;
              }
              body { 
                font-family: 'Times New Roman', serif; 
                line-height: 1.8; 
                margin: 0; 
                padding: 20px;
                color: #333;
                font-size: 12pt;
              }
              .header { 
                text-align: center; 
                font-size: 18pt; 
                font-weight: bold; 
                margin-bottom: 30px; 
                color: #1a365d;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 15px;
              }
              .content { 
                text-align: justify; 
                line-height: 1.8;
                font-size: 11pt;
                word-wrap: break-word;
                hyphens: auto;
              }
              .math { 
                margin: 10px 0; 
              }
              .katex { 
                font-size: 1.1em; 
              }
              h1, h2, h3, h4, h5, h6 {
                color: #2d3748;
                margin-top: 20px;
                margin-bottom: 10px;
              }
              p { 
                margin-bottom: 15px; 
                text-indent: 1.5em;
                text-align: justify;
                line-height: 1.8;
              }
              ul, ol { 
                margin: 10px 0; 
                padding-left: 30px; 
              }
              li { 
                margin-bottom: 5px; 
              }
              .highlight {
                background-color: #fff3cd;
                padding: 2px 4px;
                border-radius: 3px;
              }
            </style>
          </head>
          <body>
            <div class="header">${title || 'AI Response'}</div>
            <div class="content">
              ${content}
            </div>
            <script>
              document.addEventListener("DOMContentLoaded", function() {
                renderMathInElement(document.body, {
                  delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "$", right: "$", display: false},
                    {left: "\\\\(", right: "\\\\)", display: false},
                    {left: "\\\\[", right: "\\\\]", display: true}
                  ],
                  throwOnError: false,
                  errorColor: '#cc0000',
                  strict: false,
                  trust: false,
                  macros: {
                    "\\\\f": "#1f(#2)"
                  }
                });
              });
            </script>
          </body>
          </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="${title || 'document'}.html"`);
        res.send(htmlContent);
      } else if (format === 'word') {
        // Simple Word document export
        const wordContent = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" 
                xmlns:w="urn:schemas-microsoft-com:office:word" 
                xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <title>${title || 'Document'}</title>
            <!--[if gte mso 9]>
            <xml>
              <w:WordDocument>
                <w:View>Print</w:View>
                <w:WrapTrailSpaces/>
                <w:ValidateAgainstSchemas/>
                <w:SaveIfXMLInvalid>false</w:SaveIfXMLInvalid>
                <w:IgnoreMixedContent>false</w:IgnoreMixedContent>
                <w:AlwaysShowPlaceholderText>false</w:AlwaysShowPlaceholderText>
                <w:DoNotPromoteQF/>
                <w:LidThemeOther>EN-US</w:LidThemeOther>
                <w:LidThemeAsian>X-NONE</w:LidThemeAsian>
                <w:LidThemeComplexScript>X-NONE</w:LidThemeComplexScript>
                <w:Compatibility>
                  <w:BreakWrappedTables/>
                  <w:SnapToGridInCell/>
                  <w:WrapTextWithPunct/>
                  <w:UseAsianBreakRules/>
                  <w:DontGrowAutofit/>
                </w:Compatibility>
                <w:BrowserLevel>MicrosoftInternetExplorer4</w:BrowserLevel>
              </w:WordDocument>
            </xml>
            <![endif]-->
            <style>
              @page { margin: 1in; }
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              .title { text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 20pt; }
              .content { white-space: pre-wrap; font-size: 12pt; }
            </style>
          </head>
          <body>
            <div class="title">${title || 'Document'}</div>
            <div class="content">${content}</div>
          </body>
          </html>
        `;
        
        res.setHeader('Content-Type', 'application/vnd.ms-word');
        res.setHeader('Content-Disposition', `attachment; filename="${title || 'document'}.doc"`);
        res.send(wordContent);
      } else {
        res.status(400).json({ error: "Unsupported format" });
      }
    } catch (error) {
      console.error("Export document error:", error);
      res.status(500).json({ error: "Failed to export document" });
    }
  });

  // Generate study guide for selected text
  app.post("/api/study-guide", async (req, res) => {
    try {
      const { selectedText, documentTitle, provider = 'openai' } = req.body;
      
      if (!selectedText) {
        return res.status(400).json({ error: "Selected text is required" });
      }

      const studyGuidePrompt = `Generate a study guide based on the selected passage. The study guide should include:

A short summary of the main ideas.

Key terms and definitions.

Important questions a student should be able to answer after reading.

Any relevant examples or analogies that help explain the content.

Keep it clear, concise, and pedagogically useful.

Selected passage from "${documentTitle}":
"""
${selectedText}
"""`;

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
      
      // Generate study guide
      const aiResponse = await generateChatResponse(
        studyGuidePrompt,
        selectedText,
        []
      );
      
      if (aiResponse.error) {
        return res.status(500).json({ error: aiResponse.error });
      }

      res.json({
        studyGuide: aiResponse.message
      });
      
    } catch (error) {
      console.error("Study guide generation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate study guide" 
      });
    }
  });

  // Generate test for selected text
  app.post("/api/test-me", async (req, res) => {
    try {
      const { selectedText, documentTitle, provider = 'openai' } = req.body;
      
      if (!selectedText) {
        return res.status(400).json({ error: "Selected text is required" });
      }

      const testPrompt = `Generate a structured test based on the selected passage. Return ONLY a valid JSON object with the following format:

{
  "title": "Test Title",
  "multipleChoice": [
    {
      "question": "Question text?",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "correctAnswer": 1
    }
  ],
  "shortAnswer": [
    {
      "question": "Question text?",
      "sampleAnswer": "A good answer would include..."
    }
  ]
}

Requirements:
- 3-5 multiple-choice questions with 4 options each
- correctAnswer is the index (0-3) of the correct option
- 2 short-answer questions with sample answers for grading
- Focus on comprehension, inference, and application
- Avoid trivia or superficial recall

Selected passage from "${documentTitle}":
"""
${selectedText}
"""

Return ONLY the JSON object, no other text.`;

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
      
      // Generate test
      const aiResponse = await generateChatResponse(
        testPrompt,
        selectedText,
        []
      );
      
      if (aiResponse.error) {
        return res.status(500).json({ error: aiResponse.error });
      }

      // Parse JSON response
      let testData;
      try {
        const cleanedResponse = aiResponse.message.replace(/```json\n?|\n?```/g, '').trim();
        testData = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('Failed to parse test JSON:', parseError);
        return res.status(500).json({ error: "Failed to generate valid test format" });
      }

      res.json({ test: testData });
      
    } catch (error) {
      console.error("Test generation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate test" 
      });
    }
  });

  // Complete podcast generation endpoint - generates dialogue AND audio in one call
  app.post("/api/generate-podcast", async (req, res) => {
    try {
      const { selectedText, documentTitle, provider = 'deepseek', type, prompt, voiceOptions } = req.body;

      if (!selectedText?.trim()) {
        return res.status(400).json({ error: 'Selected text is required' });
      }

      console.log(`🎙️ GENERATING COMPLETE PODCAST - Type: ${type}, Provider: ${provider}`);

      // Step 1: Generate dialogue using the appropriate AI service
      let chatResponse;
      switch (provider) {
        case 'openai':
          chatResponse = await openaiService.generateChatResponse(prompt, selectedText, []);
          break;
        case 'deepseek':
          chatResponse = await deepseekService.generateChatResponse(prompt, selectedText, []);
          break;
        case 'anthropic':
          chatResponse = await anthropicService.generateChatResponse(prompt, selectedText, []);
          break;
        case 'perplexity':
          chatResponse = await perplexityService.generateChatResponse(prompt, selectedText, []);
          break;
        default:
          chatResponse = await deepseekService.generateChatResponse(prompt, selectedText, []);
      }
      
      if (chatResponse.error) {
        return res.status(500).json({ error: chatResponse.error });
      }

      const dialogue = chatResponse.message;
      console.log(`✅ PODCAST DIALOGUE GENERATED - Type: ${type}, Length: ${dialogue.length} chars`);

      // Step 2: Generate audio using Azure Speech Services
      console.log(`🎤 GENERATING REAL PODCAST AUDIO - Type: ${type}`);
      
      try {
        const azureTTSSimple = await import('./services/azureTTSSimple');
        console.log('📦 Azure TTS module imported successfully');
        
        const audioBuffer = await azureTTSSimple.generateDialogueAudio(dialogue);
        console.log(`🎵 REAL PODCAST AUDIO GENERATED - Size: ${audioBuffer.length} bytes`);

        // Set appropriate headers for MP3 audio download
        res.set({
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.length.toString(),
          'Content-Disposition': `attachment; filename="podcast-${type}-${Date.now()}.mp3"`
        });

        res.send(audioBuffer);
        return; // Important: return here to prevent fallback
        
      } catch (audioError: any) {
        console.error('❌ Audio generation failed:', audioError);
        console.error('❌ Error details:', audioError?.message || 'Unknown error');
        
        // Fallback to text script if audio fails
        const podcastScript = `Podcast Type: ${type}\n\nDialogue:\n${dialogue}\n\n[Audio generation failed: ${audioError?.message || 'Unknown error'}]`;
        
        res.set({
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="podcast-script-${type}-${Date.now()}.txt"`
        });

        res.send(podcastScript);
      }

    } catch (error) {
      console.error('Error generating complete podcast:', error);
      res.status(500).json({ error: 'Failed to generate podcast' });
    }
  });

  // Generate podcast audio using Azure Speech Services
  app.post("/api/podcast-audio", async (req, res) => {
    try {
      const { dialogue, voiceOptions } = req.body;

      if (!dialogue?.trim()) {
        return res.status(400).json({ error: 'Dialogue text is required' });
      }

      console.log(`🎤 GENERATING PODCAST AUDIO - Length: ${dialogue.length} chars`);

      // Default voice configuration
      const speakerVoices = {
        speaker1: voiceOptions?.speaker1 || 'en-US-DavisNeural',
        speaker2: voiceOptions?.speaker2 || 'en-US-JennyNeural'
      };

      // Generate audio using Azure Speech Services
      const audioBuffer = await azureSpeechService.generatePodcastAudio(dialogue, speakerVoices);
      
      console.log(`✅ PODCAST AUDIO GENERATED - Size: ${audioBuffer.length} bytes`);

      // Set appropriate headers for MP3 audio
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Content-Disposition': 'attachment; filename="podcast.mp3"'
      });

      res.send(audioBuffer);

    } catch (error) {
      console.error('Error generating podcast audio:', error);
      res.status(500).json({ error: 'Failed to generate podcast audio' });
    }
  });

  // Grade test submission
  app.post("/api/grade-test", async (req, res) => {
    try {
      const { selectedText, testData, userAnswers, provider = 'openai' } = req.body;
      
      if (!selectedText || !testData || !userAnswers) {
        return res.status(400).json({ error: "Missing required data for grading" });
      }

      // Calculate multiple choice score
      let mcScore = 0;
      const mcTotal = testData.multipleChoice.length;
      
      testData.multipleChoice.forEach((question: any, index: number) => {
        if (userAnswers.multipleChoice[index] === question.correctAnswer) {
          mcScore++;
        }
      });

      // Grade short answers using AI
      const gradingPrompt = `Grade the following short answer responses based on the original passage and sample answers. Provide a score out of 10 for each answer and detailed feedback.

Original passage:
"""
${selectedText}
"""

Questions and responses to grade:
${testData.shortAnswer.map((q: any, i: number) => `
Question ${i + 1}: ${q.question}
Sample answer: ${q.sampleAnswer}
Student answer: ${userAnswers.shortAnswer[i] || 'No answer provided'}
`).join('\n')}

Return ONLY a JSON object with this format:
{
  "shortAnswerGrades": [
    {
      "score": 8,
      "feedback": "Detailed feedback on the answer..."
    }
  ],
  "overallFeedback": "General comments on performance..."
}`;

      // Select AI service for grading
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
      
      const gradingResponse = await generateChatResponse(
        gradingPrompt,
        selectedText,
        []
      );
      
      if (gradingResponse.error) {
        return res.status(500).json({ error: gradingResponse.error });
      }

      // Parse grading response
      let gradingData;
      try {
        const cleanedResponse = gradingResponse.message.replace(/```json\n?|\n?```/g, '').trim();
        gradingData = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('Failed to parse grading JSON:', parseError);
        return res.status(500).json({ error: "Failed to process grading" });
      }

      // Calculate total score
      const saTotal = testData.shortAnswer.length * 10;
      const saScore = gradingData.shortAnswerGrades.reduce((sum: number, grade: any) => sum + grade.score, 0);
      
      const totalScore = mcScore + saScore;
      const totalPossible = mcTotal + saTotal;
      const percentage = Math.round((totalScore / totalPossible) * 100);

      res.json({
        multipleChoiceScore: mcScore,
        multipleChoiceTotal: mcTotal,
        shortAnswerScore: saScore,
        shortAnswerTotal: saTotal,
        totalScore: totalScore,
        totalPossible: totalPossible,
        percentage: percentage,
        gradingData: gradingData
      });
      
    } catch (error) {
      console.error("Test grading error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to grade test" 
      });
    }
  });

  // Send chat message about selected text
  app.post("/api/chat/selection", async (req, res) => {
    try {
      const { message, selectedText, documentTitle, provider = 'openai', conversationHistory = [] } = req.body;
      
      if (!message || !selectedText) {
        return res.status(400).json({ error: "Message and selectedText are required" });
      }

      // Create context prompt with selected text
      const contextPrompt = `You are analyzing selected text from a document titled "${documentTitle}". Here is the selected text:

"${selectedText}"

User question: ${message}

Please provide a helpful response based on the selected text. Keep your response clear and focused on the specific text selection.`;

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
      
      // Generate AI response with selected text context
      const aiResponse = await generateChatResponse(
        contextPrompt,
        selectedText, // Pass selected text as document content
        conversationHistory
      );
      
      if (aiResponse.error) {
        return res.status(500).json({ error: aiResponse.error });
      }

      // Clean the response of any markdown formatting
      const cleanedMessage = removeMarkupSymbols(aiResponse.message);
      
      res.json({
        message: cleanedMessage
      });
      
    } catch (error) {
      console.error("Selection chat error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to process selection chat" 
      });
    }
  });

  // Send chat message without document
  app.post("/api/chat/message", async (req, res) => {
    try {
      const { message, provider = 'deepseek' } = req.body;
      
      console.log(`🔍 PROVIDER DEBUG - Global Chat: Provider received: "${provider}"`);
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get or create a global chat session (documentId 0 for no document)
      let session = await storage.getChatSessionByDocumentId(0);
      if (!session) {
        session = await storage.createChatSession({ documentId: 0 });
      }

      // Get conversation history
      const messages = await storage.getChatMessages(session.id);
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Save user message
      const userMessageData = {
        sessionId: session.id,
        role: "user",
        content: message
      };
      const validatedUserMessage = insertChatMessageSchema.parse(userMessageData);
      await storage.createChatMessage(validatedUserMessage);

      // Select AI service based on provider
      let generateChatResponse;
      switch (provider.toLowerCase()) {
        case 'openai':
          console.log(`✅ PROVIDER DEBUG - Global Chat Using OpenAI service`);
          generateChatResponse = openaiService.generateChatResponse;
          break;
        case 'anthropic':
          console.log(`✅ PROVIDER DEBUG - Global Chat Using Anthropic service`);
          generateChatResponse = anthropicService.generateChatResponse;
          break;
        case 'perplexity':
          console.log(`✅ PROVIDER DEBUG - Global Chat Using Perplexity service`);
          generateChatResponse = perplexityService.generateChatResponse;
          break;
        case 'deepseek':
        default:
          console.log(`✅ PROVIDER DEBUG - Global Chat Using DeepSeek service (provider: ${provider})`);
          generateChatResponse = deepseekService.generateChatResponse;
          break;
      }
      
      // Generate AI response without document context
      const aiResponse = await generateChatResponse(
        message,
        "", // No document content
        conversationHistory
      );
      
      if (aiResponse.error) {
        return res.status(500).json({ error: aiResponse.error });
      }

      // Clean AI response of markup symbols
      const cleanedResponse = removeMarkupSymbols(aiResponse.message);
      
      // Save AI response
      const aiMessageData = {
        sessionId: session.id,
        role: "assistant",
        content: cleanedResponse
      };
      const validatedAiMessage = insertChatMessageSchema.parse(aiMessageData);
      const savedAiMessage = await storage.createChatMessage(validatedAiMessage);
      
      res.json({
        id: savedAiMessage.id,
        role: savedAiMessage.role,
        content: savedAiMessage.content,
        timestamp: savedAiMessage.timestamp
      });
      
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to process chat message" 
      });
    }
  });

  // Send chat message with document
  app.post("/api/chat/:documentId/message", async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const { message, provider = 'deepseek', selectedText } = req.body;
    
    console.log('🔍 REQUEST BODY DEBUG:', {
      message: message ? `"${message.substring(0, 50)}..."` : 'null',
      provider,
      selectedText: selectedText ? `"${selectedText.substring(0, 100)}..."` : 'null'
    });
      
      console.log(`🔍 PROVIDER DEBUG - Document Chat: Provider received: "${provider}"`);
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      // Get document
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Get or create chat session
      let session = await storage.getChatSessionByDocumentId(documentId);
      if (!session) {
        session = await storage.createChatSession({ documentId });
      }
      
      // Get conversation history
      const messages = await storage.getChatMessages(session.id);
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Save user message
      const userMessageData = {
        sessionId: session.id,
        role: "user",
        content: message
      };
      const validatedUserMessage = insertChatMessageSchema.parse(userMessageData);
      await storage.createChatMessage(validatedUserMessage);
      
      // Select AI service based on provider
      let generateChatResponse;
      switch (provider.toLowerCase()) {
        case 'openai':
          console.log(`✅ PROVIDER DEBUG - Document Chat Using OpenAI service`);
          generateChatResponse = openaiService.generateChatResponse;
          break;
        case 'anthropic':
          console.log(`✅ PROVIDER DEBUG - Document Chat Using Anthropic service`);
          generateChatResponse = anthropicService.generateChatResponse;
          break;
        case 'perplexity':
          console.log(`✅ PROVIDER DEBUG - Document Chat Using Perplexity service`);
          generateChatResponse = perplexityService.generateChatResponse;
          break;
        case 'deepseek':
        default:
          console.log(`✅ PROVIDER DEBUG - Document Chat Using DeepSeek service (provider: ${provider})`);
          generateChatResponse = deepseekService.generateChatResponse;
          break;
      }
      
      // Truncate document content if too large to fit in context window
      const maxContentLength = 50000; // Roughly 12,500 tokens at 4 chars per token
      let documentContent = document.content;
      
      if (document.content.length > maxContentLength) {
        // For large documents, take the first portion and add a note
        documentContent = document.content.substring(0, maxContentLength) + 
          `\n\n[Note: Document is ${document.content.length} characters. Only first ${maxContentLength} characters shown. For specific sections, please ask the user to use the chunked document view or ask about specific topics.]`;
      }
      
      // Debug logging for selected text
      console.log('🔍 SELECTED TEXT DEBUG:', selectedText ? `"${selectedText.substring(0, 200)}..."` : 'null');
      
      // Prepare message with selected text context if provided
      let contextualMessage = message;
      let contextualDocumentContent = documentContent;
      
      if (selectedText && selectedText.trim()) {
        console.log('✅ ADDING SELECTED TEXT CONTEXT TO MESSAGE');
        // Replace the document content with ONLY the selected text
        contextualDocumentContent = selectedText;
        contextualMessage = `${message}

CONTEXT: The user has selected a specific passage from their document. Answer their question based ONLY on this selected text below, do not reference the full document:

"${selectedText}"`;
      } else {
        console.log('❌ NO SELECTED TEXT - using regular message');
      }

      // Generate AI response
      const aiResponse = await generateChatResponse(
        contextualMessage,
        contextualDocumentContent,
        conversationHistory
      );
      
      if (aiResponse.error) {
        return res.status(500).json({ error: aiResponse.error });
      }
      
      // Clean AI response of markup symbols
      const cleanedResponse = removeMarkupSymbols(aiResponse.message);
      
      // Save AI response
      const aiMessageData = {
        sessionId: session.id,
        role: "assistant",
        content: cleanedResponse
      };
      const validatedAiMessage = insertChatMessageSchema.parse(aiMessageData);
      const savedAiMessage = await storage.createChatMessage(validatedAiMessage);
      
      res.json({
        id: savedAiMessage.id,
        role: savedAiMessage.role,
        content: savedAiMessage.content,
        timestamp: savedAiMessage.timestamp
      });
      
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to process chat message" 
      });
    }
  });

  // Get chat messages for a document
  app.get("/api/chat/:documentId/messages", async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      
      const session = await storage.getChatSessionByDocumentId(documentId);
      if (!session) {
        return res.json([]);
      }
      
      const messages = await storage.getChatMessages(session.id);
      res.json(messages);
      
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get chat messages" 
      });
    }
  });

  // Get global chat messages (no document)
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const session = await storage.getChatSessionByDocumentId(0);
      if (!session) {
        return res.json([]);
      }
      
      const messages = await storage.getChatMessages(session.id);
      res.json(messages);
      
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get chat messages" 
      });
    }
  });

  // Rewrite text using AI
  app.post("/api/rewrite", async (req, res) => {
    try {
      const { text, instructions, provider = 'deepseek' } = req.body;
      
      if (!text || !instructions) {
        return res.status(400).json({ error: "Text and instructions are required" });
      }
      
      // Create a prompt for rewriting
      const rewritePrompt = `Please rewrite the following text according to these instructions: ${instructions}

Original text:
${text}

IMPORTANT: Provide ONLY the rewritten text. Do not include any commentary, explanations, metadata, notes, or additional remarks. Do not add phrases like "Here is the rewritten text:" or any conclusion statements. Return only the pure rewritten content.`;

      let aiResponse;
      switch (provider) {
        case 'openai':
          aiResponse = await openaiService.generateChatResponse(rewritePrompt, "", []);
          break;
        case 'anthropic':
          aiResponse = await anthropicService.generateChatResponse(rewritePrompt, "", []);
          break;
        case 'perplexity':
          aiResponse = await perplexityService.generateChatResponse(rewritePrompt, "", []);
          break;
        case 'deepseek':
        default:
          aiResponse = await deepseekService.generateChatResponse(rewritePrompt, "", []);
          break;
      }
      
      if (aiResponse.error) {
        return res.status(500).json({ error: aiResponse.error });
      }

      // Clean up markup symbols from the AI response
      const cleanedText = removeMarkupSymbols(aiResponse.message);
      
      res.json({ 
        rewrittenText: cleanedText,
        provider: provider,
        originalLength: text.length,
        rewrittenLength: cleanedText.length
      });
      
    } catch (error) {
      console.error("Rewrite error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to rewrite text" 
      });
    }
  });

  // Email route using SendGrid
  app.post("/api/email/send", async (req, res) => {
    try {
      const { subject, content, contentType = 'html' } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      await emailService.sendResponseEmail(content);
      
      res.json({ success: true, message: "Email sent successfully" });
      
    } catch (error) {
      console.error("Email error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to send email" 
      });
    }
  });

  // Document chunking API endpoints
  
  // Get chunks for a document
  app.get("/api/documents/:documentId/chunks", async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      
      // Get document
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Generate chunks
      const chunkedDocument = chunkDocument(document.content, 1000);
      
      res.json(chunkedDocument.chunks);
      
    } catch (error) {
      console.error("Document chunking error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to chunk document" 
      });
    }
  });

  // Synthesize chunks from multiple documents
  app.post("/api/documents/synthesize", async (req, res) => {
    try {
      const { 
        chunkPairs, 
        useChatData = false, 
        provider = 'deepseek',
        sessionId,
        documentAId,
        documentBId 
      } = req.body;
      
      if (!chunkPairs || chunkPairs.length === 0) {
        return res.status(400).json({ error: "Chunk pairs are required" });
      }

      // Get documents
      let documentA = null;
      let documentB = null;
      
      if (documentAId) {
        documentA = await storage.getDocument(documentAId);
      }
      
      if (documentBId) {
        documentB = await storage.getDocument(documentBId);
      }

      // Get chat context if requested
      let chatContext = "";
      if (useChatData && sessionId) {
        const messages = await storage.getComparisonMessages(sessionId);
        chatContext = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
      }

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

      const synthesizedSections = [];

      // Process each chunk pair
      for (const pair of chunkPairs) {
        const { chunkAIndexes = [], chunkBIndexes = [], instructions } = pair;
        
        // Get chunk content for Document A
        let chunkAContent = "";
        if (documentA && chunkAIndexes.length > 0) {
          const chunkedDocA = chunkDocument(documentA.content, 1000);
          chunkAContent = chunkAIndexes
            .map((index: number) => chunkedDocA.chunks[index]?.content || "")
            .join("\n\n");
        }
        
        // Get chunk content for Document B
        let chunkBContent = "";
        if (documentB && chunkBIndexes.length > 0) {
          const chunkedDocB = chunkDocument(documentB.content, 1000);
          chunkBContent = chunkBIndexes
            .map((index: number) => chunkedDocB.chunks[index]?.content || "")
            .join("\n\n");
        }

        // Create synthesis prompt
        let synthesisPrompt = `You are a professional content synthesizer. Your task is to follow the instructions exactly and return ONLY the synthesized content with no introductory text, explanatory notes, or metadata. Do not include phrases like "Here's a dialogue" or "This synthesizes" or any commentary about what you're doing.

Instructions: ${instructions}

`;
        
        if (chunkAContent && chunkBContent) {
          synthesisPrompt += `Content from Document A:\n${chunkAContent}\n\nContent from Document B:\n${chunkBContent}`;
        } else if (chunkAContent) {
          synthesisPrompt += `Content to process:\n${chunkAContent}`;
        } else if (chunkBContent) {
          synthesisPrompt += `Content to process:\n${chunkBContent}`;
        }

        if (chatContext) {
          synthesisPrompt += `\n\nRelevant conversation context:\n${chatContext}`;
        }

        synthesisPrompt += `\n\nRemember: Return ONLY the synthesized content. No introductions, explanations, or meta-commentary.`;

        // Generate synthesis
        const aiResponse = await generateChatResponse(synthesisPrompt, "", []);
        
        if (aiResponse.error) {
          throw new Error(aiResponse.error);
        }

        // Clean up markup symbols
        const cleanedSynthesis = removeMarkupSymbols(aiResponse.message);
        synthesizedSections.push(cleanedSynthesis);
      }

      // Combine all synthesized sections
      const finalSynthesis = synthesizedSections.join('\n\n---\n\n');
      
      res.json({ 
        synthesizedContent: finalSynthesis,
        sections: synthesizedSections,
        provider: provider,
        usedChatData: useChatData
      });
      
    } catch (error) {
      console.error("Document synthesis error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to synthesize documents" 
      });
    }
  });

  // Comparison API endpoints
  
  // Send comparison message
  app.post("/api/compare/message", async (req, res) => {
    try {
      const { message, provider = 'deepseek', documentAId, documentBId, sessionId } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get or create comparison session
      let session;
      if (sessionId) {
        session = await storage.getComparisonSession(sessionId);
        
        // If session exists and documents have changed, update the session
        if (session && (session.documentAId !== documentAId || session.documentBId !== documentBId)) {
          session = await storage.updateComparisonSession(sessionId, {
            documentAId: documentAId || null,
            documentBId: documentBId || null
          });
        }
      }
      
      if (!session) {
        session = await storage.createComparisonSession({ 
          documentAId: documentAId || null, 
          documentBId: documentBId || null 
        });
      }

      // Get documents content if provided
      let documentAContent = "";
      let documentBContent = "";
      
      if (documentAId) {
        const docA = await storage.getDocument(documentAId);
        if (docA) documentAContent = docA.content;
      }
      
      if (documentBId) {
        const docB = await storage.getDocument(documentBId);
        if (docB) documentBContent = docB.content;
      }

      // Get conversation history
      const messages = await storage.getComparisonMessages(session.id);
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Save user message
      const userMessageData = {
        sessionId: session.id,
        role: "user",
        content: message
      };
      const validatedUserMessage = insertComparisonMessageSchema.parse(userMessageData);
      await storage.createComparisonMessage(validatedUserMessage);

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

      // Truncate document content if too large to fit in context window
      const maxContentLength = 25000; // Roughly 6,250 tokens at 4 chars per token (split between two docs)
      
      let truncatedDocAContent = documentAContent;
      let truncatedDocBContent = documentBContent;
      
      if (documentAContent.length > maxContentLength) {
        truncatedDocAContent = documentAContent.substring(0, maxContentLength) + 
          `\n\n[Note: Document A is ${documentAContent.length} characters. Only first ${maxContentLength} characters shown. For specific sections, please ask about particular topics or use the chunked document view.]`;
      }
      
      if (documentBContent.length > maxContentLength) {
        truncatedDocBContent = documentBContent.substring(0, maxContentLength) + 
          `\n\n[Note: Document B is ${documentBContent.length} characters. Only first ${maxContentLength} characters shown. For specific sections, please ask about particular topics or use the chunked document view.]`;
      }

      // Create context from both documents with truncated content
      let documentContext = "";
      if (truncatedDocAContent && truncatedDocBContent) {
        documentContext = `Document A:\n${truncatedDocAContent}\n\nDocument B:\n${truncatedDocBContent}`;
      } else if (truncatedDocAContent) {
        documentContext = `Document A:\n${truncatedDocAContent}`;
      } else if (truncatedDocBContent) {
        documentContext = `Document B:\n${truncatedDocBContent}`;
      }
      
      // Generate AI response with both documents context
      const aiResponse = await generateChatResponse(
        message,
        documentContext,
        conversationHistory
      );
      
      if (aiResponse.error) {
        return res.status(500).json({ error: aiResponse.error });
      }

      // Clean AI response of markup symbols
      const cleanedResponse = removeMarkupSymbols(aiResponse.message);

      // Save AI response
      const aiMessageData = {
        sessionId: session.id,
        role: "assistant",
        content: cleanedResponse
      };
      const validatedAiMessage = insertComparisonMessageSchema.parse(aiMessageData);
      const savedAiMessage = await storage.createComparisonMessage(validatedAiMessage);
      
      res.json({
        sessionId: session.id,
        id: savedAiMessage.id,
        role: savedAiMessage.role,
        content: savedAiMessage.content,
        timestamp: savedAiMessage.timestamp
      });
      
    } catch (error) {
      console.error("Comparison chat error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to process comparison message" 
      });
    }
  });

  // Get comparison messages for a session
  app.get("/api/compare/messages/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      
      const messages = await storage.getComparisonMessages(sessionId);
      res.json(messages);
      
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get comparison messages" 
      });
    }
  });

  // Generate cognitive map endpoint
  app.post('/api/generate-cognitive-map', async (req, res) => {
    try {
      const { selectedText, provider = 'deepseek' } = req.body;

      if (!selectedText || !selectedText.trim()) {
        return res.status(400).json({ error: 'Selected text is required' });
      }

      console.log(`🧠 GENERATING COGNITIVE MAP - Provider: ${provider}, Text length: ${selectedText.length}`);

      const prompt = `Analyze the selected text and create a structured cognitive map. Identify the main thesis, key claims, logical dependencies, and conceptual relationships.

Selected passage:
"""
${selectedText}
"""

Provide your analysis in EXACTLY this format:

LOGICAL STRUCTURE:
Main Thesis: [state the central argument in one clear sentence]
├── Key Claim 1: [first supporting argument]
│   ├── Sub-claim 1a: [specific detail or evidence]
│   └── Sub-claim 1b: [specific detail or evidence]
├── Key Claim 2: [second supporting argument]
│   ├── Evidence: [supporting detail]
│   └── Example: [specific instance]
├── Definitions: [key terms that need defining]
└── Assumptions: [underlying premises]

MERMAID DIAGRAM:
graph TD
    THESIS["Main Thesis:<br/>Brief statement"]
    CLAIM1["Key Claim 1:<br/>Brief description"]
    CLAIM2["Key Claim 2:<br/>Brief description"]
    SUB1A["Sub-claim 1a:<br/>Detail"]
    SUB1B["Sub-claim 1b:<br/>Detail"]
    EVIDENCE["Evidence:<br/>Supporting detail"]
    DEFS["Definitions:<br/>Key terms"]
    ASSUME["Assumptions:<br/>Premises"]
    
    THESIS --> CLAIM1
    THESIS --> CLAIM2
    CLAIM1 --> SUB1A
    CLAIM1 --> SUB1B
    CLAIM2 --> EVIDENCE
    DEFS --> THESIS
    ASSUME --> THESIS

CRITICAL: Use only simple node labels with <br/> for line breaks. No markdown, no lists, no special characters in the Mermaid code.`;

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

      const response = await generateChatResponse(prompt, selectedText, []);

      if (response.error) {
        return res.status(500).json({ error: response.error });
      }

      console.log(`✅ COGNITIVE MAP GENERATED - Provider: ${provider}, Length: ${response.message.length} chars`);

      res.json({
        cognitiveMap: response.message,
        provider: provider
      });

    } catch (error) {
      console.error('❌ Cognitive map generation error:', error);
      res.status(500).json({ error: 'Failed to generate cognitive map' });
    }
  });

  // Summary+Thesis generation endpoint
  app.post("/api/generate-summary-thesis", async (req, res) => {
    try {
      const { selectedText, provider = 'deepseek' } = req.body;
      
      if (!selectedText || selectedText.trim().length === 0) {
        return res.status(400).json({ error: "Selected text is required" });
      }

      console.log(`📝 GENERATING SUMMARY+THESIS - Provider: ${provider}, Text length: ${selectedText.length}`);

      const prompt = `Summarize the selected passage in the following format:

Thesis: [Concise 1–2 sentence main claim].

Summary: [3–6 sentences explaining the logic, background, and implications].

Focus on clarity, conceptual structure, and explanatory relevance. Avoid repeating the original text. Prioritize insight over coverage.

Selected passage:
"""
${selectedText}
"""

Important: Format your response exactly as specified with "Thesis:" and "Summary:" headers. Be concise and insightful.`;

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

      const response = await generateChatResponse(prompt, selectedText, []);
      
      if (response.error) {
        return res.status(500).json({ error: response.error });
      }
      
      // Clean any markdown formatting
      const cleanedContent = removeMarkupSymbols(response.message);
      
      console.log(`✅ SUMMARY+THESIS GENERATED - Provider: ${provider}, Length: ${cleanedContent.length} chars`);
      
      res.json({ summaryThesis: cleanedContent });
      
    } catch (error) {
      console.error("Summary+Thesis generation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate summary+thesis"
      });
    }
  });

  // Thesis Deep-Dive generation endpoint
  app.post("/api/generate-thesis-deep-dive", async (req, res) => {
    try {
      const { selectedText, provider = 'deepseek', comparisonTarget } = req.body;
      
      if (!selectedText || selectedText.trim().length === 0) {
        return res.status(400).json({ error: "Selected text is required" });
      }

      console.log(`🔍 GENERATING THESIS DEEP-DIVE - Provider: ${provider}, Text length: ${selectedText.length}`);

      let prompt = `Extract the core thesis of the selected passage. Then:
(a) Quote the author's original wording of the thesis.
(b) Explain the practical or theoretical relevance of the thesis in a contemporary context.
(c) Cross-check the thesis with major modern thinkers or fields (e.g. neuroscience, philosophy of mind, AI, cognitive science, education). Indicate points of agreement, contradiction, or obsolescence. Keep the output dense and analytical.

Format the response using the following labeled sections:

Extracted Thesis: [Identify and state the central argument clearly]

Original Wording: [Quote the author's exact phrasing of the thesis from the text]

Modern Applications: [Explain contemporary relevance and practical implications]

Cross-Comparison: [Compare with modern thinkers/fields, noting agreements, contradictions, or obsolescence]

Selected passage:
"""
${selectedText}
"""`;

      if (comparisonTarget && comparisonTarget.trim()) {
        prompt += `\n\nSpecific comparison focus: Compare the thesis against ${comparisonTarget}. Provide detailed analysis of similarities, differences, and theoretical evolution.`;
      }

      prompt += `\n\nImportant: Format your response exactly as specified with the four labeled sections. Be dense, analytical, and scholarly in your approach.`;

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

      const response = await generateChatResponse(prompt, selectedText, []);
      
      if (response.error) {
        return res.status(500).json({ error: response.error });
      }
      
      // Clean any markdown formatting
      const cleanedContent = removeMarkupSymbols(response.message);
      
      console.log(`✅ THESIS DEEP-DIVE GENERATED - Provider: ${provider}, Length: ${cleanedContent.length} chars`);
      
      res.json({ thesisDeepDive: cleanedContent });
      
    } catch (error) {
      console.error("Thesis Deep-Dive generation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate thesis deep-dive"
      });
    }
  });

  // Suggested Readings generation endpoint
  app.post("/api/generate-suggested-readings", async (req, res) => {
    try {
      const { selectedText, provider = 'deepseek' } = req.body;
      
      if (!selectedText || selectedText.trim().length === 0) {
        return res.status(400).json({ error: "Selected text is required" });
      }

      console.log(`📚 GENERATING SUGGESTED READINGS - Provider: ${provider}, Text length: ${selectedText.length}`);

      const prompt = `Based on the themes, concepts, and subject matter in the selected passage, generate a list of relevant academic or intellectual works (books, articles, or essays). Include both historical and contemporary sources. For each item, provide:
(a) Full title
(b) Author
(c) A one-sentence explanation of its relevance.

Return a list of 5–10 entries. Each entry should have this format:

Title by Author — [1-sentence relevance summary]

Focus on well-known, influential works that are genuinely relevant to the themes and concepts in the passage. Include both foundational historical texts and important contemporary scholarship. Be specific and accurate with titles and authors.

Selected passage:
"""
${selectedText}
"""

Important: Format each entry exactly as specified: "Title by Author — [relevance summary]". Provide 7-10 high-quality, genuinely relevant academic works.`;

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

      const response = await generateChatResponse(prompt, selectedText, []);
      
      if (response.error) {
        return res.status(500).json({ error: response.error });
      }
      
      // Clean any markdown formatting
      const cleanedContent = removeMarkupSymbols(response.message);
      
      console.log(`✅ SUGGESTED READINGS GENERATED - Provider: ${provider}, Length: ${cleanedContent.length} chars`);
      
      res.json({ suggestedReadings: cleanedContent });
      
    } catch (error) {
      console.error("Suggested Readings generation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate suggested readings"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
