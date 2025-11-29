import axios from "axios";
import {
    StartSimulationRequest,
    StartSimulationResponse,
    SessionListResponse,
    SessionDetailResponse,
    StopSimulationResponse,
    OnChainSessionStatus,
} from "@shared/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

export const evGuardianApi = {
    /**
     * Start a new EV charging session simulation
     */
    startSession: async (
        request: StartSimulationRequest
    ): Promise<StartSimulationResponse> => {
        const response = await api.post<StartSimulationResponse>(
            "/sessions/start",
            request
        );
        return response.data;
    },

    /**
     * Stop a running session
     */
    stopSession: async (sessionId: string): Promise<StopSimulationResponse> => {
        const response = await api.post<StopSimulationResponse>(
            `/sessions/${sessionId}/stop`
        );
        return response.data;
    },

    /**
     * Get all sessions
     */
    getAllSessions: async (): Promise<SessionListResponse> => {
        const response = await api.get<SessionListResponse>("/sessions");
        return response.data;
    },

    /**
     * Get a specific session
     */
    getSession: async (sessionId: string): Promise<SessionDetailResponse> => {
        const response = await api.get<SessionDetailResponse>(
            `/sessions/${sessionId}`
        );
        return response.data;
    },

    /**
     * Get on-chain status for a session
     */
    getCardanoStatus: async (sessionId: string): Promise<OnChainSessionStatus> => {
        const response = await api.get<OnChainSessionStatus>(
            `/cardano/status/${sessionId}`
        );
        return response.data;
    },

    /**
     * Delete a session
     */
    deleteSession: async (sessionId: string): Promise<void> => {
        await api.delete(`/sessions/${sessionId}`);
    },
};
