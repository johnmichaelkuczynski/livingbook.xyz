import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  content: text("content").notNull(),
  isChunked: boolean("is_chunked").default(false).notNull(),
  chunkCount: integer("chunk_count").default(1).notNull(),
  totalWords: integer("total_words").notNull(),
  filePath: text("file_path"), // For storing original PDF file path
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const documentChunks = pgTable("document_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  wordCount: integer("word_count").notNull(),
  startPosition: integer("start_position").notNull(),
  endPosition: integer("end_position").notNull(),
  isModified: boolean("is_modified").default(false).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comparisonSessions = pgTable("comparison_sessions", {
  id: serial("id").primaryKey(),
  documentAId: integer("document_a_id").references(() => documents.id),
  documentBId: integer("document_b_id").references(() => documents.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comparisonMessages = pgTable("comparison_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => comparisonSessions.id).notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => chatSessions.id).notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
  isChunked: true,
  chunkCount: true,
}).extend({
  filePath: z.string().optional(),
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export const insertComparisonSessionSchema = createInsertSchema(comparisonSessions).omit({
  id: true,
  createdAt: true,
});

export const insertComparisonMessageSchema = createInsertSchema(comparisonMessages).omit({
  id: true,
  timestamp: true,
});

export const insertDocumentChunkSchema = createInsertSchema(documentChunks).omit({
  id: true,
  timestamp: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocumentChunk = z.infer<typeof insertDocumentChunkSchema>;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertComparisonSession = z.infer<typeof insertComparisonSessionSchema>;
export type ComparisonSession = typeof comparisonSessions.$inferSelect;
export type InsertComparisonMessage = z.infer<typeof insertComparisonMessageSchema>;
export type ComparisonMessage = typeof comparisonMessages.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
