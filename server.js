const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const { computeTimeDomain } = require('./hrv');
const { computeRisk } = require('./ai');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({
    server,
    path: "/"
});

server.listen(PORT, () => {
    console.log(`HUMAN ECG backend running on port ${PORT}`);
});

app.get('/', (req, res) => {
    res.send("HUMAN ECG BACKEND RUNNING");
});

// STAV: Buffer pro RR intervaly (sdílený pro připojené klienty)
let rrBuffer = [];
const MAX_RR_BUFFER = 50; 

wss.on('connection', (ws) => {
    console.log("New WebSocket connection established");

    ws.on('message', (message) => {
        let data;
        try {
            const messageString = message.toString();
            data = JSON.parse(messageString);
            
            // DIAGNOSTIKA: Každých 100 zpráv vypíšeme stav do logu Railway
            if (Math.random() > 0.99) {
                console.log(`Příjem: BPM=${data.bpm}, RR=${data.rr}, Buffer=${rrBuffer.length}`);
            }
        } catch (err) {
            return; 
        }

        /* 1. FILTRACE A UKLÁDÁNÍ RR INTERVALŮ */
        // Ignorujeme nuly a nesmyslné hodnoty (např. šum)
        if (data.rr && data.rr > 300 && data.rr < 2000) { 
            rrBuffer.push(data.rr);
            if (rrBuffer.length > MAX_RR_BUFFER) rrBuffer.shift();
        }

        /* 2. VÝPOČET HRV ANALYTIKY */
        let hrv = { rmssd: 0, sdnn: 0, pnn50: 0 };
        let riskText = "Snímám...";

        try {
            // Analýza se spustí po nasbírání alespoň 3 tepů
            if (rrBuffer.length >= 3) {
                const results = computeTimeDomain(rrBuffer);
                hrv = {
                    rmssd: results.rmssd || 0,
                    sdnn: results.sdnn || 0,
                    pnn50: results.pnn50 || 0
                };
                
                // AI vyhodnocení na základě tepu a variability
                riskText = computeRisk({ ...data, ...hrv });
            } else if (data.bpm > 0) {
                riskText = "Kalibrace...";
            }
        } catch (e) {
            console.log("Analytics error:", e.message);
        }

        /* 3. VYČIŠTĚNÝ BALÍČEK PRO FRONTEND */
        const enriched = {
            ecg: data.ecg || 0,
            raw: data.raw || 0,
            bpm: data.bpm || 0,
            rmssd: hrv.rmssd,
            sdnn: hrv.sdnn,
            pnn50: hrv.pnn50,
            risk: riskText,
            leads: data.leads || "false",
            serverTimestamp: Date.now()
        };

        // Broadcast všem (ESP32 data pouze přijímá, web je vykresluje)
        const payload = JSON.stringify(enriched);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    });

    ws.on('close', () => console.log("Connection closed"));
    ws.on('error', (err) => console.log("Socket error:", err.message));
});
