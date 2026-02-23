// hrv.js

function computeTimeDomain(rrIntervals) {
    // Pokud nemáme dostatek dat, vrátíme nuly
    if (!rrIntervals || rrIntervals.length < 2) {
        return { rmssd: 0, sdnn: 0, pnn50: 0 };
    }

    const n = rrIntervals.length;
    
    // Průměrný RR interval
    const meanRR = rrIntervals.reduce((sum, val) => sum + val, 0) / n;

    let sdnnSumSq = 0;
    let rmssdSumSq = 0;
    let nn50Count = 0;

    // Průchod polem pro výpočet odchylek
    for (let i = 0; i < n; i++) {
        // Pro SDNN: Rozdíl aktuálního intervalu od průměru
        sdnnSumSq += Math.pow(rrIntervals[i] - meanRR, 2);

        // Pro RMSSD a pNN50: Rozdíl mezi dvěma po sobě jdoucími intervaly
        if (i < n - 1) {
            const diff = Math.abs(rrIntervals[i + 1] - rrIntervals[i]);
            rmssdSumSq += Math.pow(diff, 2);
            
            if (diff > 50) {
                nn50Count++;
            }
        }
    }

    // Finální výpočty (odmocniny a procenta)
    // U SDNN dělíme (n - 1) pro výběrovou směrodatnou odchylku
    const sdnn = Math.sqrt(sdnnSumSq / (n - 1));
    const rmssd = Math.sqrt(rmssdSumSq / (n - 1));
    const pnn50 = (nn50Count / (n - 1)) * 100;

    return {
        rmssd: Number(rmssd.toFixed(1)),
        sdnn: Number(sdnn.toFixed(1)),
        pnn50: Number(pnn50.toFixed(1))
    };
}

module.exports = { computeTimeDomain };
