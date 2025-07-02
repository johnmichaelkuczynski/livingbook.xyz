import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { storage } from "./storage";
import { extractTextFromDocument, processMathNotation } from "./services/documentProcessor";
import * as openaiService from "./services/openai";
import * as anthropicService from "./services/anthropic";
import * as deepseekService from "./services/deepseek";
import * as perplexityService from "./services/perplexity";
import { insertDocumentSchema, insertChatMessageSchema } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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
  
  // Upload document
  app.post("/api/documents/upload", upload.single('document'), async (req, res) => {
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
        content: extractedText
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

  // Send chat message without document
  app.post("/api/chat/message", async (req, res) => {
    try {
      const { message, provider = 'deepseek' } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
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
      
      // Generate AI response without document context
      const aiResponse = await generateChatResponse(
        message,
        "", // No document content
        [] // No conversation history
      );
      
      if (aiResponse.error) {
        return res.status(500).json({ error: aiResponse.error });
      }
      
      res.json({
        message: aiResponse.message
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
      
      // Generate AI response
      const aiResponse = await generateChatResponse(
        message,
        document.content,
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

  const httpServer = createServer(app);
  return httpServer;
}
