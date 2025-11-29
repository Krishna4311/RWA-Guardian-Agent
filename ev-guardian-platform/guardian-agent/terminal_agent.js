const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const path = require('path');

// CONFIG
const API_URL = 'http://localhost:5000/predict';
const CSV_PATH = path.join(__dirname, '../rwa-data-feed/large_synthetic_ev_data.csv');

// COLORS for Terminal
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

async function runTerminalDashboard() {
    console.clear();
    console.log(`${BOLD}🛡️  RWA GUARDIAN AGENT - TERMINAL DASHBOARD 🛡️${RESET}`);
    console.log("------------------------------------------------");
    console.log(`Reading Data from: ${CSV_PATH}`);
    console.log(`AI Brain at:       ${API_URL}`);
    console.log("------------------------------------------------\n");

    const sessions = {};

    // 1. Read and Parse CSV
    fs.createReadStream(CSV_PATH)
        .pipe(csv())
        .on('data', (row) => {
            const sid = row.session_id;
            if (!sessions[sid]) sessions[sid] = [];
            
            // Convert strings to numbers
            sessions[sid].push({
                time_index: parseInt(row.time_index),
                voltage: parseFloat(row.voltage),
                current: parseFloat(row.current),
                energy_kwh: parseFloat(row.energy_kwh)
            });
        })
        .on('end', async () => {
            console.log(`${YELLOW}Dataset loaded. Processing ${Object.keys(sessions).length} sessions...${RESET}\n`);
            await processSessions(sessions);
        });
}

async function processSessions(sessions) {
    let fraudCount = 0;
    let safeCount = 0;

    for (const [sessionId, data] of Object.entries(sessions)) {
        try {
            // 2. Ask the Python Brain
            const response = await axios.post(API_URL, {
                session_id: sessionId,
                data: data
            });

            const result = response.data;
            
            // 3. Print Result
            if (result.status === 'FRAUD') {
                fraudCount++;
                console.log(`${RED}[ALERT] 🚨 Session ${sessionId} -> FRAUD DETECTED!${RESET}`);
                console.log(`   Reason: ${result.reason}`);
            } else {
                safeCount++;
                console.log(`${GREEN}[SAFE]  ✅ Session ${sessionId} -> Verified.${RESET}`);
            }
            
            // Add a tiny delay to look like "processing"
            await new Promise(r => setTimeout(r, 100)); 

        } catch (error) {
            console.log(`${RED}[ERROR] Could not connect to AI Brain for ${sessionId}.${RESET}`);
            if (error.code === 'ECONNREFUSED') {
                console.log("   👉 Is 'fraud_detect.py' running on port 5000?");
                process.exit(1);
            }
        }
    }

    // 4. Final Summary
    console.log("\n------------------------------------------------");
    console.log(`${BOLD}FINAL REPORT:${RESET}`);
    console.log(`✅ Safe Sessions:  ${safeCount}`);
    console.log(`🚨 Fraud Detected: ${fraudCount}`);
    console.log("------------------------------------------------");
}

runTerminalDashboard();