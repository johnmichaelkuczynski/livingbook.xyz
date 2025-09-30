import { documents, chatSessions, chatMessages, comparisonSessions, comparisonMessages, users, userSessions, creditTransactions, type Document, type ChatSession, type ChatMessage, type ComparisonSession, type ComparisonMessage, type User, type UserSession, type CreditTransaction, type InsertDocument, type InsertChatSession, type InsertChatMessage, type InsertComparisonSession, type InsertComparisonMessage, type InsertUser, type InsertUserSession, type InsertCreditTransaction } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  
  // User session methods
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSession(sessionToken: string): Promise<UserSession | undefined>;
  deleteUserSession(sessionToken: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
  
  // Credit transaction methods
  createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;
  getCreditTransactions(userId: number): Promise<CreditTransaction[]>;
  
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
  private userSessions: Map<string, UserSession>;
  private creditTransactions: Map<number, CreditTransaction>;
  private documents: Map<number, Document>;
  private chatSessions: Map<number, ChatSession>;
  private chatMessages: Map<number, ChatMessage>;
  private comparisonSessions: Map<number, ComparisonSession>;
  private comparisonMessages: Map<number, ComparisonMessage>;
  private currentUserId: number;
  private currentUserSessionId: number;
  private currentCreditTransactionId: number;
  private currentDocumentId: number;
  private currentSessionId: number;
  private currentMessageId: number;
  private currentComparisonSessionId: number;
  private currentComparisonMessageId: number;

  constructor() {
    this.users = new Map();
    this.userSessions = new Map();
    this.creditTransactions = new Map();
    this.documents = new Map();
    this.chatSessions = new Map();
    this.chatMessages = new Map();
    this.comparisonSessions = new Map();
    this.comparisonMessages = new Map();
    this.currentUserId = 1;
    this.currentUserSessionId = 1;
    this.currentCreditTransactionId = 1;
    this.currentDocumentId = 1;
    this.currentSessionId = 1;
    this.currentMessageId = 1;
    this.currentComparisonSessionId = 1;
    this.currentComparisonMessageId = 1;
    
    // Add a test document for functionality verification
    this.addTestDocument();
  }
  
  private addTestDocument() {
    const testDoc: Document = {
      id: 1,
      filename: 'test-doc',
      originalName: 'The Prince - Test Document.txt',
      fileType: 'text/plain',
      fileSize: 1500,
      content: `The Prince by Niccolò Machiavelli

Chapter I: How Many Kinds of Principalities There Are

All states, all powers, that have held and hold rule over men have been and are either republics or principalities. Principalities are either hereditary, in which the family has been long established; or they are new.

The new are either entirely new, as was Milan to Francesco Sforza, or they are, as it were, members annexed to the hereditary state of the prince who has acquired them, as was the kingdom of Naples to that of the King of Spain.

Such dominions thus acquired are either accustomed to live under a prince, or to live in freedom; and are acquired either by the arms of the prince himself, or of others, or else by fortune or by ability.

Chapter II: Concerning Hereditary Principalities

I will leave out all discussion on republics, and will address myself only to principalities. I say at once there are fewer difficulties in holding hereditary states, and those long accustomed to the family of their prince, than new ones; for it is sufficient only not to transgress the customs of his ancestors, and to deal prudently with circumstances as they arise.

For the hereditary prince has less cause and less necessity to offend; hence it happens that he will be more loved; and unless extraordinary vices cause him to be hated, it is reasonable to expect that his subjects will be naturally well disposed towards him.`,
      isChunked: false,
      chunkCount: 1,
      totalWords: 200,
      userId: null,
      uploadedAt: new Date()
    };
    
    this.documents.set(1, testDoc);
    
    // Create chat session for this document
    const chatSession: ChatSession = {
      id: 1,
      documentId: 1,
      userId: null,
      createdAt: new Date()
    };
    
    this.chatSessions.set(1, chatSession);
    this.currentDocumentId = 2;
    this.currentSessionId = 2;
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
    const user: User = { 
      ...insertUser, 
      id,
      credits: 0,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }
    const updatedUser = { ...existingUser, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createUserSession(insertSession: InsertUserSession): Promise<UserSession> {
    const id = this.currentUserSessionId++;
    const session: UserSession = {
      ...insertSession,
      id,
      createdAt: new Date()
    };
    this.userSessions.set(insertSession.sessionToken, session);
    return session;
  }

  async getUserSession(sessionToken: string): Promise<UserSession | undefined> {
    const session = this.userSessions.get(sessionToken);
    if (session && session.expiresAt < new Date()) {
      this.userSessions.delete(sessionToken);
      return undefined;
    }
    return session;
  }

  async deleteUserSession(sessionToken: string): Promise<void> {
    this.userSessions.delete(sessionToken);
  }

  async deleteExpiredSessions(): Promise<void> {
    const now = new Date();
    for (const [token, session] of Array.from(this.userSessions.entries())) {
      if (session.expiresAt < now) {
        this.userSessions.delete(token);
      }
    }
  }

  async createCreditTransaction(insertTransaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const id = this.currentCreditTransactionId++;
    const transaction: CreditTransaction = {
      ...insertTransaction,
      id,
      timestamp: new Date()
    };
    this.creditTransactions.set(id, transaction);
    return transaction;
  }

  async getCreditTransactions(userId: number): Promise<CreditTransaction[]> {
    return Array.from(this.creditTransactions.values())
      .filter((transaction) => transaction.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
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
      userId: insertDocument.userId ?? null,
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
      userId: insertSession.userId ?? null,
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
      userId: insertSession.userId ?? null,
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

export const storage = new MemStorage();
