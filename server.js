const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const { computeTimeDomain } = require('./hrv');
const { computeRisk } = require('./ai');

/* ================= APP + HTTP SERVER ================= */

const app = express();
const server = http.createServer(app);

/* ================= PORT (Railway kompatibilní) ================= */

const PORT = process.env.PORT || 8080;

/* ================= WEBSOCKET SERVER ================= */

const wss = new WebSocket.Server({
    server,
    path: "/"
});

server.listen(PORT, () => {
    console.log(`HUMAN ECG backend running on port ${PORT}`);
});

/* ================= TEST ROUTE ================= */

app.get('/', (req, res) => {
    res.send("HUMAN ECG BACKEND RUNNING");
});

/* ================= STAV ================= */

let rrBuffer = [];
const MAX_RR_BUFFER = 300;

/* ================= HANDLING CONNECTIONS ================= */

wss.on('connection', (ws, req) => {

    console.log("New WebSocket connection");

    ws.on('message', (message) => {

        let data;

        try {
            data = JSON.parse(message);
        } catch (err) {
            console.log("Invalid JSON received");
            return;
        }

        /* ================= RR BUFFER ================= */

        if (data.rr && typeof data.rr === "number") {
            rrBuffer.push(data.rr);

            if (rrBuffer.length > MAX_RR_BUFFER) {
                rrBuffer.shift();
            }
        }

        /* ================= HRV SERVER-SIDE ================= */

        const hrv = computeTimeDomain(rrBuffer);

        /* ================= AI RISK ================= */

        const enriched = {
            ...data,
            ...hrv
        };

        enriched.risk = computeRisk(enriched);

        /* ================= BROADCAST ================= */

        broadcast(JSON.stringify(enriched));
    });

    ws.on('close', () => {
        console.log("Connection closed");
    });

    ws.on('error', (err) => {
        console.log("Socket error:", err.message);
    });
});

/* ================= BROADCAST FUNCTION ================= */

function broadcast(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}
