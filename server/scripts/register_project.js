import axios from 'axios';
import crypto from 'crypto';

const REGISTRY_URL = 'http://localhost:3001/api/v1';
const ADMIN_KEY = '1234567890abcdef1234567890abcdef'; // From docker setup

async function registerProject() {
    try {
        console.log('Registering project...');
        const response = await axios.post(`${REGISTRY_URL}/registry`, {
            name: 'RWA Guardian Agent',
            description: 'Agent for monitoring EV charging sessions',
            network: 'Mainnet',
            sellingWalletVkey: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
            ExampleOutputs: [{ name: 'example', description: 'example output', url: 'http://example.com', mimeType: 'application/json' }],
            Tags: ['monitoring', 'ev'],
            apiBaseUrl: 'http://localhost:5000/api',
            Capability: {
                name: 'RWA Monitoring',
                version: '1.0.0',
                description: 'Monitors EV charging sessions for fraud'
            },
            AgentPricing: {
                pricingType: 'Fixed',
                Pricing: [
                    {
                        unit: '',
                        amount: '1000000'
                    }
                ]
            },
            Author: {
                name: 'RWA Team',
                contactEmail: 'admin@rwa.com'
            }
        }, {
            headers: {
                'token': ADMIN_KEY
            }
        });

        console.log('Project registered successfully!');
        console.log('Project ID:', response.data.id);
        console.log('API Key:', response.data.apiKey);

        // Output for parsing
        console.log(`\nMASUMI_PROJECT_ID=${response.data.id}`);
        console.log(`MASUMI_API_KEY=${response.data.apiKey}`);

    } catch (error) {
        console.error('Error registering project:', error.response ? error.response.data : error.message);
    }
}

registerProject();
