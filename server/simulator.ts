import { Reading, ChargingStatus } from "../shared/types.js";

/**
 * Generates a normal EV charging session with realistic values
 */
export function generateNormalReading(
    sessionId: string,
    timestamp: number,
    previousEnergy: number = 0
): Reading {
    // Normal voltage: 220-240V (centered around 230V)
    const voltage = 230 + (Math.random() - 0.5) * 10;

    // Normal current: 8-12A (centered around 10A)
    const current = 10 + (Math.random() - 0.5) * 4;

    // Energy increases based on power (V * A) over time
    // Assuming 1 second intervals: kWh = (V * A * seconds) / (1000 * 3600)
    const powerKW = (voltage * current) / 1000;
    const energyIncrement = powerKW / 3600; // for 1 second
    const energyKWh = previousEnergy + energyIncrement;

    const status: ChargingStatus = "charging";

    return {
        sessionId,
        timestamp,
        voltage: Math.round(voltage * 100) / 100,
        current: Math.round(current * 100) / 100,
        energyKWh: Math.round(energyKWh * 10000) / 10000,
        status,
    };
}

/**
 * Generates a fraudulent EV charging session with anomalies
 */
export function generateFraudulentReading(
    sessionId: string,
    timestamp: number,
    previousEnergy: number = 0
): Reading {
    // Randomly introduce anomalies
    const anomalyType = Math.random();

    let voltage: number;
    let current: number;
    let energyKWh: number;

    if (anomalyType < 0.3) {
        // Voltage anomaly (too low)
        voltage = 180 + Math.random() * 15; // 180-195V (below 200V threshold)
        current = 10 + (Math.random() - 0.5) * 4;
    } else if (anomalyType < 0.5) {
        // Voltage anomaly (too high)
        voltage = 265 + Math.random() * 15; // 265-280V (above 260V threshold)
        current = 10 + (Math.random() - 0.5) * 4;
    } else if (anomalyType < 0.7) {
        // Current anomaly (negative or too high)
        voltage = 230 + (Math.random() - 0.5) * 10;
        current = Math.random() < 0.5 ? -5 - Math.random() * 5 : 55 + Math.random() * 10;
    } else {
        // Energy decrease anomaly
        voltage = 230 + (Math.random() - 0.5) * 10;
        current = 10 + (Math.random() - 0.5) * 4;
    }

    // Calculate energy
    const powerKW = (voltage * current) / 1000;
    const energyIncrement = powerKW / 3600;

    if (anomalyType >= 0.7 && previousEnergy > 0) {
        // Force energy decrease
        energyKWh = previousEnergy - Math.random() * 0.01;
    } else {
        energyKWh = previousEnergy + Math.abs(energyIncrement);
    }

    const status: ChargingStatus = "charging";

    return {
        sessionId,
        timestamp,
        voltage: Math.round(voltage * 100) / 100,
        current: Math.round(current * 100) / 100,
        energyKWh: Math.round(energyKWh * 10000) / 10000,
        status,
    };
}

/**
 * Detects anomalies in a reading
 */
export function detectAnomalies(reading: Reading, previousReading?: Reading): {
    hasAnomaly: boolean;
    anomalyType?: string;
    message?: string;
} {
    // Check voltage anomalies
    if (reading.voltage < 200) {
        return {
            hasAnomaly: true,
            anomalyType: "voltage_low",
            message: `Voltage too low: ${reading.voltage}V (threshold: 200V)`,
        };
    }

    if (reading.voltage > 260) {
        return {
            hasAnomaly: true,
            anomalyType: "voltage_high",
            message: `Voltage too high: ${reading.voltage}V (threshold: 260V)`,
        };
    }

    // Check current anomalies
    if (reading.current < 0) {
        return {
            hasAnomaly: true,
            anomalyType: "current_negative",
            message: `Current is negative: ${reading.current}A`,
        };
    }

    if (reading.current > 50) {
        return {
            hasAnomaly: true,
            anomalyType: "current_high",
            message: `Current too high: ${reading.current}A (threshold: 50A)`,
        };
    }

    // Check energy decrease
    if (previousReading && reading.energyKWh < previousReading.energyKWh) {
        return {
            hasAnomaly: true,
            anomalyType: "energy_decrease",
            message: `Energy decreased from ${previousReading.energyKWh} to ${reading.energyKWh} kWh`,
        };
    }

    return { hasAnomaly: false };
}
