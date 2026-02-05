import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { storage } from "./storage";
import { AssemblyAI } from "assemblyai";

const JWT_SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-prod";

interface AuthRequest extends Request {
  userId?: string;
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

const upload = multer({ storage: multer.memoryStorage() });

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  hi: "Hindi",
  ru: "Russian",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  vi: "Vietnamese",
  th: "Thai",
};

// Translate text using AssemblyAI's LeMUR Task API
async function translateWithLemur(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  apiKey: string
): Promise<string> {
  if (!text || text.trim().length === 0) {
    return text;
  }

  if (sourceLanguage === targetLanguage) {
    return text;
  }

  const sourceLang = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const targetLang = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  try {
    const response = await fetch("https://api.assemblyai.com/lemur/v3/generate/task", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `Translate the following text from ${sourceLang} to ${targetLang}. Only output the translation, nothing else:\n\n${text}`,
        input_text: text,
        final_model: "anthropic/claude-3-5-sonnet",
        temperature: 0.2,
        max_output_size: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LeMUR translation error:", errorText);
      return text;
    }

    const result = await response.json();
    return result.response?.trim() || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        name,
        email,
        password: hashedPassword,
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });

      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });

      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Session routes
  app.post("/api/sessions", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { sourceLanguage, targetLanguage } = req.body;
      const userId = req.userId!;

      const session = await storage.createSession({
        userId,
        sourceLanguage: sourceLanguage || "es",
        targetLanguage: targetLanguage || "en",
        duration: 0,
        speakerCount: 1,
      });

      res.json(session);
    } catch (error) {
      console.error("Create session error:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.get("/api/sessions", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const sessions = await storage.getSessionsByUserId(userId);
      
      const sessionsWithPreview = await Promise.all(
        sessions.map(async (session) => {
          const utterances = await storage.getUtterancesBySessionId(session.id);
          const preview = utterances[0]?.translatedText?.slice(0, 100) || "";
          return { ...session, preview };
        })
      );

      res.json(sessionsWithPreview);
    } catch (error) {
      console.error("Get sessions error:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.get("/api/sessions/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id as string);
      const userId = req.userId!;

      const session = await storage.getSessionById(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      const utterances = await storage.getUtterancesBySessionId(sessionId);
      res.json({ ...session, utterances });
    } catch (error) {
      console.error("Get session error:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  // Finalize session endpoint (for updating session after recording stops)
  app.post("/api/sessions/:id/finalize", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id as string);
      const userId = req.userId!;
      const { duration, utterances } = req.body;

      const session = await storage.getSessionById(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Save utterances to database
      if (utterances && utterances.length > 0) {
        const utteranceData = utterances.map((u: any, i: number) => ({
          sessionId,
          speakerLabel: u.speaker || "A",
          originalText: u.originalText || u.text,
          translatedText: u.translatedText || u.text,
          confidence: u.confidence || 0.9,
          startTime: u.startTime || i * 5000,
          endTime: u.endTime || (i + 1) * 5000,
        }));

        await storage.createUtterances(utteranceData);
      }

      // Calculate quality metrics
      const avgConfidence = utterances && utterances.length > 0
        ? utterances.reduce((sum: number, u: any) => sum + (u.confidence || 0.9), 0) / utterances.length
        : 0.9;
      const speakerCount = utterances ? new Set(utterances.map((u: any) => u.speaker)).size : 1;
      const totalWordCount = utterances
        ? utterances.reduce((sum: number, u: any) => sum + (u.translatedText || u.text || "").split(" ").length, 0)
        : 0;

      // Update session
      await storage.updateSession(sessionId, {
        duration: duration || 0,
        speakerCount,
        avgConfidence,
        totalWordCount,
      });

      res.json({ success: true, sessionId });
    } catch (error) {
      console.error("Finalize session error:", error);
      res.status(500).json({ error: "Failed to finalize session" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time streaming transcription with AssemblyAI
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/transcribe" });

  wss.on("connection", async (clientWs: WebSocket, req) => {
    console.log("Client connected to transcription WebSocket");

    let assemblyWs: WebSocket | null = null;
    let sessionConfig: { sessionId: number; sourceLanguage: string; targetLanguage: string; userId: string } | null = null;
    let isAuthenticated = false;
    let assemblyApiKey: string | null = null;

    clientWs.on("message", async (data) => {
      try {
        // Check if it's a control message (JSON) or audio data
        if (typeof data === "string" || (data instanceof Buffer && data[0] === 123)) {
          const message = JSON.parse(data.toString());

          if (message.type === "auth") {
            // Authenticate the connection
            const decoded = verifyToken(message.token);
            if (!decoded) {
              clientWs.send(JSON.stringify({ type: "error", message: "Authentication failed" }));
              clientWs.close();
              return;
            }
            isAuthenticated = true;
            clientWs.send(JSON.stringify({ type: "auth_success" }));
            return;
          }

          if (message.type === "start") {
            if (!isAuthenticated) {
              clientWs.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
              return;
            }

            sessionConfig = {
              sessionId: message.sessionId,
              sourceLanguage: message.sourceLanguage || "es",
              targetLanguage: message.targetLanguage || "en",
              userId: message.userId,
            };

            assemblyApiKey = process.env.ASSEMBLYAI_API_KEY || null;
            if (!assemblyApiKey) {
              clientWs.send(JSON.stringify({ type: "error", message: "AssemblyAI API key not configured" }));
              return;
            }

            // Connect to AssemblyAI real-time streaming
            const assemblyUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000`;
            assemblyWs = new WebSocket(assemblyUrl, {
              headers: { Authorization: assemblyApiKey },
            });

            assemblyWs.on("open", () => {
              console.log("Connected to AssemblyAI real-time streaming");
              clientWs.send(JSON.stringify({ type: "ready" }));
            });

            assemblyWs.on("message", async (assemblyData) => {
              try {
                const result = JSON.parse(assemblyData.toString());

                if (result.message_type === "FinalTranscript" && result.text) {
                  console.log("Final transcript:", result.text);

                  // Translate using AssemblyAI LeMUR
                  let translatedText = result.text;
                  if (sessionConfig && sessionConfig.sourceLanguage !== sessionConfig.targetLanguage && assemblyApiKey) {
                    translatedText = await translateWithLemur(
                      result.text,
                      sessionConfig.sourceLanguage,
                      sessionConfig.targetLanguage,
                      assemblyApiKey
                    );
                    console.log("Translated:", translatedText);
                  }

                  // Send translated text to client
                  clientWs.send(JSON.stringify({
                    type: "translation",
                    speaker: "A",
                    originalText: result.text,
                    translatedText: translatedText.trim(),
                    confidence: result.confidence || 0.9,
                    startTime: result.audio_start || 0,
                    endTime: result.audio_end || 0,
                  }));
                }

                if (result.message_type === "SessionBegins") {
                  console.log("AssemblyAI session started:", result.session_id);
                }

                if (result.message_type === "SessionTerminated") {
                  console.log("AssemblyAI session terminated");
                }
              } catch (parseError) {
                console.error("Error parsing AssemblyAI message:", parseError);
              }
            });

            assemblyWs.on("error", (error) => {
              console.error("AssemblyAI WebSocket error:", error);
              clientWs.send(JSON.stringify({ type: "error", message: "Transcription service error" }));
            });

            assemblyWs.on("close", () => {
              console.log("AssemblyAI WebSocket closed");
            });

            return;
          }

          if (message.type === "stop") {
            // Close AssemblyAI connection
            if (assemblyWs && assemblyWs.readyState === WebSocket.OPEN) {
              assemblyWs.send(JSON.stringify({ terminate_session: true }));
              assemblyWs.close();
            }
            clientWs.send(JSON.stringify({ type: "stopped" }));
            return;
          }
        } else {
          // Binary audio data - forward to AssemblyAI
          if (assemblyWs && assemblyWs.readyState === WebSocket.OPEN) {
            // AssemblyAI expects base64 encoded audio
            const audioBase64 = (data as Buffer).toString("base64");
            assemblyWs.send(JSON.stringify({ audio_data: audioBase64 }));
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    clientWs.on("close", () => {
      console.log("Client disconnected from transcription WebSocket");
      if (assemblyWs && assemblyWs.readyState === WebSocket.OPEN) {
        assemblyWs.send(JSON.stringify({ terminate_session: true }));
        assemblyWs.close();
      }
    });

    clientWs.on("error", (error) => {
      console.error("Client WebSocket error:", error);
    });
  });

  return httpServer;
}
