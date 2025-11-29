import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { SessionState, Reading, SessionStatus } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '../data/testing_data.json');
const TOTAL_SESSIONS = 50;
const FRAUD_RATE = 0.2; // 20%

function generateReading(sessionId: string, timeOffset: number, isFraud: boolean, fraudType?: string): Reading {
    let voltage = 230 + (Math.random() * 10 - 5); // Normal: 225-235V
    let current = 10 + (Math.random() * 2 - 1);   // Normal: 9-11A

    if (isFraud) {
        if (fraudType === 'voltage_high') voltage = 270 + Math.random() * 20;
        if (fraudType === 'voltage_low') voltage = 180 - Math.random() * 20;
        if (fraudType === 'current_high') current = 60 + Math.random() * 10;
    }

    return {
        sessionId,
        timestamp: timeOffset,
        voltage,
        current,
        energyKWh: (current * voltage * (timeOffset / 3600)) / 1000, // Rough estimate
        status: 'charging'
    };
}

function generateSession(index: number): SessionState {
    const isFraud = Math.random() < FRAUD_RATE;
    const sessionId = `TEST-${nanoid(6)}`;
    const readings: Reading[] = [];
    const duration = 60; // 60 seconds per session

    let fraudType = '';
    if (isFraud) {
        const types = ['voltage_high', 'voltage_low', 'current_high'];
        fraudType = types[Math.floor(Math.random() * types.length)];
    }

    for (let i = 0; i < duration; i++) {
        readings.push(generateReading(sessionId, i, isFraud, fraudType));
    }

    return {
        sessionId,
        readings,
        status: isFraud ? 'FRAUD' : 'VALID',
        anomalyReason: isFraud ? `Simulated ${fraudType}` : undefined,
        anomalies: [], // Populated by backend during processing
        onChainAction: 'NONE',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isSimulating: false
    };
}

function main() {
    const sessions: SessionState[] = [];
    let fraudCount = 0;

    console.log(`Generating ${TOTAL_SESSIONS} sessions...`);

    for (let i = 0; i < TOTAL_SESSIONS; i++) {
        const session = generateSession(i);
        if (session.status === 'FRAUD') fraudCount++;
        sessions.push(session);
    }

    const data = {
        generatedAt: new Date().toISOString(),
        totalSessions: TOTAL_SESSIONS,
        fraudCount,
        sessions
    };

    // Ensure directory exists
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    console.log(`Successfully generated ${TOTAL_SESSIONS} sessions (${fraudCount} fraud) to ${OUTPUT_FILE}`);
}

main();
