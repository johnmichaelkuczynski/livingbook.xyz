import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { storage } from "./storage";

// Simple file upload configuration
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
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

// Simple text extraction function that preserves ALL formatting
async function extractDocumentText(filePath: string, mimeType: string): Promise<string> {
  if (mimeType === 'text/plain') {
    // For text files, read directly and preserve everything
    const content = await fs.readFile(filePath, 'utf-8');
    return content; // Return exactly as-is, no processing
  }
  
  if (mimeType === 'application/pdf') {
    // For PDF files - use pdf-parse to extract text
    const pdfParse = await import('pdf-parse');
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse.default(dataBuffer);
    return data.text; // Return extracted text as-is
  }
  
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // For DOCX files - use mammoth to extract text
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value; // Return extracted text as-is
  }
  
  throw new Error('Unsupported file type');
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Upload document endpoint
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { originalname, filename, mimetype, size, path: filePath } = req.file;
      const title = req.body.title || originalname;

      // Extract text content preserving ALL formatting
      const content = await extractDocumentText(filePath, mimetype);
      
      // Calculate basic metrics
      const totalWords = content.split(/\s+/).filter(word => word.length > 0).length;
      
      // Create document entry with zero processing
      const documentData = {
        originalName: originalname,
        filename: filename,
        content: content, // Store exactly as extracted, no modifications
        fileType: mimetype,
        fileSize: size,
        totalWords: totalWords
      };
      
      const document = await storage.createDocument(documentData);
      
      // Clean up uploaded file
      await fs.unlink(filePath);
      
      res.json(document);
      
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to upload document" 
      });
    }
  });

  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Get single document
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  const server = createServer(app);
  return server;
}