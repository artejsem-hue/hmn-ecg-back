const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const { computeTimeDomain } = require('./hrv');
const { computeRisk } = require('./ai');

/* ================= APP + HTTP SERVER ================= */
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

/* ================= WEBSOCKET SERVER ================= */
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

/* ================= STAV ================= */
let rrBuffer = [];
const MAX_RR_BUFFER = 300;

/* ================= HANDLING CONNECTIONS ================= */
wss.on('connection', (ws, req) => {
    console.log("New WebSocket connection established");

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (err) {
            // Ignorujeme ne-JSON zprávy, aby server nespadl
            return;
        }

        /* ================= RR BUFFER LOGIC ================= */
        // ESP32 teď posílá JSON, ale pokud obsahuje "rr", přidáme ho do analýzy
        if (data.rr && typeof data.rr === "number") {
            rrBuffer.push(data.rr);
            if (rrBuffer.length > MAX_RR_BUFFER) rrBuffer.shift();
        }

        /* ================= HRV & AI (Safe Mode) ================= */
        let hrv = {};
        let risk = "N/A";

        try {
            // Počítáme HRV jen pokud máme v bufferu aspoň nějaká data
            if (rrBuffer.length > 2) {
                hrv = computeTimeDomain(rrBuffer);
                risk = computeRisk({ ...data, ...hrv });
            }
        } catch (e) {
            console.log("Analytics error:", e.message);
        }

        /* ================= ENRICH & BROADCAST ================= */
        const enriched = {
            ...data,
            ...hrv,
            risk: risk,
            serverTimestamp: new Date().getTime()
        };

        // ZÁSADNÍ ZMĚNA: Posíláme data VŽDY, i když analýza selže
        broadcast(JSON.stringify(enriched));
    });

    ws.on('close', () => console.log("Connection closed"));
    ws.on('error', (err) => console.log("Socket error:", err.message));
});

/* ================= BROADCAST FUNCTION ================= */
function broadcast(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}
