import { EventEmitter } from 'events';
import { Request, Response } from 'express';

export interface LogMessage {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'DEBUG';
    message: string;
    metadata?: any;
}

class LogService extends EventEmitter {
    private clients: Response[] = [];

    constructor() {
        super();
    }

    /**
     * Add a new client for SSE streaming
     */
    addClient(res: Response) {
        this.clients.push(res);

        // Send initial connection message
        this.sendToClient(res, {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: 'Connected to Glass Box Debug Stream'
        });

        // Remove client on close
        res.on('close', () => {
            this.clients = this.clients.filter(client => client !== res);
        });
    }

    /**
     * Broadcast a log message to all connected clients
     */
    broadcast(level: LogMessage['level'], message: string, metadata?: any) {
        const log: LogMessage = {
            timestamp: new Date().toISOString(),
            level,
            message,
            metadata
        };

        this.clients.forEach(client => {
            this.sendToClient(client, log);
        });

        // Also log to console for standard debugging
        const color = level === 'ERROR' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : level === 'SUCCESS' ? '\x1b[32m' : '\x1b[36m';
        console.log(`${color}[${level}] ${message}\x1b[0m`);
    }

    private sendToClient(res: Response, data: LogMessage) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
}

export const logService = new LogService();
