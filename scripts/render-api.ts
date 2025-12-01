import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const RENDER_API_KEY = process.env.RENDER_API_KEY;
const RENDER_API_URL = 'https://api.render.com/v1';

if (!RENDER_API_KEY) {
    console.warn('WARNING: RENDER_API_KEY is not set in environment variables.');
}

const client = axios.create({
    baseURL: RENDER_API_URL,
    headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
});

export const renderApi = {
    /**
     * List all services
     */
    listServices: async (limit = 20) => {
        try {
            const response = await client.get(`/services?limit=${limit}`);
            return response.data;
        } catch (error: any) {
            console.error('Error listing services:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Trigger a deploy for a service
     * @param serviceId The ID of the service to deploy
     * @param clearCache Whether to clear the build cache
     */
    triggerDeploy: async (serviceId: string, clearCache = false) => {
        try {
            const response = await client.post(`/services/${serviceId}/deploys`, {
                clearCache: clearCache ? 'clear' : 'do_not_clear',
            });
            return response.data;
        } catch (error: any) {
            console.error(`Error triggering deploy for ${serviceId}:`, error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Get details of a specific deploy
     * @param serviceId The ID of the service
     * @param deployId The ID of the deploy
     */
    getDeploy: async (serviceId: string, deployId: string) => {
        try {
            const response = await client.get(`/services/${serviceId}/deploys/${deployId}`);
            return response.data;
        } catch (error: any) {
            console.error(`Error getting deploy ${deployId}:`, error.response?.data || error.message);
            throw error;
        }
    }
};

// Example usage if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    (async () => {
        if (!RENDER_API_KEY) {
            console.error('Please set RENDER_API_KEY in .env to run this script.');
            process.exit(1);
        }

        console.log('Fetching services...');
        try {
            const services = await renderApi.listServices();
            console.log('Full response:', JSON.stringify(services, null, 2));
        } catch (err) {
            console.error('Failed to list services.');
        }
    })();
}
