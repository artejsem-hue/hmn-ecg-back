function computeTimeDomain(rr) {
    if (rr.length < 2) return { rmssd: 0, sdnn: 0, pnn50: 0 };

    // Rozdíly mezi sousedními RR intervaly
    const diffs = rr.slice(1).map((v, i) => v - rr[i]);
    
    // RMSSD
    const rmssd = Math.sqrt(diffs.map(d => d * d).reduce((a, b) => a + b) / diffs.length);

    // SDNN
    const mean = rr.reduce((a, b) => a + b) / rr.length;
    const sdnn = Math.sqrt(rr.map(v => (v - mean) ** 2).reduce((a, b) => a + b) / rr.length);

    // pNN50
    const nn50 = diffs.filter(d => Math.abs(d) > 50).length;
    const pnn50 = (nn50 / diffs.length) * 100;

    return { 
        rmssd: parseFloat(rmssd.toFixed(2)), 
        sdnn: parseFloat(sdnn.toFixed(2)), 
        pnn50: parseFloat(pnn50.toFixed(2)) 
    };
}

module.exports = { computeTimeDomain };
