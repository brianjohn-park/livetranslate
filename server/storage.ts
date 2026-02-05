import { db } from "./db";
import {
  users,
  transcriptionSessions,
  utterances,
  User,
  InsertUser,
  TranscriptionSession,
  InsertSession,
  Utterance,
  InsertUtterance,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  createUser(data: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;

  // Sessions
  createSession(data: InsertSession): Promise<TranscriptionSession>;
  getSessionsByUserId(userId: string): Promise<TranscriptionSession[]>;
  getSessionById(id: number): Promise<TranscriptionSession | null>;
  updateSession(id: number, data: Partial<InsertSession>): Promise<TranscriptionSession | null>;

  // Utterances
  createUtterance(data: InsertUtterance): Promise<Utterance>;
  createUtterances(data: InsertUtterance[]): Promise<Utterance[]>;
  getUtterancesBySessionId(sessionId: number): Promise<Utterance[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user || null;
  }

  // Sessions
  async createSession(data: InsertSession): Promise<TranscriptionSession> {
    const [session] = await db.insert(transcriptionSessions).values(data).returning();
    return session;
  }

  async getSessionsByUserId(userId: string): Promise<TranscriptionSession[]> {
    return db
      .select()
      .from(transcriptionSessions)
      .where(eq(transcriptionSessions.userId, userId))
      .orderBy(desc(transcriptionSessions.createdAt));
  }

  async getSessionById(id: number): Promise<TranscriptionSession | null> {
    const [session] = await db
      .select()
      .from(transcriptionSessions)
      .where(eq(transcriptionSessions.id, id))
      .limit(1);
    return session || null;
  }

  async updateSession(
    id: number,
    data: Partial<InsertSession>
  ): Promise<TranscriptionSession | null> {
    const [session] = await db
      .update(transcriptionSessions)
      .set(data)
      .where(eq(transcriptionSessions.id, id))
      .returning();
    return session || null;
  }

  // Utterances
  async createUtterance(data: InsertUtterance): Promise<Utterance> {
    const [utterance] = await db.insert(utterances).values(data).returning();
    return utterance;
  }

  async createUtterances(data: InsertUtterance[]): Promise<Utterance[]> {
    if (data.length === 0) return [];
    return db.insert(utterances).values(data).returning();
  }

  async getUtterancesBySessionId(sessionId: number): Promise<Utterance[]> {
    return db
      .select()
      .from(utterances)
      .where(eq(utterances.sessionId, sessionId))
      .orderBy(utterances.startTime);
  }
}

export const storage = new DatabaseStorage();
