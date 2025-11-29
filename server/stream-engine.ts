import { StreamReading, InstantResult, StreamData, BlockchainRecord, SessionState } from "../shared/types.js";
import { masumiService } from "./services/masumiService.js";
import { logService } from "./services/LogService.js";
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DATA_PATH = path.join(__dirname, "data/testing_data.json");

/**
 * Pure function to evaluate a reading for fraud.
 * Rules:
 * - Voltage < 200 or > 260
 * - Current < 0 or > 50
 * - Energy decreasing (requires previous reading, but for stateless check we might just check ranges)
 * 
 * Note: Energy decrease check requires context. For the stateless API, we might only check ranges 
 * unless we pass an array. The prompt says "Input: either a single reading object or an array".
 * We will handle single reading range checks here.
 */
export function evaluateReading(reading: StreamReading, previousReading?: StreamReading): InstantResult {
    // Rule 1: Voltage limits
    if (reading.voltage < 200) {
        logService.broadcast('WARN', `Voltage ${reading.voltage.toFixed(1)}V < 200V -> FRAUD DETECTED`);
        return { status: "FRAUD", anomalyReason: `Voltage too low: ${reading.voltage.toFixed(1)}V` };
    }
    if (reading.voltage > 260) {
        logService.broadcast('WARN', `Voltage ${reading.voltage.toFixed(1)}V > 260V -> FRAUD DETECTED`);
        return { status: "FRAUD", anomalyReason: `Voltage too high: ${reading.voltage.toFixed(1)}V` };
    }
    logService.broadcast('DEBUG', `Voltage ${reading.voltage.toFixed(1)}V is within range (200-260V)`);

    // Rule 2: Current limits
    if (reading.current < 0) {
        logService.broadcast('WARN', `Current ${reading.current.toFixed(1)}A < 0A -> FRAUD DETECTED`);
        return { status: "FRAUD", anomalyReason: `Current negative: ${reading.current.toFixed(1)}A` };
    }
    if (reading.current > 50) {
        logService.broadcast('WARN', `Current ${reading.current.toFixed(1)}A > 50A -> FRAUD DETECTED`);
        return { status: "FRAUD", anomalyReason: `Current too high: ${reading.current.toFixed(1)}A` };
    }
    logService.broadcast('DEBUG', `Current ${reading.current.toFixed(1)}A is within range (0-50A)`);

    // Rule 3: Energy decrease (only if previous reading is provided)
    if (previousReading && reading.energyKWh < previousReading.energyKWh) {
        logService.broadcast('WARN', `Energy decreased: ${previousReading.energyKWh.toFixed(4)} -> ${reading.energyKWh.toFixed(4)} -> FRAUD DETECTED`);
        return { status: "FRAUD", anomalyReason: `Energy decreased: ${previousReading.energyKWh.toFixed(4)} -> ${reading.energyKWh.toFixed(4)}` };
    }

    logService.broadcast('SUCCESS', `Reading Validated: ${reading.voltage}V, ${reading.current}A`);
    return { status: "VALID" };
}

/**
 * Continuous Data Generator
 */
export class StreamGenerator {
    private intervalId: NodeJS.Timeout | null = null;
    private subscribers: ((data: StreamData) => void)[] = [];

    // State for the generator
    private timestamp = 0;
    private energyKWh = 0;
    private lastReading: StreamReading | undefined;

    // Test Data State
    private testSessions: SessionState[] = [];
    private currentSessionIndex = 0;
    private currentReadingIndex = 0;

    // Blockchain transaction records
    private blockchainRecords: BlockchainRecord[] = [];

    // Global counters
    private totalReadings = 0;
    private totalValid = 0;
    private totalFraud = 0;

    constructor() { }

    start(intervalMs: number = 1000) {
        if (this.intervalId) return;

        // Load Test Data
        try {
            if (fs.existsSync(TEST_DATA_PATH)) {
                const raw = fs.readFileSync(TEST_DATA_PATH, "utf-8");
                const json = JSON.parse(raw);
                this.testSessions = json.sessions;
                console.log(`Loaded ${this.testSessions.length} test sessions.`);
            } else {
                console.warn("Test data not found, falling back to random generation.");
            }
        } catch (err) {
            console.error("Failed to load test data:", err);
        }

        console.log("Starting continuous EV data stream...");
        this.intervalId = setInterval(() => {
            this.tick();
        }, intervalMs);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    subscribe(callback: (data: StreamData) => void) {
        this.subscribers.push(callback);
        // Immediately send the last data point if available so they don't wait
        // if (this.lastReading) {
        //     const result = evaluateReading(this.lastReading); // Re-eval not strictly needed but ok
        //     callback({ ...this.lastReading, ...result });
        // }
        return () => {
            this.subscribers = this.subscribers.filter(s => s !== callback);
        };
    }

    getBlockchainRecords(limit?: number): BlockchainRecord[] {
        const records = [...this.blockchainRecords].reverse(); // Most recent first
        return limit ? records.slice(0, limit) : records;
    }



    private async submitToBlockchain(reading: StreamReading, result: InstantResult): Promise<BlockchainRecord> {
        // Simulate blockchain transaction delay
        await new Promise(resolve => setTimeout(resolve, 100));

        const txHash = `0x${Math.random().toString(16).substring(2, 66)}`;
        const blockNumber = Math.floor(Math.random() * 1000000) + 5000000;

        // 1. Create initial record
        const record: BlockchainRecord = {
            id: nanoid(10),
            txHash,
            timestamp: reading.timestamp,
            status: result.status,
            anomalyReason: result.anomalyReason,
            reading,
            blockNumber,
            confirmations: Math.floor(Math.random() * 10) + 1,
            isVerified: false
        };

        // 2. Log to Masumi Network (Async/Fire-and-forget to not block simulation)
        masumiService.logAuditRecord(record).then(masumiResult => {
            if (masumiResult.verified) {
                record.masumiTxId = masumiResult.txId;
                record.isVerified = true;
                console.log(`✅ Masumi Verified: ${masumiResult.txId.substring(0, 10)}...`);
            }
        });

        this.blockchainRecords.push(record);

        // Keep only last 1000 records to prevent memory issues
        if (this.blockchainRecords.length > 1000) {
            this.blockchainRecords.shift();
        }

        console.log(`📡 Blockchain Record Created: ${record.status} - TxHash: ${txHash.substring(0, 10)}...`);

        return record;
    }

    private async tick() {
        let reading: StreamReading;

        if (this.testSessions.length > 0) {
            // Use Test Data
            const session = this.testSessions[this.currentSessionIndex];
            const testReading = session.readings[this.currentReadingIndex];

            reading = {
                timestamp: Date.now(),
                voltage: testReading.voltage,
                current: testReading.current,
                energyKWh: testReading.energyKWh
            };

            // Advance indices
            this.currentReadingIndex++;
            if (this.currentReadingIndex >= session.readings.length) {
                this.currentReadingIndex = 0;
                this.currentSessionIndex++;
                if (this.currentSessionIndex >= this.testSessions.length) {
                    this.currentSessionIndex = 0; // Loop back to first session
                }
            }

            logService.broadcast('INFO', `Processing Session ${session.sessionId} [${this.currentReadingIndex}/${session.readings.length}]`);

        } else {
            // Fallback: Generate noisy data
            // Normal: 230V, 10A
            let voltage = 230 + (Math.random() * 6 - 3); // 227 - 233
            let current = 10 + (Math.random() * 2 - 1);  // 9 - 11

            // Randomly inject anomalies (e.g., 10% chance)
            const isAnomaly = Math.random() < 0.1;

            if (isAnomaly) {
                const anomalyType = Math.random();
                if (anomalyType < 0.33) {
                    // Voltage Spike/Dip
                    voltage = Math.random() < 0.5 ? 180 : 280;
                } else if (anomalyType < 0.66) {
                    // Current Spike/Negative
                    current = Math.random() < 0.5 ? -5 : 60;
                } else {
                    // Energy Drop (handled below)
                    // We will decrease energy instead of increasing
                }
            }

            // Calculate Energy
            // Power (kW) = V * A / 1000
            // Energy (kWh) = Power * (1s / 3600)
            const powerKW = (voltage * current) / 1000;
            const energyStep = powerKW * (1 / 3600);

            // Apply energy step
            // If it was an energy drop anomaly, we subtract
            if (isAnomaly && Math.random() > 0.66) {
                this.energyKWh = Math.max(0, this.energyKWh - 0.05);
            } else {
                this.energyKWh += Math.max(0, energyStep);
            }

            reading = {
                timestamp: Date.now(),
                voltage: parseFloat(voltage.toFixed(2)),
                current: parseFloat(current.toFixed(2)),
                energyKWh: parseFloat(this.energyKWh.toFixed(4))
            };
        }

        // 2. Evaluate
        const result = evaluateReading(reading, this.lastReading);

        // 3. Submit ALL readings to blockchain (both VALID and FRAUD)
        // We await this so we can send the record to the frontend immediately
        let blockchainRecord: BlockchainRecord | undefined;
        try {
            logService.broadcast('INFO', `Submitting ${result.status} record to Blockchain...`);
            blockchainRecord = await this.submitToBlockchain(reading, result);
        } catch (err) {
            console.error("Failed to submit to blockchain:", err);
            logService.broadcast('ERROR', `Blockchain Submission Failed: ${err}`);
        }

        // 4. Update counters
        this.totalReadings++;
        if (result.status === "VALID") {
            this.totalValid++;
        } else {
            this.totalFraud++;
        }

        // 5. Broadcast
        const data: StreamData = {
            ...reading,
            ...result,
            blockchainRecord,
            stats: {
                total: this.totalReadings,
                valid: this.totalValid,
                fraud: this.totalFraud
            }
        };

        this.subscribers.forEach(sub => sub(data));

        this.lastReading = reading;
        this.timestamp++;
    }
}

export const streamGenerator = new StreamGenerator();
