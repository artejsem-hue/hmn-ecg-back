// ai.js

function computeRisk(data) {
    const { bpm, rmssd, pnn50, rrIntervals } = data;

    if (!bpm || bpm === 0) {
        return "Snímám a kalibruji...";
    }

    // 1. Detekce specifických arytmií (potřebujeme historii RR intervalů)
    if (rrIntervals && rrIntervals.length >= 4) {
        const n = rrIntervals.length;
        const rr1 = rrIntervals[n - 3];
        const rr2 = rrIntervals[n - 2]; // Potenciálně předčasný tep
        const rr3 = rrIntervals[n - 1]; // Potenciální kompenzační pauza
        const mean = rrIntervals.reduce((a, b) => a + b, 0) / n;

        // EXTRASYSTOLA (PVC): Tep přijde o 25 % dříve, následován pauzou o 25 % delší
        if (rr2 < 0.75 * mean && rr3 > 1.25 * mean) {
            return "Varování: Detekována Extrasystola (PVC)";
        }
    }

    // FIBRILACE SÍNÍ (AFib): Extrémní chaos v tepu, vysoké RMSSD a BPM
    if (rmssd > 60 && pnn50 > 50 && bpm > 90) {
        return "RIZIKO: Možná Fibrilace síní (Nepravidelný rytmus)";
    }

    // 2. Hodnocení srdeční frekvence (Tachykardie / Bradykardie)
    if (bpm > 100) {
        return "Upozornění: Zvýšený tep (Tachykardie)";
    }
    if (bpm < 50) {
        return "Upozornění: Nízký tep (Bradykardie)";
    }

    // 3. Hodnocení stresu (Autonomní nervový systém)
    if (rmssd > 0 && rmssd < 15.0) {
        return "Upozornění: Nízká regenerace / Fyzický stres";
    }

    return "Normální sinusový rytmus";
}

module.exports = { computeRisk };
