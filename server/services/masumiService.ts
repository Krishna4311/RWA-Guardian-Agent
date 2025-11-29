import axios from 'axios';
import crypto from 'crypto';

export class MasumiService {
    private apiUrl: string;
    private projectId: string;
    private apiKey: string;
    private privateKey: string;

    constructor() {
        this.apiUrl = process.env.MASUMI_API_URL || 'https://api.masumi.network/api/v1';
        this.projectId = process.env.MASUMI_PROJECT_ID || 'MOCK_PROJECT_ID';
        this.apiKey = process.env.MASUMI_API_KEY || 'MOCK_API_KEY';
        this.privateKey = process.env.AGENT_WALLET_PRIVATE_KEY || 'MOCK_PRIVATE_KEY';
    }

    /**
     * Hashes the data using SHA-256
     */
    private hashData(data: any): string {
        const jsonString = JSON.stringify(data);
        return crypto.createHash('sha256').update(jsonString).digest('hex');
    }

    /**
     * Logs an audit record to the Masumi Network
     */
    public async logAuditRecord(data: any): Promise<{ txId: string; verified: boolean }> {
        // Mock Mode if no real credentials
        if (this.projectId === 'MOCK_PROJECT_ID') {
            console.log('⚠️ MasumiService: Running in MOCK MODE');
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
            return {
                txId: `0x${crypto.randomBytes(32).toString('hex')}`,
                verified: true
            };
        }

        try {
            const dataHash = this.hashData(data);

            // In a real implementation, we might sign the hash with the private key here
            // const signature = sign(dataHash, this.privateKey);

            const payload = {
                projectId: this.projectId,
                dataHash: dataHash,
                metadata: {
                    timestamp: Date.now(),
                    type: 'FRAUD_DETECTION_LOG'
                }
            };

            const response = await axios.post(`${this.apiUrl}/log`, payload, {
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 5000 // 5s timeout
            });

            if (response.status === 200 || response.status === 201) {
                return {
                    txId: response.data.txId || response.data.hash,
                    verified: true
                };
            } else {
                throw new Error(`Masumi API returned status ${response.status}`);
            }

        } catch (error) {
            console.error('❌ MasumiService Error:', error instanceof Error ? error.message : error);
            // Do not crash the app, return unverified
            return {
                txId: '',
                verified: false
            };
        }
    }
}

export const masumiService = new MasumiService();
