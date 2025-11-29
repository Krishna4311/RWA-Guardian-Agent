import axios from 'axios';

const endpoints = [
    { name: 'Registry Health', url: 'http://localhost:3000/api/v1/health' },
    { name: 'Payment Health', url: 'http://localhost:3001/api/v1/health' },
    { name: 'Registry Projects (Direct)', url: 'http://localhost:3000/api/v1/projects' },
    { name: 'Payment Registry (Mainnet)', url: 'http://localhost:3001/api/v1/registry?network=Mainnet', headers: { 'token': '1234567890abcdef1234567890abcdef' } },
    { name: 'Payment Registry (Preprod)', url: 'http://localhost:3001/api/v1/registry?network=Preprod', headers: { 'token': '1234567890abcdef1234567890abcdef' } }
];

async function probe() {
    for (const ep of endpoints) {
        try {
            console.log(`Probing ${ep.name} (${ep.url})...`);
            const response = await axios.get(ep.url, { headers: ep.headers, timeout: 2000 });
            console.log(`✅ ${ep.name}: Status ${response.status}`);
            console.log('Data:', JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.log(`❌ ${ep.name}: Failed - ${error.message}`);
            if (error.response) {
                console.log('Response data:', JSON.stringify(error.response.data, null, 2));
            }
        }
        console.log('---');
    }
}

probe();
