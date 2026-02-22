/**
 * Huma Care AI Analysis Module
 * Vyhodnocuje zdravotní riziko na základě tepu a HRV parametrů.
 */
function computeRisk(data) {
    // Pokud data chybí nebo je tep 0 (elektrody mimo tělo), nehlásíme riziko
    if (!data.bpm || data.bpm === 0) {
        return "Čekám na signál...";
    }

    let score = 0;

    // 1. ANALÝZA TEPU (BPM)
    // Sledujeme tachykardii a bradykardii
    if (data.bpm > 110) score += 35; 
    else if (data.bpm > 90) score += 15;
    else if (data.bpm < 45) score += 25;

    // 2. ANALÝZA VARIABILITY (RMSSD) - Klíč k únavě a stresu
    // RMSSD je nejcitlivější ukazatel pro krátkodobá měření
    if (data.rmssd > 0 && data.rmssd < 15) score += 40; 
    else if (data.rmssd > 0 && data.rmssd < 30) score += 20;

    // 3. CELKOVÁ ADAPTACE (SDNN)
    // Ukazuje, jak se srdce dokáže přizpůsobit zátěži
    if (data.sdnn > 0 && data.sdnn < 20) score += 30; 
    else if (data.sdnn > 0 && data.sdnn < 50) score += 10;

    // 4. RYTMUS (pNN50)
    // Procento významných odchylek v rytmu
    if (data.pnn50 > 0 && data.pnn50 < 3) score += 10;

    // INTERPRETACE VÝSLEDKŮ (Interpretace skóre)
    if (score === 0) return "Optimální";
    if (score < 30)  return "Dobrá kondice";
    if (score < 60)  return "Zvýšená zátěž";
    if (score < 85)  return "Vysoké riziko";
    
    return "Kritický stav";
}

module.exports = { computeRisk };
