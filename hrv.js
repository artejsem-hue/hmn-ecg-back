// hrv.js

function computeTimeDomain(rrIntervals) {
    if (!rrIntervals || rrIntervals.length < 2) {
        return { rmssd: 0, sdnn: 0, pnn50: 0, edr: 0, lfhf: 0 };
    }

    const n = rrIntervals.length;
    const meanRR = rrIntervals.reduce((sum, val) => sum + val, 0) / n;

    let sdnnSumSq = 0;
    let rmssdSumSq = 0;
    let nn50Count = 0;

    for (let i = 0; i < n; i++) {
        sdnnSumSq += Math.pow(rrIntervals[i] - meanRR, 2);

        if (i < n - 1) {
            const diff = Math.abs(rrIntervals[i + 1] - rrIntervals[i]);
            rmssdSumSq += Math.pow(diff, 2);
            
            if (diff > 50) {
                nn50Count++;
            }
        }
    }

    const sdnn = Math.sqrt(sdnnSumSq / (n - 1));
    const rmssd = Math.sqrt(rmssdSumSq / (n - 1));
    const pnn50 = (nn50Count / (n - 1)) * 100;

    // --- NOVÉ: LF/HF (Frekvenční odhad z časové domény) ---
    // SDNN reprezentuje celkový výkon (Total Power), RMSSD reprezentuje parasympatikus (High Freq)
    let lfhf = 0;
    if (rmssd > 0) {
        const totalPower = Math.pow(sdnn, 2);
        const hfPower = Math.pow(rmssd, 2);
        let lfPower = totalPower - hfPower;
        if (lfPower < 0) lfPower = 0.1; // Bezpečnostní pojistka
        lfhf = lfPower / hfPower;
    }

    // --- NOVÉ: EDR (Odvozená dechová frekvence přes respirační sinusovou arytmii) ---
    let peaks = 0;
    for (let i = 1; i < n - 1; i++) {
        // Hledáme lokální maximum v délce RR (což je moment maximálního výdechu)
        if (rrIntervals[i] > rrIntervals[i - 1] && rrIntervals[i] > rrIntervals[i + 1]) {
            peaks++;
        }
    }
    const totalTimeMinutes = (n * meanRR) / 60000;
    let edr = totalTimeMinutes > 0 ? (peaks / totalTimeMinutes) : 0;
    
    // Čištění extrémních hodnot (pokud máme málo dat)
    if (n < 10) edr = 0; 
    else if (edr > 35) edr = 35; 

    return {
        rmssd: Number(rmssd.toFixed(1)),
        sdnn: Number(sdnn.toFixed(1)),
        pnn50: Number(pnn50.toFixed(1)),
        lfhf: Number(lfhf.toFixed(2)),
        edr: Number(edr.toFixed(1))
    };
}

module.exports = { computeTimeDomain };
