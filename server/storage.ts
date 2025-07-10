import { documents, chatSessions, chatMessages, comparisonSessions, comparisonMessages, users, type Document, type ChatSession, type ChatMessage, type ComparisonSession, type ComparisonMessage, type User, type InsertDocument, type InsertChatSession, type InsertChatMessage, type InsertComparisonSession, type InsertComparisonMessage, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Document methods
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  updateDocument(id: number, updates: Partial<Document>): Promise<Document>;
  
  // Chat session methods
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(id: number): Promise<ChatSession | undefined>;
  getChatSessionByDocumentId(documentId: number): Promise<ChatSession | undefined>;
  
  // Chat message methods
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: number): Promise<ChatMessage[]>;
  
  // Comparison session methods
  createComparisonSession(session: InsertComparisonSession): Promise<ComparisonSession>;
  getComparisonSession(id: number): Promise<ComparisonSession | undefined>;
  updateComparisonSession(id: number, updates: Partial<ComparisonSession>): Promise<ComparisonSession | undefined>;
  
  // Comparison message methods
  createComparisonMessage(message: InsertComparisonMessage): Promise<ComparisonMessage>;
  getComparisonMessages(sessionId: number): Promise<ComparisonMessage[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private chatSessions: Map<number, ChatSession>;
  private chatMessages: Map<number, ChatMessage>;
  private comparisonSessions: Map<number, ComparisonSession>;
  private comparisonMessages: Map<number, ComparisonMessage>;
  private currentUserId: number;
  private currentDocumentId: number;
  private currentSessionId: number;
  private currentMessageId: number;
  private currentComparisonSessionId: number;
  private currentComparisonMessageId: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.chatSessions = new Map();
    this.chatMessages = new Map();
    this.comparisonSessions = new Map();
    this.comparisonMessages = new Map();
    this.currentUserId = 1;
    this.currentDocumentId = 1;
    this.currentSessionId = 1;
    this.currentMessageId = 1;
    this.currentComparisonSessionId = 1;
    this.currentComparisonMessageId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const wordCount = insertDocument.content.split(/\s+/).filter(word => word.length > 0).length;
    const document: Document = { 
      ...insertDocument, 
      id,
      totalWords: wordCount,
      isChunked: wordCount > 1000,
      chunkCount: wordCount > 1000 ? Math.ceil(wordCount / 1000) : 1,
      uploadedAt: new Date()
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document> {
    const existingDocument = this.documents.get(id);
    if (!existingDocument) {
      throw new Error(`Document with id ${id} not found`);
    }

    const updatedDocument = { ...existingDocument, ...updates };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = this.currentSessionId++;
    const session: ChatSession = {
      ...insertSession,
      id,
      createdAt: new Date()
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    return this.chatSessions.get(id);
  }

  async getChatSessionByDocumentId(documentId: number): Promise<ChatSession | undefined> {
    return Array.from(this.chatSessions.values()).find(
      (session) => session.documentId === documentId
    );
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentMessageId++;
    const message: ChatMessage = {
      ...insertMessage,
      id,
      timestamp: new Date()
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter((message) => message.sessionId === sessionId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async createComparisonSession(insertSession: InsertComparisonSession): Promise<ComparisonSession> {
    const id = this.currentComparisonSessionId++;
    const session: ComparisonSession = {
      id,
      documentAId: insertSession.documentAId ?? null,
      documentBId: insertSession.documentBId ?? null,
      createdAt: new Date()
    };
    this.comparisonSessions.set(id, session);
    return session;
  }

  async getComparisonSession(id: number): Promise<ComparisonSession | undefined> {
    return this.comparisonSessions.get(id);
  }

  async updateComparisonSession(id: number, updates: Partial<ComparisonSession>): Promise<ComparisonSession | undefined> {
    const session = this.comparisonSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.comparisonSessions.set(id, updatedSession);
    return updatedSession;
  }

  async createComparisonMessage(insertMessage: InsertComparisonMessage): Promise<ComparisonMessage> {
    const id = this.currentComparisonMessageId++;
    const message: ComparisonMessage = {
      ...insertMessage,
      id,
      timestamp: new Date()
    };
    this.comparisonMessages.set(id, message);
    return message;
  }

  async getComparisonMessages(sessionId: number): Promise<ComparisonMessage[]> {
    return Array.from(this.comparisonMessages.values())
      .filter((message) => message.sessionId === sessionId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Document methods
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const wordCount = insertDocument.content.split(/\s+/).filter(word => word.length > 0).length;
    const documentData = {
      ...insertDocument,
      totalWords: wordCount,
      isChunked: wordCount > 1000,
      chunkCount: wordCount > 1000 ? Math.ceil(wordCount / 1000) : 1,
    };
    
    const [document] = await db.insert(documents).values(documentData).returning();
    return document;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(documents);
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document> {
    const [document] = await db.update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    
    if (!document) {
      throw new Error(`Document with id ${id} not found`);
    }
    return document;
  }

  // Chat session methods
  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const [session] = await db.insert(chatSessions).values(insertSession).returning();
    return session;
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session || undefined;
  }

  async getChatSessionByDocumentId(documentId: number): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.documentId, documentId));
    return session || undefined;
  }

  // Chat message methods
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db.insert(chatMessages).values(insertMessage).returning();
    return message;
  }

  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.timestamp);
  }

  // Comparison session methods
  async createComparisonSession(insertSession: InsertComparisonSession): Promise<ComparisonSession> {
    const [session] = await db.insert(comparisonSessions).values(insertSession).returning();
    return session;
  }

  async getComparisonSession(id: number): Promise<ComparisonSession | undefined> {
    const [session] = await db.select().from(comparisonSessions).where(eq(comparisonSessions.id, id));
    return session || undefined;
  }

  async updateComparisonSession(id: number, updates: Partial<ComparisonSession>): Promise<ComparisonSession | undefined> {
    const [session] = await db.update(comparisonSessions)
      .set(updates)
      .where(eq(comparisonSessions.id, id))
      .returning();
    return session || undefined;
  }

  // Comparison message methods
  async createComparisonMessage(insertMessage: InsertComparisonMessage): Promise<ComparisonMessage> {
    const [message] = await db.insert(comparisonMessages).values(insertMessage).returning();
    return message;
  }

  async getComparisonMessages(sessionId: number): Promise<ComparisonMessage[]> {
    return await db.select().from(comparisonMessages)
      .where(eq(comparisonMessages.sessionId, sessionId))
      .orderBy(comparisonMessages.timestamp);
  }
}

// Use database storage for production, memory storage for development/testing
export const storage = new DatabaseStorage();
