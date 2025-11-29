import axios from "axios";
import {
    SessionState,
    SessionStatus,
    OnChainAction,
    AnomalyInfo,
    Reading,
    CardanoTransactionResult,
} from "../shared/types.js";
// import { detectAnomalies } from "./simulator.js"; // No longer using local TS detection

const PYTHON_API_URL = "http://localhost:5000/predict";

/**
 * Guardian Agent - Monitors sessions and detects fraud
 */
export class GuardianAgent {
    private sessions: Map<string, SessionState> = new Map();
    private simulationIntervals: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Creates a new session
     */
    createSession(sessionId: string): SessionState {
        const now = new Date().toISOString();
        const session: SessionState = {
            sessionId,
            readings: [],
            status: "PENDING",
            anomalies: [],
            onChainAction: "NONE",
            updatedAt: now,
            createdAt: now,
            isSimulating: false,
        };

        this.sessions.set(sessionId, session);
        return session;
    }

    /**
     * Adds a reading to a session and analyzes it via Python API
     */
    async addReading(sessionId: string, reading: Reading): Promise<SessionState> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Add the reading
        session.readings.push(reading);

        // Call Python API for fraud detection
        try {
            // Prepare payload for Python API
            // The Python API expects: { session_id: string, data: [{ time_index, voltage, current, energy_kwh }] }
            const payload = {
                session_id: sessionId,
                data: session.readings.map(r => ({
                    time_index: r.timestamp,
                    voltage: r.voltage,
                    current: r.current,
                    energy_kwh: r.energyKWh
                }))
            };

            const response = await axios.post(PYTHON_API_URL, payload);
            const { status, reason } = response.data;

            if (status === "FRAUD") {
                // Check if we already have this anomaly to avoid duplicates (optional, but good for UI)
                // For now, we just add it if it's new or simply log it.
                // The Python API returns the *first* fraud reason it finds.

                const anomaly: AnomalyInfo = {
                    type: "voltage_high", // Default type as Python API returns a string reason
                    message: reason || "Fraud detected by Python Agent",
                    timestamp: reading.timestamp,
                    reading,
                };

                // Try to map reason to type based on the Python API response
                if (reason.toLowerCase().includes("voltage")) {
                    // Determine if it's high or low based on the message
                    anomaly.type = reason.toLowerCase().includes("low") ? "voltage_low" : "voltage_high";
                } else if (reason.toLowerCase().includes("current")) {
                    // Determine if it's negative or high based on the message
                    anomaly.type = reason.toLowerCase().includes("negative") ? "current_negative" : "current_high";
                } else if (reason.toLowerCase().includes("energy")) {
                    anomaly.type = "energy_decrease";
                }

                // Only add if not already flagged as fraud or if we want to log multiple anomalies
                // Let's add it to the list
                session.anomalies.push(anomaly);
                session.status = "FRAUD";
                session.anomalyReason = anomaly.message;
                session.onChainAction = "FLAG_FRAUD";

                console.log(`🚨 FRAUD DETECTED in session ${sessionId}: ${reason}`);
            }

        } catch (error) {
            console.error("Failed to call Python Fraud Detector:", error instanceof Error ? error.message : error);
            // Fallback or just log error. We don't want to crash the simulation.
        }

        session.updatedAt = new Date().toISOString();
        this.sessions.set(sessionId, session);

        return session;
    }

    /**
     * Finalizes a session
     */
    finalizeSession(sessionId: string): SessionState {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Stop simulation if running
        this.stopSimulation(sessionId);

        // If no anomalies detected, mark as VALID
        if (session.status === "PENDING") {
            session.status = "VALID";
            session.onChainAction = "COMPLETE_SESSION";
            console.log(`✅ Session ${sessionId} completed successfully - VALID`);
        }

        // Mark last reading as finished
        if (session.readings.length > 0) {
            session.readings[session.readings.length - 1].status = "finished";
        }

        session.isSimulating = false;
        session.updatedAt = new Date().toISOString();
        this.sessions.set(sessionId, session);

        return session;
    }

    /**
     * Gets a session by ID
     */
    getSession(sessionId: string): SessionState | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * Gets all sessions
     */
    getAllSessions(): SessionState[] {
        return Array.from(this.sessions.values());
    }

    /**
     * Register a simulation interval
     */
    registerSimulation(sessionId: string, interval: NodeJS.Timeout): void {
        this.simulationIntervals.set(sessionId, interval);
        const session = this.sessions.get(sessionId);
        if (session) {
            session.isSimulating = true;
            this.sessions.set(sessionId, session);
        }
    }

    /**
     * Stops a simulation
     */
    stopSimulation(sessionId: string): void {
        const interval = this.simulationIntervals.get(sessionId);
        if (interval) {
            clearInterval(interval);
            this.simulationIntervals.delete(sessionId);
        }

        const session = this.sessions.get(sessionId);
        if (session) {
            session.isSimulating = false;
            this.sessions.set(sessionId, session);
        }
    }

    /**
     * Simulates calling Cardano smart contract
     */
    async submitToCardano(sessionId: string): Promise<CardanoTransactionResult> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Simulate blockchain transaction delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const txHash = `0x${Math.random().toString(16).substring(2, 66)}`;

        console.log(`📡 Submitting to Cardano: Session ${sessionId}, Status: ${session.status}, TxHash: ${txHash}`);

        return {
            txHash,
            success: true,
            timestamp: new Date().toISOString(),
        };
    }
}

// Singleton instance
export const guardianAgent = new GuardianAgent();
