// EV Charging Session Types

export type SessionStatus = "PENDING" | "VALID" | "FRAUD";
export type ChargingStatus = "charging" | "finished";
export type OnChainAction = "NONE" | "COMPLETE_SESSION" | "FLAG_FRAUD";

export interface Reading {
    sessionId: string;
    timestamp: number; // seconds from session start
    voltage: number; // volts (normal ~230V)
    current: number; // amps (normal ~10A)
    energyKWh: number; // cumulative kWh
    status: ChargingStatus;
}

export interface AnomalyInfo {
    type: "voltage_low" | "voltage_high" | "current_negative" | "current_high" | "energy_decrease";
    message: string;
    timestamp: number;
    reading: Reading;
}

export interface SessionState {
    sessionId: string;
    readings: Reading[];
    status: SessionStatus;
    anomalyReason?: string;
    anomalies: AnomalyInfo[];
    onChainAction: OnChainAction;
    updatedAt: string;
    createdAt: string;
    isSimulating: boolean;
}

// API Request/Response Types

export interface StartSimulationRequest {
    sessionType: "normal" | "fraudulent";
    duration?: number; // seconds, default 60
    interval?: number; // milliseconds between readings, default 1000
}

export interface StartSimulationResponse {
    sessionId: string;
    message: string;
}

export interface SessionListResponse {
    sessions: SessionState[];
}

export interface SessionDetailResponse {
    session: SessionState;
}

export interface StopSimulationRequest {
    sessionId: string;
}

export interface StopSimulationResponse {
    sessionId: string;
    message: string;
    finalStatus: SessionStatus;
}

// Cardano Mock Types

export interface CardanoTransactionResult {
    txHash: string;
    success: boolean;
    timestamp: string;
}

export interface OnChainSessionStatus {
    sessionId: string;
    status: SessionStatus;
    txHash?: string;
    updatedAt: string;
}

// New Types for Continuous Stream & Instant Check

export interface StreamReading {
    timestamp: number;
    voltage: number;
    current: number;
    energyKWh: number;
}

export type InstantStatus = "VALID" | "FRAUD";

export interface InstantResult {
    status: InstantStatus;
    anomalyReason?: string;
}

export interface StreamData extends StreamReading, InstantResult {
    blockchainRecord?: BlockchainRecord;
    stats: {
        total: number;
        valid: number;
        fraud: number;
    };
}

// Blockchain Transaction Records

export interface BlockchainRecord {
    id: string;
    txHash: string;
    timestamp: number;
    status: InstantStatus;
    anomalyReason?: string;
    reading: StreamReading;
    blockNumber?: number;
    confirmations?: number;
}

export interface BlockchainRecordsResponse {
    records: BlockchainRecord[];
    total: number;
}
