import { documents, chatSessions, chatMessages, users, formatOperations, type Document, type ChatSession, type ChatMessage, type User, type FormatOperation, type InsertDocument, type InsertChatSession, type InsertChatMessage, type InsertUser, type InsertFormatOperation } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Document methods
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  updateDocument(id: number, data: Partial<Document>): Promise<Document>;
  
  // Chat session methods
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(id: number): Promise<ChatSession | undefined>;
  getChatSessionByDocumentId(documentId: number): Promise<ChatSession | undefined>;
  
  // Chat message methods
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: number): Promise<ChatMessage[]>;
  
  // Format operation methods
  createFormatOperation(operation: InsertFormatOperation): Promise<FormatOperation>;
  getFormatOperations(documentId: number): Promise<FormatOperation[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private chatSessions: Map<number, ChatSession>;
  private chatMessages: Map<number, ChatMessage>;
  private formatOperations: Map<number, FormatOperation>;
  private currentUserId: number;
  private currentDocumentId: number;
  private currentSessionId: number;
  private currentMessageId: number;
  private currentFormatOpId: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.chatSessions = new Map();
    this.chatMessages = new Map();
    this.formatOperations = new Map();
    this.currentUserId = 1;
    this.currentDocumentId = 1;
    this.currentFormatOpId = 1;
    this.currentSessionId = 1;
    this.currentMessageId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const document: Document = { 
      ...insertDocument, 
      id,
      formattedContent: null,
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

  async updateDocument(id: number, data: Partial<Document>): Promise<Document> {
    const existing = this.documents.get(id);
    if (!existing) {
      throw new Error(`Document with id ${id} not found`);
    }
    
    const updated: Document = { ...existing, ...data };
    this.documents.set(id, updated);
    return updated;
  }

  async createFormatOperation(insertOperation: InsertFormatOperation): Promise<FormatOperation> {
    const id = this.currentFormatOpId++;
    const operation: FormatOperation = {
      ...insertOperation,
      id,
      appliedAt: new Date()
    };
    this.formatOperations.set(id, operation);
    return operation;
  }

  async getFormatOperations(documentId: number): Promise<FormatOperation[]> {
    return Array.from(this.formatOperations.values())
      .filter((operation) => operation.documentId === documentId)
      .sort((a, b) => a.appliedAt.getTime() - b.appliedAt.getTime());
  }
}

export const storage = new MemStorage();
