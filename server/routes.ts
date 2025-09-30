import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { storage } from "./storage";
import { extractTextFromDocument, processMathNotation } from "./services/documentProcessor";
import { chunkDocument } from "./services/documentChunker";
import * as openaiService from "./services/openai";
import * as anthropicService from "./services/anthropic";
import * as deepseekService from "./services/deepseek";
import * as perplexityService from "./services/perplexity";
import * as emailService from "./services/email";
import * as azureSpeechService from "./services/azureSpeech";

import { insertDocumentSchema, insertChatMessageSchema, insertComparisonSessionSchema, insertComparisonMessageSchema, insertUserSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import crypto from "crypto";
import Stripe from "stripe";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Warning: STRIPE_SECRET_KEY not set. Payment features will not work.');
}
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" })
  : null;

// Helper function to generate secure session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// SECURITY: Server-side pricing tiers - single source of truth
const ZHI_TIERS = {
  'zhi-1': {
    name: 'ZHI 1',
    packages: {
      '5': { price: 5, credits: 4275000 },
      '10': { price: 10, credits: 8977500 },
      '25': { price: 25, credits: 23512500 },
      '50': { price: 50, credits: 51300000 },
      '100': { price: 100, credits: 115425000 },
    }
  },
  'zhi-2': {
    name: 'ZHI 2',
    packages: {
      '5': { price: 5, credits: 106840 },
      '10': { price: 10, credits: 224360 },
      '25': { price: 25, credits: 587625 },
      '50': { price: 50, credits: 1282100 },
      '100': { price: 100, credits: 2883400 },
    }
  },
  'zhi-3': {
    name: 'ZHI 3',
    packages: {
      '5': { price: 5, credits: 702000 },
      '10': { price: 10, credits: 1474200 },
      '25': { price: 25, credits: 3861000 },
      '50': { price: 50, credits: 8424000 },
      '100': { price: 100, credits: 18954000 },
    }
  },
  'zhi-4': {
    name: 'ZHI 4',
    packages: {
      '5': { price: 5, credits: 6410255 },
      '10': { price: 10, credits: 13461530 },
      '25': { price: 25, credits: 35256400 },
      '50': { price: 50, credits: 76923050 },
      '100': { price: 100, credits: 173176900 },
    }
  },
} as const;

// Helper function to check and deduct credits for AI operations
async function deductCreditsForOperation(
  sessionToken: string | undefined,
  wordCount: number,
  description: string
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  if (!sessionToken) {
    // Guest users can use the app without credits
    return { success: true };
  }

  try {
    const session = await storage.getUserSession(sessionToken);
    if (!session) {
      // Invalid session, but allow guest access
      return { success: true };
    }

    const user = await storage.getUser(session.userId);
    if (!user) {
      return { success: true };
    }

    // Special debug user: jmk (case insensitive) - unlimited credits, no deduction
    if (user.username.toLowerCase() === 'jmk') {
      return { success: true, newBalance: user.credits };
    }

    // Calculate cost: 1 credit per word
    const cost = wordCount;

    // Check if user has enough credits
    if (user.credits < cost) {
      return { 
        success: false, 
        error: `Insufficient credits. You need ${cost.toLocaleString()} credits but have ${user.credits.toLocaleString()}.` 
      };
    }

    // Deduct credits
    const newBalance = user.credits - cost;
    await storage.updateUser(user.id, { credits: newBalance });

    // Record transaction
    await storage.createCreditTransaction({
      userId: user.id,
      amount: -cost,
      type: 'usage',
      description: description,
      balanceAfter: newBalance
    });

    return { success: true, newBalance };
  } catch (error) {
    console.error('Credit deduction error:', error);
    // On error, allow operation to proceed (don't block users on credit system failures)
    return { success: true };
  }
}

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
  
  // Auth Routes
  
  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Special debug user: jmk (case insensitive) - unlimited credits
      const isDebugUser = username.toLowerCase() === 'jmk';
      
      // Create user
      const userData = insertUserSchema.parse({ username, password: hashedPassword });
      const user = await storage.createUser(userData);
      
      // For debug user jmk, set unlimited credits (999,999,999)
      if (isDebugUser) {
        await storage.updateUser(user.id, { credits: 999999999 });
        user.credits = 999999999;
      }
      
      // Create session
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await storage.createUserSession({
        userId: user.id,
        sessionToken,
        expiresAt
      });
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          credits: user.credits
        },
        sessionToken
      });
      
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to register" 
      });
    }
  });
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }
      
      // Special debug user: jmk (case insensitive) - no password required, unlimited credits
      const isDebugUser = username.toLowerCase() === 'jmk';
      
      if (!isDebugUser && !password) {
        return res.status(400).json({ error: "Password is required" });
      }
      
      // Find user - for jmk debug user, try lowercase first
      let user = await storage.getUserByUsername(username);
      if (!user && isDebugUser) {
        // Try lowercase lookup for jmk debug user
        user = await storage.getUserByUsername(username.toLowerCase());
        if (!user) {
          // Try uppercase
          user = await storage.getUserByUsername(username.toUpperCase());
        }
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      // Check password (skip for debug user)
      if (!isDebugUser) {
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(401).json({ error: "Invalid username or password" });
        }
      }
      
      // For debug user jmk, ensure unlimited credits (999,999,999)
      if (isDebugUser && user.credits < 999999999) {
        await storage.updateUser(user.id, { credits: 999999999 });
        user.credits = 999999999;
      }
      
      // Create session
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await storage.createUserSession({
        userId: user.id,
        sessionToken,
        expiresAt
      });
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          credits: user.credits
        },
        sessionToken
      });
      
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to login" 
      });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (sessionToken) {
        await storage.deleteUserSession(sessionToken);
      }
      
      res.json({ success: true });
      
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to logout" 
      });
    }
  });
  
  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionToken) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const session = await storage.getUserSession(sessionToken);
      if (!session) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }
      
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      // For debug user jmk, ensure unlimited credits (999,999,999)
      if (user.username.toLowerCase() === 'jmk' && user.credits < 999999999) {
        await storage.updateUser(user.id, { credits: 999999999 });
        user.credits = 999999999;
      }
      
      res.json({
        id: user.id,
        username: user.username,
        credits: user.credits
      });
      
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get user" 
      });
    }
  });
  
  // Credit Management Routes
  
  // Get Stripe public key for frontend
  app.get("/api/stripe/config", async (req, res) => {
    return res.json({
      publicKey: process.env.VITE_STRIPE_PUBLIC_KEY || null
    });
  });
  
  // Create Stripe checkout session for credit purchase
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Payment system not configured" });
      }

      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionToken) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const session = await storage.getUserSession(sessionToken);
      if (!session) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }
      
      // SECURITY: Client only sends tier and package IDs, server looks up the actual prices
      const { tierId, packagePrice } = req.body;
      
      if (!tierId || !packagePrice) {
        return res.status(400).json({ error: "Tier ID and package price required" });
      }
      
      // Look up the tier and package from our server-side pricing table
      const tier = ZHI_TIERS[tierId as keyof typeof ZHI_TIERS];
      if (!tier) {
        return res.status(400).json({ error: "Invalid tier ID" });
      }
      
      const pkg = tier.packages[packagePrice.toString() as keyof typeof tier.packages];
      if (!pkg) {
        return res.status(400).json({ error: "Invalid package price" });
      }
      
      // SECURITY: Use server-side values only - never trust client
      const amount = pkg.price;
      const credits = pkg.credits;
      const description = `${tier.name} - $${amount} package`;
      
      // Create payment intent with server-verified values
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert dollars to cents
        currency: "usd",
        metadata: {
          userId: session.userId.toString(),
          credits: credits.toString(),
          price: amount.toString(),
          tierId: tierId,
          description: description
        }
      });
      
      console.log(`💳 Payment intent created: User ${session.userId} - ${credits.toLocaleString()} credits for $${amount}`);
      
      res.json({ clientSecret: paymentIntent.client_secret });
      
    } catch (error) {
      console.error("Create payment intent error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to create payment intent" 
      });
    }
  });
  
  // Add credits after successful payment (called from frontend after Stripe confirms payment)
  app.post("/api/credits/add", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionToken) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const session = await storage.getUserSession(sessionToken);
      if (!session) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }
      
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ error: "Payment intent ID required" });
      }
      
      if (!stripe) {
        return res.status(500).json({ error: "Payment system not configured" });
      }
      
      // SECURITY: Check if this payment intent has already been used (prevent replay attacks)
      const existingTransaction = await storage.getCreditTransactionByPaymentIntentId(paymentIntentId);
      if (existingTransaction) {
        console.warn(`⚠️ Replay attack detected: Payment intent ${paymentIntentId} already used by user ${session.userId}`);
        return res.status(400).json({ 
          error: "This payment has already been processed",
          credits: existingTransaction.balanceAfter 
        });
      }
      
      // SECURITY: Get credit amount from Stripe metadata, NOT from client request
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ error: "Payment not completed" });
      }
      
      // Verify the payment belongs to this user
      if (paymentIntent.metadata.userId !== session.userId.toString()) {
        return res.status(403).json({ error: "Payment verification failed" });
      }
      
      // Extract credits from payment metadata (set during payment intent creation)
      const credits = parseInt(paymentIntent.metadata.credits || '0');
      const description = paymentIntent.metadata.description || 'Credit purchase';
      
      if (!credits || credits <= 0) {
        return res.status(400).json({ error: "Invalid payment metadata" });
      }
      
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const newBalance = user.credits + credits;
      await storage.updateUser(user.id, { credits: newBalance });
      
      await storage.createCreditTransaction({
        userId: user.id,
        amount: credits,
        type: 'purchase',
        description: description,
        balanceAfter: newBalance,
        paymentIntentId: paymentIntentId // SECURITY: Track payment intent to prevent replay
      });
      
      console.log(`✅ Credits added: User ${user.id} purchased ${credits} credits for $${paymentIntent.amount / 100}`);
      
      res.json({
        credits: newBalance,
        added: credits
      });
      
    } catch (error) {
      console.error("Add credits error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to add credits" 
      });
    }
  });
  
  // Deduct credits (for AI operations)
  app.post("/api/credits/deduct", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionToken) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const session = await storage.getUserSession(sessionToken);
      if (!session) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }
      
      const { amount, description } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (user.credits < amount) {
        return res.status(402).json({ error: "Insufficient credits" });
      }
      
      const newBalance = user.credits - amount;
      await storage.updateUser(user.id, { credits: newBalance });
      
      await storage.createCreditTransaction({
        userId: user.id,
        amount: -amount,
        type: 'usage',
        description: description || 'AI operation',
        balanceAfter: newBalance
      });
      
      res.json({
        credits: newBalance,
        deducted: amount
      });
      
    } catch (error) {
      console.error("Deduct credits error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to deduct credits" 
      });
    }
  });
  
  // Get credit transactions
  app.get("/api/credits/transactions", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionToken) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const session = await storage.getUserSession(sessionToken);
      if (!session) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }
      
      const transactions = await storage.getCreditTransactions(session.userId);
      res.json(transactions);
      
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get transactions" 
      });
    }
  });
  
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

  // Generate summary + thesis for selected text
  app.post("/api/summary-thesis", async (req, res) => {
    try {
      const { selectedText, provider = 'openai' } = req.body;
      
      if (!selectedText) {
        return res.status(400).json({ error: "Selected text is required" });
      }

      console.log('📋 GENERATING SUMMARY+THESIS - Provider:', provider, 'Text length:', selectedText.length);

      const summaryThesisPrompt = `Analyze the following text and provide:

1. ONE sentence that captures the main thesis or central argument
2. ONE paragraph explanation that elaborates on this thesis

Format your response exactly as follows:
THESIS: [One clear sentence stating the main thesis]

EXPLANATION: [One paragraph explaining and supporting the thesis]

Here is the text to analyze:

${selectedText}`;

      let response;
      switch (provider) {
        case 'openai':
          const openaiResponse = await openaiService.generateChatResponse(summaryThesisPrompt, selectedText, []);
          response = openaiResponse.error ? openaiResponse.error : openaiResponse.message;
          break;
        case 'deepseek':
          const deepseekResponse = await deepseekService.generateChatResponse(summaryThesisPrompt, selectedText, []);
          response = deepseekResponse.error ? deepseekResponse.error : deepseekResponse.message;
          break;
        case 'anthropic':
          const anthropicResponse = await anthropicService.generateChatResponse(summaryThesisPrompt, selectedText, []);
          response = anthropicResponse.error ? anthropicResponse.error : anthropicResponse.message;
          break;
        case 'perplexity':
          const perplexityResponse = await perplexityService.generateChatResponse(summaryThesisPrompt, selectedText, []);
          response = perplexityResponse.error ? perplexityResponse.error : perplexityResponse.message;
          break;
        default:
          const defaultResponse = await openaiService.generateChatResponse(summaryThesisPrompt, selectedText, []);
          response = defaultResponse.error ? defaultResponse.error : defaultResponse.message;
      }
      
      console.log('✅ SUMMARY+THESIS GENERATED - Provider:', provider, 'Length:', response.length, 'chars');
      
      res.json({ summaryThesis: response });
    } catch (error) {
      console.error('❌ SUMMARY+THESIS ERROR:', error);
      res.status(500).json({ error: "Failed to generate summary and thesis" });
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


  // Complete podcast generation endpoint - generates dialogue AND audio in one call
  app.post("/api/generate-podcast", async (req, res) => {
    try {
      const { selectedText, documentTitle, provider = 'deepseek', type = 'single', prompt, voiceOptions } = req.body;

      if (!selectedText?.trim()) {
        return res.status(400).json({ error: 'Selected text is required' });
      }

      console.log(`🎙️ GENERATING COMPLETE PODCAST - Type: ${type}, Provider: ${provider}`);

      // Generate appropriate prompt based on type
      const podcastPrompt = prompt || `Generate a complete ${type} podcast episode with proper dialogue format using HOST: and GUEST: speaker labels. Episode should be exactly 3.5 minutes (450-500 words maximum) about the following text. Include natural conversation with clear speaker turns. Keep it professional and informative:\n\n${selectedText}`;

      // Step 1: Generate dialogue using the appropriate AI service
      let chatResponse;
      switch (provider) {
        case 'openai':
          chatResponse = await openaiService.generateChatResponse(podcastPrompt, selectedText, []);
          break;
        case 'deepseek':
          // DeepSeek expects (userMessage, documentContent, conversationHistory)
          chatResponse = await deepseekService.generateChatResponse(podcastPrompt, selectedText, []);
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

        // Save to temporary file for download
        const timestamp = Date.now();
        const filename = `podcast-${type}-${timestamp}.mp3`;
        const filePath = path.join(process.cwd(), 'downloads', filename);
        
        await fs.writeFile(filePath, audioBuffer);
        console.log(`💾 Audio saved to: ${filePath}`);

        // Schedule file cleanup after 1 hour
        setTimeout(async () => {
          try {
            await fs.unlink(filePath);
            console.log(`🗑️ Cleaned up file: ${filePath}`);
          } catch (err) {
            console.log(`⚠️ Failed to cleanup file: ${filePath}`, err);
          }
        }, 60 * 60 * 1000); // 1 hour

        // Return JSON response with download URL
        res.json({
          script: dialogue,
          audioUrl: `/api/download-podcast/${filename}`,
          filename: filename
        });
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

  // Download podcast file
  app.get("/api/download-podcast/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      
      // Validate filename to prevent directory traversal
      if (!filename || !filename.match(/^podcast-[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/)) {
        return res.status(400).json({ error: "Invalid filename" });
      }
      
      const filePath = path.join(process.cwd(), 'downloads', filename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (err) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Set headers for download
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      });
      
      // Stream the file
      const fileStream = createReadStream(filePath);
      fileStream.pipe(res);
      
      console.log(`📥 File downloaded: ${filename}`);
      
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Failed to download file" });
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
      
      // Calculate word count for credit deduction
      const wordCount = cleanedResponse.split(/\s+/).filter(word => word.length > 0).length;
      
      // Deduct credits for logged-in users
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      const creditResult = await deductCreditsForOperation(
        sessionToken,
        wordCount,
        `Chat message (${wordCount} words)`
      );
      
      if (!creditResult.success) {
        return res.status(402).json({ 
          error: creditResult.error,
          insufficientCredits: true
        });
      }
      
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
        timestamp: savedAiMessage.timestamp,
        creditsUsed: wordCount,
        newBalance: creditResult.newBalance
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
      documentId,
      message: message ? `"${message.substring(0, 50)}..."` : 'null',
      provider,
      selectedText: selectedText ? `"${selectedText.substring(0, 100)}..."` : 'null'
    });
      
      console.log(`🔍 PROVIDER DEBUG - Document Chat: Provider received: "${provider}"`);
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Validate document ID
      if (isNaN(documentId) || documentId <= 0) {
        console.error(`❌ Invalid document ID: ${documentId}`);
        return res.status(400).json({ error: "Invalid document ID" });
      }
      
      // Get document
      const document = await storage.getDocument(documentId);
      if (!document) {
        console.error(`❌ Document not found for ID: ${documentId}`);
        return res.status(404).json({ 
          error: "Document not found",
          details: `Document with ID ${documentId} does not exist. Please refresh the page and try uploading your document again.`
        });
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
      console.log('🔍 DOCUMENT DEBUG:', { id: document.id, filename: document.filename, contentLength: document.content?.length || 0 });
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
      
      // Calculate word count for credit deduction
      const wordCount = cleanedResponse.split(/\s+/).filter(word => word.length > 0).length;
      
      // Deduct credits for logged-in users
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');
      const creditResult = await deductCreditsForOperation(
        sessionToken,
        wordCount,
        `Chat with document (${wordCount} words)`
      );
      
      if (!creditResult.success) {
        return res.status(402).json({ 
          error: creditResult.error,
          insufficientCredits: true
        });
      }
      
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
        timestamp: savedAiMessage.timestamp,
        creditsUsed: wordCount,
        newBalance: creditResult.newBalance
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
  
  // Synthesize two documents into a unified analysis
  app.post("/api/synthesize-documents", async (req, res) => {
    try {
      const { documentA, documentB, titleA = "Document A", titleB = "Document B", customInstructions, provider = 'deepseek' } = req.body;
      
      if (!documentA || !documentB) {
        return res.status(400).json({ error: "Both documents are required" });
      }

      // Create synthesis prompt
      let prompt = `You are tasked with synthesizing two documents into a comprehensive, unified analysis. 

DOCUMENT A: ${titleA}
${documentA}

DOCUMENT B: ${titleB}  
${documentB}

Your task is to create a comprehensive synthesis that:
1. Identifies key themes and concepts from both documents
2. Compares and contrasts the main arguments or findings
3. Highlights areas of agreement and disagreement
4. Draws connections between the documents
5. Provides insights that emerge from considering both documents together
6. Creates a unified perspective that incorporates elements from both sources

`;

      if (customInstructions) {
        prompt += `\nSpecial Instructions: ${customInstructions}\n\n`;
      }

      prompt += `Please provide a well-structured synthesis that combines the insights from both documents into a cohesive analysis. Format your response with clear headings and organized sections.`;

      // Select AI service based on provider
      let generateResponse;
      switch (provider.toLowerCase()) {
        case 'openai':
          generateResponse = openaiService.generateChatResponse;
          break;
        case 'anthropic':
          generateResponse = anthropicService.generateChatResponse;
          break;
        case 'perplexity':
          generateResponse = perplexityService.generateChatResponse;
          break;
        case 'deepseek':
        default:
          generateResponse = deepseekService.generateChatResponse;
          break;
      }

      let synthesis: string;
      if (provider.toLowerCase() === 'deepseek') {
        const response = await generateResponse(prompt, '', []);
        synthesis = typeof response === 'string' ? response : response.message;
      } else {
        const response = await generateResponse(prompt, '', []);
        synthesis = typeof response === 'string' ? response : response.message;
      }
      const cleanedSynthesis = removeMarkupSymbols(synthesis || 'No synthesis generated');

      res.json({
        synthesis: cleanedSynthesis,
        provider: provider,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("Document synthesis error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to synthesize documents" 
      });
    }
  });

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





  // Generate podcast script
  app.post("/api/generate-podcast-script", async (req, res) => {
    try {
      const { documentId, selectedText, mode, customInstructions } = req.body;
      
      if (!documentId) {
        return res.status(400).json({ error: "Document ID is required" });
      }
      
      // Get document
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Determine content to use
      const contentToUse = selectedText || document.content;
      
      // Generate podcast script based on mode
      let prompt = '';
      
      switch (mode) {
        case 'normal-single':
          prompt = `Create an engaging single-person podcast script about the following content. The script should be conversational, informative, and suitable for audio narration. Include natural pauses and emphasis where appropriate.

IMPORTANT: Keep the script to approximately 450-500 words maximum to fit within a 3.5 minute podcast episode. Make it a complete, self-contained episode that naturally concludes within this timeframe.

Content: ${contentToUse}

Format the script as a natural monologue with clear sections and smooth transitions. Keep it engaging and educational.`;
          break;
          
        case 'normal-dialogue':
          prompt = `Create an engaging two-person podcast dialogue about the following content. Format it as a conversation between HOST and GUEST, with natural back-and-forth discussion. Make it informative yet conversational.

IMPORTANT: Keep the total dialogue to approximately 450-500 words maximum to fit within a 3.5 minute podcast episode. Make it a complete, self-contained episode that naturally concludes within this timeframe.

Content: ${contentToUse}

Format:
HOST: [dialogue]
GUEST: [dialogue]

Make the conversation flow naturally with questions, explanations, and insights. The hosts should build on each other's points and create an engaging discussion.`;
          break;
          
        case 'custom-single':
          prompt = `Create a single-person podcast script based on these custom instructions: ${customInstructions}

IMPORTANT: Keep the script to approximately 450-500 words maximum to fit within a 3.5 minute podcast episode. Make it a complete, self-contained episode that naturally concludes within this timeframe.

Content to discuss: ${contentToUse}

Follow the custom instructions provided while creating an engaging audio script suitable for one narrator. Maintain a conversational and engaging tone.`;
          break;
          
        case 'custom-dialogue':
          prompt = `Create a two-person podcast dialogue based on these custom instructions: ${customInstructions}

IMPORTANT: Keep the total dialogue to approximately 450-500 words maximum to fit within a 3.5 minute podcast episode. Make it a complete, self-contained episode that naturally concludes within this timeframe.

Content to discuss: ${contentToUse}

Format:
HOST: [dialogue]
GUEST: [dialogue]

Follow the custom instructions provided while creating an engaging conversation between two hosts. Make sure both hosts contribute meaningfully to the discussion.`;
          break;
          
        default:
          return res.status(400).json({ error: "Invalid podcast mode" });
      }
      
      // Generate script using OpenAI (you can switch to other providers)
      const scriptResponse = await openaiService.generateChatResponse(
        prompt,
        '',
        []
      );
      
      if (scriptResponse.error) {
        return res.status(500).json({ error: scriptResponse.error });
      }
      
      res.json({ script: scriptResponse.message });
      
    } catch (error) {
      console.error("Podcast script generation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate podcast script" 
      });
    }
  });

  // Store generated audio in memory for demo purposes
  const audioCache = new Map<string, Buffer>();

  // Generate podcast audio using Azure Speech
  app.post("/api/generate-podcast-audio", async (req, res) => {
    try {
      const { script, mode } = req.body;
      
      if (!script) {
        return res.status(400).json({ error: "Script is required" });
      }
      
      console.log(`🎙️ PODCAST AUDIO GENERATION - Mode: ${mode}, Script length: ${script.length} chars`);
      
      // Use OpenAI TTS for high-quality voice generation
      if (process.env.OPENAI_API_KEY) {
        try {
          const OpenAI = (await import('openai')).default;
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          
          if (mode === 'normal-dialogue' || mode === 'custom-dialogue') {
            console.log('🎤 Using OpenAI TTS with dual voices for dialogue...');
            
            // Parse dialogue and generate with different voices
            const lines = script.split('\n').filter((line: string) => line.trim());
            const audioBuffers: Buffer[] = [];
            
            for (const line of lines) {
              const speakerMatch = line.match(/^(HOST|GUEST):\s*(.*)$/);
              
              if (speakerMatch) {
                const [, speaker, text] = speakerMatch;
                const cleanText = text.trim()
                  .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown
                  .replace(/\*([^*]+)\*/g, '$1')     // Remove italic markdown
                  .replace(/#{1,6}\s*/g, '')         // Remove headers
                  .replace(/\[([^\]]*)\]/g, '')      // Remove brackets
                  .replace(/\([^)]*\)/g, '')         // Remove parentheses
                  .replace(/\s+/g, ' ')              // Normalize whitespace
                  .trim();
                
                if (cleanText.length > 0) {
                  // Use different voices for HOST and GUEST
                  const voice = speaker === 'HOST' ? 'alloy' : 'nova';
                  
                  const response = await openai.audio.speech.create({
                    model: "tts-1",
                    voice: voice,
                    input: cleanText,
                    response_format: "mp3"
                  });
                  
                  const segmentBuffer = Buffer.from(await response.arrayBuffer());
                  audioBuffers.push(segmentBuffer);
                  
                  // Add brief pause between speakers
                  const silenceBuffer = Buffer.alloc(8000); // Approximate pause
                  audioBuffers.push(silenceBuffer);
                }
              }
            }
            
            const finalAudio = Buffer.concat(audioBuffers);
            
            // Create unique audio ID and cache the audio
            const audioId = `podcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            audioCache.set(audioId, finalAudio);
            
            console.log(`✅ OPENAI DUAL-VOICE PODCAST GENERATED - ID: ${audioId}, Size: ${finalAudio.length} bytes`);
            
            res.json({ audioUrl: `/api/audio/${audioId}` });
            return;
            
          } else {
            console.log('🎤 Using OpenAI TTS with single Alloy voice...');
            
            // Single voice mode - clean script for better TTS
            const cleanScript = script
              .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown
              .replace(/\*([^*]+)\*/g, '$1')     // Remove italic markdown
              .replace(/#{1,6}\s*/g, '')         // Remove headers
              .replace(/\[([^\]]*)\]/g, '')      // Remove brackets
              .replace(/\([^)]*\)/g, '')         // Remove parentheses
              .replace(/\s+/g, ' ')              // Normalize whitespace
              .trim();
            
            const response = await openai.audio.speech.create({
              model: "tts-1",
              voice: "alloy", // High-quality Alloy voice
              input: cleanScript,
              response_format: "mp3"
            });
            
            const audioBuffer = Buffer.from(await response.arrayBuffer());
            
            // Create unique audio ID and cache the audio
            const audioId = `podcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            audioCache.set(audioId, audioBuffer);
            
            console.log(`✅ OPENAI SINGLE-VOICE PODCAST GENERATED - ID: ${audioId}, Size: ${audioBuffer.length} bytes`);
            
            res.json({ audioUrl: `/api/audio/${audioId}` });
            return;
          }
          
        } catch (openaiError) {
          console.error('OpenAI TTS error, trying fallback:', openaiError);
        }
      }
      
      // Fallback to Azure Speech if OpenAI fails
      if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
        try {
          console.log('🎤 Falling back to Azure Speech...');
          const azureSpeechService = await import('./services/azureSpeech');
          let audioBuffer: Buffer;
          
          if (mode === 'normal-dialogue' || mode === 'custom-dialogue') {
            // Use two different voices for dialogue
            audioBuffer = await azureSpeechService.generatePodcastAudio(script, {
              speaker1: 'en-US-DavisNeural',
              speaker2: 'en-US-JennyNeural'
            });
          } else {
            // Use single voice for single host
            audioBuffer = await azureSpeechService.synthesizeSpeech(script, 'en-US-JennyNeural');
          }
          
          // Create unique audio ID and cache the audio
          const audioId = `podcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          audioCache.set(audioId, audioBuffer);
          
          console.log(`✅ AZURE PODCAST GENERATED - ID: ${audioId}, Size: ${audioBuffer.length} bytes`);
          
          // Return URL that will serve this specific audio
          res.json({ audioUrl: `/api/audio/${audioId}` });
          return;
          
        } catch (azureError) {
          console.error('Azure Speech error, falling back to demo mode:', azureError);
        }
      }
      
      // Fallback: Create a simple demo audio file
      console.log('Creating demo audio (Azure Speech not available)');
      
      // Simulate audio generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a minimal MP3 header for demo (silent audio)
      const demoAudioBuffer = Buffer.from([
        0xFF, 0xFB, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ]);
      
      const audioId = `demo_${Date.now()}`;
      audioCache.set(audioId, demoAudioBuffer);
      
      console.log(`✅ PODCAST DEMO AUDIO GENERATED - ID: ${audioId}`);
      res.json({ audioUrl: `/api/audio/${audioId}` });
      
    } catch (error) {
      console.error("Podcast audio generation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate podcast audio" 
      });
    }
  });
  
  // Serve generated audio files
  app.get("/api/audio/:audioId", (req, res) => {
    const { audioId } = req.params;
    const audioBuffer = audioCache.get(audioId);
    
    if (!audioBuffer) {
      return res.status(404).json({ error: "Audio not found" });
    }
    
    // Check if this is a download request
    const isDownload = req.query.download === 'true';
    
    const headers: Record<string, string> = {
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length.toString(),
      'Cache-Control': 'public, max-age=3600',
      'Accept-Ranges': 'bytes'
    };
    
    // Force download with proper headers
    if (isDownload) {
      headers['Content-Disposition'] = `attachment; filename="podcast-${audioId}.mp3"`;
      headers['Content-Transfer-Encoding'] = 'binary';
      headers['Content-Type'] = 'application/octet-stream';
    }
    
    res.set(headers);
    res.send(audioBuffer);
  });

  // Dedicated download endpoint
  app.get("/api/download-audio/:audioId", (req, res) => {
    const { audioId } = req.params;
    const audioBuffer = audioCache.get(audioId);
    
    if (!audioBuffer) {
      return res.status(404).json({ error: "Audio not found" });
    }
    
    // Force download with aggressive headers
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="podcast-${audioId}.mp3"`,
      'Content-Length': audioBuffer.length.toString(),
      'Content-Transfer-Encoding': 'binary',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Expires': '0'
    });
    
    res.send(audioBuffer);
  });

  // Rewrite content based on selected text or document sections
  app.post("/api/rewrite-content", async (req, res) => {
    try {
      const { documentId, selectedText, instructions } = req.body;
      
      if (!documentId) {
        return res.status(400).json({ error: "Document ID is required" });
      }
      
      if (!instructions || !instructions.trim()) {
        return res.status(400).json({ error: "Rewrite instructions are required" });
      }
      
      // Get document
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Determine content to rewrite
      let contentToRewrite = '';
      let contextInfo = '';
      
      if (selectedText && selectedText.trim()) {
        // User has selected specific text
        contentToRewrite = selectedText.trim();
        contextInfo = 'The user has selected specific text to rewrite.';
      } else {
        // No text selected - use full document and let AI identify sections based on instructions
        contentToRewrite = document.content;
        contextInfo = 'The user has not selected specific text. Use the instructions to identify which part of the document to rewrite.';
      }
      
      // Create comprehensive prompt for rewriting
      const prompt = `You are an expert content rewriter. Your task is to rewrite content according to specific user instructions.

${contextInfo}

USER INSTRUCTIONS: ${instructions}

CONTENT TO PROCESS:
${contentToRewrite}

INSTRUCTIONS FOR REWRITING:
1. If the user specified a particular section (like "Chapter 2", "Introduction", etc.), identify and rewrite only that section
2. If no specific section is mentioned, rewrite the entire provided content
3. Follow the user's style and formatting instructions exactly
4. Preserve any important information while applying the requested changes
5. Maintain the logical flow and structure unless instructed otherwise
6. If you cannot identify a requested section, explain what sections are available

IMPORTANT: Return ONLY the rewritten content. Do not include explanations, introductions, or meta-commentary unless specifically requested by the user.`;

      console.log(`🔄 REWRITE REQUEST - Instructions: "${instructions.substring(0, 100)}...", Content length: ${contentToRewrite.length}`);
      
      // Generate rewrite using OpenAI
      const rewriteResponse = await openaiService.generateChatResponse(
        prompt,
        '',
        []
      );
      
      if (rewriteResponse.error) {
        return res.status(500).json({ error: rewriteResponse.error });
      }
      
      // Clean the response of any markdown formatting
      const cleanedRewrittenContent = removeMarkupSymbols(rewriteResponse.message);
      
      console.log(`✅ REWRITE COMPLETED - Output length: ${cleanedRewrittenContent.length} chars`);
      
      res.json({ rewrittenContent: cleanedRewrittenContent });
      
    } catch (error) {
      console.error("Content rewrite error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to rewrite content" 
      });
    }
  });

  // Generate Test Me questions
  app.post("/api/generate-test", async (req, res) => {
    try {
      const { selectedText, provider = 'openai', difficulty = 5 } = req.body;

      if (!selectedText?.trim()) {
        return res.status(400).json({ error: 'Selected text is required' });
      }

      console.log(`📝 GENERATING TEST - Provider: ${provider}, Difficulty: ${difficulty}/10, Text length: ${selectedText.length}`);

      // Create difficulty-aware test generation prompt
      const getDifficultyInstruction = (level: number) => {
        switch (level) {
          case 1:
          case 2: return "Create EXTREMELY BASIC questions for complete beginners. Use the simplest possible language, ask only about obvious facts directly stated in the text. Questions should be answerable by someone with minimal reading comprehension. Focus on 'what', 'who', 'when' questions with answers literally spelled out in the passage.";
          case 3:
          case 4: return "Create ELEMENTARY to INTERMEDIATE level questions that test basic understanding and simple applications of concepts.";
          case 5: return "Create STANDARD level questions that test comprehension, analysis, and application of key concepts.";
          case 6:
          case 7: return "Create ADVANCED level questions requiring deeper analysis, synthesis, and critical thinking about complex relationships.";
          case 8:
          case 9: return "Create GRADUATE level questions that demand sophisticated analysis, evaluation, and synthesis of advanced concepts.";
          case 10: return "Create EXPERT-LEVEL questions that would challenge PhD scholars and research specialists. Require deep theoretical understanding, synthesis across multiple domains, critical evaluation of methodological assumptions, analysis of implicit philosophical frameworks, and original scholarly reasoning. Questions should demand expertise in advanced academic concepts, theoretical foundations, and sophisticated intellectual frameworks that go far beyond the basic text.";
          default: return "Create STANDARD level questions that test comprehension, analysis, and application of key concepts.";
        }
      };

      const testPrompt = `Create exactly 5 questions based on the following text. The test must follow this strict format:
- Exactly 3 multiple choice questions (with 4 options each, labeled A, B, C, D)  
- Exactly 2 short answer questions

DIFFICULTY LEVEL: ${difficulty}/10 - ${getDifficultyInstruction(difficulty)}

For each question, provide:
1. The question text
2. For multiple choice: the four options and correct answer
3. For short answer: the correct/expected answer
4. A brief explanation

Return the response as valid JSON with this structure:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question text here?",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "correct_answer": "A. Option 1",
      "explanation": "Brief explanation"
    },
    {
      "id": 4,
      "type": "short_answer", 
      "question": "Question text here?",
      "correct_answer": "Expected answer here",
      "explanation": "Brief explanation"
    }
  ]
}

Text to create test from:
"""
${selectedText}
"""

IMPORTANT: Return only valid JSON. No additional text.`;

      let testResponse;
      switch (provider) {
        case 'openai':
          testResponse = await openaiService.generateChatResponse(testPrompt, selectedText, []);
          break;
        case 'deepseek':
          testResponse = await deepseekService.generateChatResponse(testPrompt, selectedText, []);
          break;
        case 'anthropic':
          testResponse = await anthropicService.generateChatResponse(testPrompt, selectedText, []);
          break;
        case 'perplexity':
          testResponse = await perplexityService.generateChatResponse(testPrompt, selectedText, []);
          break;
        default:
          testResponse = await openaiService.generateChatResponse(testPrompt, selectedText, []);
      }

      if (testResponse.error) {
        return res.status(500).json({ error: testResponse.error });
      }

      // Parse the JSON response with robust handling
      let testData;
      try {
        let cleanResponse = testResponse.message.trim();
        console.log('Raw AI response length:', cleanResponse.length);
        console.log('Raw AI response sample:', cleanResponse.substring(0, 200));
        
        // Remove any markdown code blocks if present
        const jsonMatch = cleanResponse.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          cleanResponse = jsonMatch[1];
        }
        
        // Try to fix common JSON issues
        cleanResponse = cleanResponse
          .replace(/^\s*[\r\n]+/gm, '') // Remove empty lines
          .replace(/,\s*}/g, '}')       // Remove trailing commas before }
          .replace(/,\s*]/g, ']')       // Remove trailing commas before ]
          .trim();
          
        // If response seems truncated, try to close it
        if (!cleanResponse.endsWith('}') && !cleanResponse.endsWith(']')) {
          // Count open braces/brackets and try to close them
          const openBraces = (cleanResponse.match(/{/g) || []).length;
          const closeBraces = (cleanResponse.match(/}/g) || []).length;
          const openBrackets = (cleanResponse.match(/\[/g) || []).length;
          const closeBrackets = (cleanResponse.match(/]/g) || []).length;
          
          // Add missing closing brackets/braces
          for (let i = 0; i < openBrackets - closeBrackets; i++) {
            cleanResponse += ']';
          }
          for (let i = 0; i < openBraces - closeBraces; i++) {
            cleanResponse += '}';
          }
        }
        
        testData = JSON.parse(cleanResponse);
        
        // Validate the structure
        if (!testData.questions || !Array.isArray(testData.questions) || testData.questions.length !== 5) {
          throw new Error('Invalid test structure - must have exactly 5 questions');
        }
        
      } catch (parseError) {
        console.error('Failed to parse test JSON:', parseError);
        console.error('Attempted to parse:', testResponse.message?.substring(0, 500));
        return res.status(500).json({ error: 'Failed to generate valid test format. Please try again.' });
      }

      console.log(`✅ TEST GENERATED - ${testData.questions?.length} questions`);
      res.json(testData);

    } catch (error) {
      console.error('Error generating test:', error);
      res.status(500).json({ error: 'Failed to generate test' });
    }
  });

  // Grade Test Me answers
  app.post("/api/grade-test", async (req, res) => {
    try {
      const { questions, userAnswers, selectedText, provider = 'openai' } = req.body;

      if (!questions || !userAnswers) {
        return res.status(400).json({ error: 'Questions and user answers are required' });
      }

      console.log(`🔍 GRADING TEST - Provider: ${provider}, ${questions.length} questions`);

      // Create grading prompt
      const gradingPrompt = `Grade this test based on the original text. For each question, determine if the user's answer is correct and provide feedback.

Original text:
"""
${selectedText}
"""

Questions and User Answers:
${questions.map((q: any, i: number) => {
  const userAnswer = userAnswers[q.id] || 'No answer provided';
  return `
Question ${i + 1} (${q.type}): ${q.question}
${q.type === 'multiple_choice' ? `Options: ${q.options?.join(', ')}` : ''}
Correct Answer: ${q.correct_answer}
User Answer: ${userAnswer}
`;
}).join('\n')}

Provide grading results as JSON:
{
  "score": number (total correct answers),
  "totalQuestions": ${questions.length},
  "feedback": [
    {
      "questionId": 1,
      "isCorrect": true/false,
      "userAnswer": "user's answer",
      "correctAnswer": "correct answer", 
      "explanation": "detailed explanation of why correct/incorrect"
    }
  ]
}

IMPORTANT: Return only valid JSON. No additional text.`;

      let gradingResponse;
      switch (provider) {
        case 'openai':
          gradingResponse = await openaiService.generateChatResponse(gradingPrompt, selectedText, []);
          break;
        case 'deepseek':
          gradingResponse = await deepseekService.generateChatResponse(gradingPrompt, selectedText, []);
          break;
        case 'anthropic':
          gradingResponse = await anthropicService.generateChatResponse(gradingPrompt, selectedText, []);
          break;
        case 'perplexity':
          gradingResponse = await perplexityService.generateChatResponse(gradingPrompt, selectedText, []);
          break;
        default:
          gradingResponse = await openaiService.generateChatResponse(gradingPrompt, selectedText, []);
      }

      if (gradingResponse.error) {
        return res.status(500).json({ error: gradingResponse.error });
      }

      // Parse the JSON response
      let gradingData;
      try {
        const cleanResponse = gradingResponse.message.trim();
        // Remove any markdown code blocks if present
        const jsonMatch = cleanResponse.match(/```json\n?([\s\S]*?)\n?```/);
        const jsonString = jsonMatch ? jsonMatch[1] : cleanResponse;
        gradingData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Failed to parse grading JSON:', parseError);
        return res.status(500).json({ error: 'Failed to generate valid grading results' });
      }

      console.log(`✅ TEST GRADED - Score: ${gradingData.score}/${gradingData.totalQuestions}`);
      res.json(gradingData);

    } catch (error) {
      console.error('Error grading test:', error);
      res.status(500).json({ error: 'Failed to grade test' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
