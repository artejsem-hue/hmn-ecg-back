// ai.js

function computeRisk(data) {
    const { bpm, rmssd, pnn50 } = data;

    // Pokud nemáme zatím tep, systém se stále kalibruje
    if (!bpm || bpm === 0) {
        return "Snímám a kalibruji...";
    }

    // Hodnocení srdeční frekvence (Tachykardie / Bradykardie)
    if (bpm > 100) {
        return "Upozornění: Zvýšený tep (Tachykardie)";
    }
    if (bpm < 50) {
        return "Upozornění: Nízký tep (Bradykardie)";
    }

    // Hodnocení stresu a regenerace na základě HRV
    // (Aktivuje se, až když jsou hodnoty nenulové, abychom zamezili falešným poplachům při startu)
    if (rmssd > 0 && rmssd < 15.0) {
        return "Upozornění: Nízká regenerace / Fyzický stres";
    }
    if (pnn50 > 0 && pnn50 < 3.0) {
        return "Upozornění: Snížená variabilita rytmu";
    }

    return "Normální sinusový rytmus";
}

module.exports = { computeRisk };
