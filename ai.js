function computeRisk(data) {
    let score = 0;

    // 1. TEP (BPM)
    if (data.bpm > 110) score += 30; // Výrazná tachykardie
    else if (data.bpm > 90) score += 10; // Mírně zvýšený tep
    else if (data.bpm < 45 && data.bpm > 0) score += 20; // Bradykardie

    // 2. VARIABILITA (RMSSD) - Klíč k regeneraci
    if (data.rmssd < 15 && data.rmssd > 0) score += 40; // Kriticky nízká variabilita
    else if (data.rmssd < 30 && data.rmssd > 0) score += 20;

    // 3. CELKOVÁ ADAPTACE (SDNN)
    if (data.sdnn < 20 && data.sdnn > 0) score += 30; // Velmi nízká adaptabilita
    else if (data.sdnn < 50 && data.sdnn > 0) score += 10;

    // 4. RYTMUS (pNN50)
    if (data.pnn50 < 3 && data.pnn50 > 0) score += 10;

    // Výsledná interpretace
    if (score === 0) return "Optimální";
    if (score < 30) return "Normální";
    if (score < 60) return "Zvýšená zátěž";
    return "Vysoké riziko";
}

module.exports = { computeRisk };
