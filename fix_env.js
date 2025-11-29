const fs = require('fs');
const path = require('path');

const targetDir = 'masumi-services-dev-quickstart';
const envPath = path.join(targetDir, '.env');

// List files
console.log('--- Files in directory ---');
fs.readdirSync(targetDir).forEach(file => {
    console.log(`'${file}' (length: ${file.length})`);
});

// Write .env cleanly
const content = [
    'ENCRYPTION_KEY=a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
    'ADMIN_KEY=1234567890abcdef1234567890abcdef',
    'BLOCKFROST_API_KEY_MAINNET=mainnetuiN6IuvwsB3w3lcoWRxfeyXarMb846ux'
].join('\n');

try {
    fs.writeFileSync(envPath, content, 'utf8');
    console.log('\n--- .env written successfully ---');
    console.log('Content preview:');
    console.log(fs.readFileSync(envPath, 'utf8'));
} catch (err) {
    console.error('Error writing .env:', err);
}
