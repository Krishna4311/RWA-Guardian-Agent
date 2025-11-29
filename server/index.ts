import express, { Request, Response } from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";
import {
  StartSimulationRequest,
  StartSimulationResponse,
  SessionListResponse,
  SessionDetailResponse,
  StopSimulationRequest,
  StopSimulationResponse,
  OnChainSessionStatus,
  StreamReading,
} from "../shared/types.js";
import { guardianAgent } from "./guardian.js";
import {
  generateNormalReading,
  generateFraudulentReading,
} from "./simulator.js";
import { streamGenerator, evaluateReading } from "./stream-engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Middleware
  app.use(express.json());

  // CORS for development
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  // ==============================
  // Session based APIs (legacy, keep for compatibility)
  // ==============================

  /**
   * POST /api/sessions/start
   * Start a new EV charging session simulation
   */
  app.post("/api/sessions/start", (req: Request, res: Response) => {
    try {
      const {
        sessionType = "normal",
        duration = 60,
        interval = 1000,
      } = req.body as StartSimulationRequest;

      const sessionId = nanoid(10);
      const session = guardianAgent.createSession(sessionId);

      console.log(
        `🔋 Starting ${sessionType} session: ${sessionId} (${duration}s, ${interval}ms interval)`
      );

      let timestamp = 0;
      let previousEnergy = 0;

      const simulationInterval = setInterval(async () => {
        const reading =
          sessionType === "normal"
            ? generateNormalReading(sessionId, timestamp, previousEnergy)
            : generateFraudulentReading(sessionId, timestamp, previousEnergy);
        previousEnergy = reading.energyKWh;
        await guardianAgent.addReading(sessionId, reading);
        timestamp++;
        if (timestamp >= duration) {
          guardianAgent.finalizeSession(sessionId);
          const finalSession = guardianAgent.getSession(sessionId);
          if (finalSession && finalSession.onChainAction !== "NONE") {
            guardianAgent
              .submitToCardano(sessionId)
              .then((result) => {
                console.log(`✅ Submitted to Cardano: ${result.txHash}`);
              })
              .catch((error) => {
                console.error(`❌ Failed to submit to Cardano:`, error);
              });
          }
        }
      }, interval);

      guardianAgent.registerSimulation(sessionId, simulationInterval);

      const response: StartSimulationResponse = {
        sessionId,
        message: `${sessionType} session started`,
      };
      res.json(response);
    } catch (error) {
      console.error("Error starting simulation:", error);
      res.status(500).json({ error: "Failed to start simulation" });
    }
  });

  /**
   * POST /api/sessions/:sessionId/stop
   * Stop a running simulation
   */
  app.post("/api/sessions/:sessionId/stop", (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = guardianAgent.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      guardianAgent.finalizeSession(sessionId);
      if (session.onChainAction !== "NONE") {
        guardianAgent
          .submitToCardano(sessionId)
          .then((result) => {
            console.log(`✅ Submitted to Cardano: ${result.txHash}`);
          })
          .catch((error) => {
            console.error(`❌ Failed to submit to Cardano:`, error);
          });
      }
      const response: StopSimulationResponse = {
        sessionId,
        message: "Session stopped",
        finalStatus: session.status,
      };
      res.json(response);
    } catch (error) {
      console.error("Error stopping simulation:", error);
      res.status(500).json({ error: "Failed to stop simulation" });
    }
  });

  /** GET /api/sessions */
  app.get("/api/sessions", (_req: Request, res: Response) => {
    try {
      const sessions = guardianAgent.getAllSessions();
      const response: SessionListResponse = { sessions };
      res.json(response);
    } catch (error) {
      console.error("Error getting sessions:", error);
      res.status(500).json({ error: "Failed to get sessions" });
    }
  });

  /** GET /api/sessions/:sessionId */
  app.get("/api/sessions/:sessionId", (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = guardianAgent.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const response: SessionDetailResponse = { session };
      res.json(response);
    } catch (error) {
      console.error("Error getting session:", error);
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  /** GET /api/cardano/status/:sessionId */
  app.get("/api/cardano/status/:sessionId", (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = guardianAgent.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const response: OnChainSessionStatus = {
        sessionId,
        status: session.status,
        txHash:
          session.onChainAction !== "NONE"
            ? `0x${Math.random().toString(16).substring(2, 66)}`
            : undefined,
        updatedAt: session.updatedAt,
      };
      res.json(response);
    } catch (error) {
      console.error("Error getting Cardano status:", error);
      res.status(500).json({ error: "Failed to get Cardano status" });
    }
  });

  /** DELETE /api/sessions/:sessionId */
  app.delete("/api/sessions/:sessionId", (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      guardianAgent.stopSimulation(sessionId);
      res.json({ message: "Session deleted" });
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  // ==============================
  // New Continuous Stream APIs
  // ==============================

  // Start the generator (runs continuously)
  streamGenerator.start();

  /**
   * GET /api/live-stream
   * Server‑Sent Events endpoint that streams readings with classification.
   */
  app.get("/api/live-stream", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const unsubscribe = streamGenerator.subscribe((data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    req.on("close", () => {
      unsubscribe();
    });
  });

  /**
   * POST /api/check-reading
   * Stateless validation of a single reading or an array of readings.
   */
  app.post("/api/check-reading", (req: Request, res: Response) => {
    try {
      const input = req.body;
      if (Array.isArray(input)) {
        if (input.length === 0) {
          return res.status(400).json({ error: "Empty array" });
        }
        const lastReading = input[input.length - 1] as StreamReading;
        const prevReading = input.length > 1 ? (input[input.length - 2] as StreamReading) : undefined;
        const result = evaluateReading(lastReading, prevReading);
        res.json(result);
      } else {
        const result = evaluateReading(input as StreamReading);
        res.json(result);
      }
    } catch (error) {
      console.error("Error checking reading:", error);
      res.status(500).json({ error: "Failed to check reading" });
    }
  });

  /**
   * GET /api/blockchain-records
   * Get blockchain transaction records (fraud detections submitted to chain)
   */
  app.get("/api/blockchain-records", (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const records = streamGenerator.getBlockchainRecords(limit);
      res.json({
        records,
        total: records.length
      });
    } catch (error) {
      console.error("Error getting blockchain records:", error);
      res.status(500).json({ error: "Failed to get blockchain records" });
    }
  });

  // ==============================
  // Static Files & Client‑Side Routing
  // ==============================
  // In development, Vite serves the frontend on port 3000
  // In production, we serve the built static files
  if (process.env.NODE_ENV === "production") {
    const staticPath = path.resolve(__dirname, "public");
    app.use(express.static(staticPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    console.log(`🚀 EV Guardian Server running on http://localhost:${port}/`);
    console.log(`📡 API available at http://localhost:${port}/api`);
  });
}

startServer().catch(console.error);
