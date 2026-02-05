import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(transcriptionSessions),
}));

// Transcription sessions table
export const transcriptionSessions = pgTable("transcription_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceLanguage: text("source_language").notNull(),
  targetLanguage: text("target_language").notNull(),
  duration: integer("duration").default(0), // in seconds
  speakerCount: integer("speaker_count").default(1),
  avgConfidence: real("avg_confidence"),
  lowConfidenceWordCount: integer("low_confidence_word_count").default(0),
  totalWordCount: integer("total_word_count").default(0),
  transcriptionCompletionTime: integer("transcription_completion_time"), // in ms
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const transcriptionSessionsRelations = relations(transcriptionSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [transcriptionSessions.userId],
    references: [users.id],
  }),
  utterances: many(utterances),
}));

// Utterances table for individual speaker segments
export const utterances = pgTable("utterances", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => transcriptionSessions.id, { onDelete: "cascade" }),
  speakerLabel: text("speaker_label").notNull(), // "A", "B", "C", etc.
  originalText: text("original_text").notNull(),
  translatedText: text("translated_text").notNull(),
  startTime: integer("start_time"), // in ms
  endTime: integer("end_time"), // in ms
  confidence: real("confidence"),
  words: jsonb("words"), // array of word-level data with confidence
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const utterancesRelations = relations(utterances, ({ one }) => ({
  session: one(transcriptionSessions, {
    fields: [utterances.sessionId],
    references: [transcriptionSessions.id],
  }),
}));

// Quality metrics logging table
export const qualityLogs = pgTable("quality_logs", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => transcriptionSessions.id, { onDelete: "cascade" }),
  avgConfidence: real("avg_confidence"),
  lowConfidenceWordCount: integer("low_confidence_word_count"),
  sessionDuration: integer("session_duration"),
  speakerCount: integer("speaker_count"),
  translationCompletionTime: integer("translation_completion_time"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
});

export const insertSessionSchema = createInsertSchema(transcriptionSessions).omit({
  id: true,
  createdAt: true,
});

export const insertUtteranceSchema = createInsertSchema(utterances).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type TranscriptionSession = typeof transcriptionSessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Utterance = typeof utterances.$inferSelect;
export type InsertUtterance = z.infer<typeof insertUtteranceSchema>;

// Re-export chat models for OpenAI integration compatibility
export * from "./models/chat";
