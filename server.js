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

// STAV: Buffer pro RR intervaly (pro výpočet HRV)
let rrBuffer = [];
const MAX_RR_BUFFER = 50; // Sníženo pro rychlejší reakci lišty

wss.on('connection', (ws) => {
    console.log("New WebSocket connection established");

    ws.on('message', (message) => {
        let data;
        try {
            const messageString = message.toString();
            data = JSON.parse(messageString);
        } catch (err) {
            return; // Tichý návrat při chybném JSONu
        }

        /* 1. ZPRACOVÁNÍ RR INTERVALU (Klíč pro BPM/HRV lištu) */
        // ESP32 posílá data.rr jen když detekuje tep. Jinak posílá 0.
        if (data.rr && data.rr > 300 && data.rr < 2000) { 
            rrBuffer.push(data.rr);
            if (rrBuffer.length > MAX_RR_BUFFER) rrBuffer.shift();
        }

        /* 2. VÝPOČET HRV ANALYTIKY */
        let hrv = {
            rmssd: 0,
            sdnn: 0,
            pnn50: 0
        };
        let risk = "Analýza...";

        try {
            // Výpočet spustíme, jen pokud máme aspoň 3 tepy
            if (rrBuffer.length >= 3) {
                const results = computeTimeDomain(rrBuffer);
                hrv.rmssd = results.rmssd || 0;
                hrv.sdnn = results.sdnn || 0;
                hrv.pnn50 = results.pnn50 || 0;
                
                // AI Risk (předáváme data i vypočtené hrv)
                risk = computeRisk({ ...data, ...hrv });
            }
        } catch (e) {
            console.log("Analytics error:", e.message);
        }

        /* 3. SLOŽENÍ BALÍČKU PRO WEB */
        const enriched = {
            ...data,       // ecg, bpm, raw, leads z ESP32
            ...hrv,        // rmssd, sdnn, pnn50 z backendu
            risk: risk,    // AI výsledek
            serverTimestamp: new Date().getTime()
        };

        // Broadcast všem připojeným (webu i dalším)
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
