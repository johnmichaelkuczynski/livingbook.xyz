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
      
      // Extract text from the document
      let extractedText = await extractTextFromDocument(filePath, mimetype);
      
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

  // Upload document (alias route for convenience)  
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { originalname, filename, mimetype, size, path: filePath } = req.file;
      
      // Extract text from the document
      let extractedText = await extractTextFromDocument(filePath, mimetype);
      
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
        // Simple PDF export using HTML to PDF conversion
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${title || 'Document'}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
              .title { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px; }
              .content { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <div class="title">${title || 'Document'}</div>
            <div class="content">${content}</div>
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

  // Send chat message without document
  app.post("/api/chat/message", async (req, res) => {
    try {
      const { message, provider = 'deepseek' } = req.body;
      
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
      
      // Generate AI response without document context
      const aiResponse = await generateChatResponse(
        message,
        "", // No document content
        conversationHistory
      );
      
      if (aiResponse.error) {
        return res.status(500).json({ error: aiResponse.error });
      }

      // Save AI response
      const aiMessageData = {
        sessionId: session.id,
        role: "assistant",
        content: aiResponse.message
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
      const { message, provider = 'deepseek' } = req.body;
      
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
      const maxContentLength = 50000; // Roughly 12,500 tokens at 4 chars per token
      let documentContent = document.content;
      
      if (document.content.length > maxContentLength) {
        // For large documents, take the first portion and add a note
        documentContent = document.content.substring(0, maxContentLength) + 
          `\n\n[Note: Document is ${document.content.length} characters. Only first ${maxContentLength} characters shown. For specific sections, please ask the user to use the chunked document view or ask about specific topics.]`;
      }
      
      // Generate AI response
      const aiResponse = await generateChatResponse(
        message,
        documentContent,
        conversationHistory
      );
      
      if (aiResponse.error) {
        return res.status(500).json({ error: aiResponse.error });
      }
      
      // Save AI response
      const aiMessageData = {
        sessionId: session.id,
        role: "assistant",
        content: aiResponse.message
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

  // Email route using SendGrid - Legacy endpoint
  app.post("/api/email/send", async (req, res) => {
    try {
      const { subject, content, contentType = 'html' } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      await emailService.sendResponseEmail(content, 'user@example.com');
      
      res.json({ success: true, message: "Email sent successfully" });
      
    } catch (error) {
      console.error("Email error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to send email" 
      });
    }
  });

  // Email API endpoint - Send AI response via email
  app.post("/api/email/send-response", async (req, res) => {
    try {
      const { content, userEmail, timestamp } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }
      
      if (!userEmail || !userEmail.includes('@')) {
        return res.status(400).json({ error: "Valid email address is required" });
      }

      await emailService.sendResponseEmail(content, userEmail, timestamp);
      
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error('Email sending error:', error);
      res.status(500).json({ 
        error: "Failed to send email", 
        details: error instanceof Error ? error.message : "Unknown error" 
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
            .map(index => chunkedDocA.chunks[index]?.content || "")
            .join("\n\n");
        }
        
        // Get chunk content for Document B
        let chunkBContent = "";
        if (documentB && chunkBIndexes.length > 0) {
          const chunkedDocB = chunkDocument(documentB.content, 1000);
          chunkBContent = chunkBIndexes
            .map(index => chunkedDocB.chunks[index]?.content || "")
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

      // Save AI response
      const aiMessageData = {
        sessionId: session.id,
        role: "assistant",
        content: aiResponse.message
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

  const httpServer = createServer(app);
  return httpServer;
}
