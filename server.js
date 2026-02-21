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

let rrBuffer = [];
const MAX_RR_BUFFER = 300;

wss.on('connection', (ws) => {
    console.log("New WebSocket connection established");

    ws.on('message', (message) => {
        let data;
        try {
            // ZMĚNA: Převedení message na String (řeší Buffer/Binary problém)
            const messageString = message.toString();
            data = JSON.parse(messageString);
            
            // Diagnostika: Jednou za čas vypíšeme, že data dorazila
            if (Math.random() > 0.98) console.log("Data received from client:", data.ecg ? "ECG OK" : "No ECG");
            
        } catch (err) {
            console.log("Parse error:", err.message);
            return;
        }

        if (data.rr && typeof data.rr === "number") {
            rrBuffer.push(data.rr);
            if (rrBuffer.length > MAX_RR_BUFFER) rrBuffer.shift();
        }

        let hrv = {};
        let risk = "N/A";
        try {
            if (rrBuffer.length > 2) {
                hrv = computeTimeDomain(rrBuffer);
                risk = computeRisk({ ...data, ...hrv });
            }
        } catch (e) {
            console.log("Analytics error:", e.message);
        }

        const enriched = {
            ...data,
            ...hrv,
            risk: risk,
            serverTimestamp: new Date().getTime()
        };

        // Broadcast všem
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
