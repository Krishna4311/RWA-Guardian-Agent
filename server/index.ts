import axios from "axios";
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
import { logService } from "./services/LogService.js";
import { masumiService } from "./services/masumiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const port = process.env.PORT || 5000;

  // Initialize Masumi Service
  masumiService.checkConnection().then(connected => {
    if (connected) {
      console.log('✅ Masumi Service initialized and connected');
    } else {
      console.warn('⚠️ Masumi Service failed to connect - running in offline/mock mode');
    }
  });

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
   * GET /api/logs/stream
   * Server-Sent Events endpoint for detailed backend logs.
   */
  app.get("/api/logs/stream", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    logService.addClient(res);
  });

  /**
   * GET /api/masumi/status
   * Proxies request to local Masumi Payment Service to get real network status
   */
  app.get("/api/masumi/status", async (_req: Request, res: Response) => {
    try {
      // Use the internal Docker URL or localhost depending on where this runs
      // Since we are running outside docker (npm run dev), use localhost
      const MASUMI_URL = process.env.MASUMI_API_URL || 'http://localhost:3001/api/v1';
      const ADMIN_KEY = process.env.MASUMI_API_KEY || '1234567890abcdef1234567890abcdef';

      const response = await axios.get(`${MASUMI_URL}/registry?network=Mainnet`, {
        headers: { 'token': ADMIN_KEY },
        timeout: 2000
      });

      res.json({
        status: 'online',
        network: 'Mainnet',
        projects: response.data.data?.Assets || [],
        raw: response.data
      });
    } catch (error) {
      console.error('Failed to fetch Masumi status:', error instanceof Error ? error.message : error);
      res.json({
        status: 'offline',
        network: 'Mainnet',
        projects: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Serve static files from the dist directory
  app.use(express.static(path.join(__dirname, "../dist")));

  // Handle SPA routing: serve index.html for all other routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();
