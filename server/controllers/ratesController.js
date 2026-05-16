const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
async function getSarbRates(req, res) {
    try {
        const apiKey = process.env.FRED_API_KEY;
        if (!apiKey) {
            console.warn("FRED_API_KEY not found, using fallback");
            return getFallbackRates(res);
        }

        const seriesId = "IRLTLT01ZAA156N";
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;

        console.log("Fetching SA interest rates from FRED API");
        const response = await fetch(url);
        if(!response.ok){
            throw new Error(`FRED API error status: ${response.status}`);
        }

        const data = await response.json(); 
        let primeRate = null;
        let dataDate = null;

       if (data.observations && data.observations[0] && data.observations[0].value) {
            primeRate = parseFloat(data.observations[0].value).toFixed(2);
            dataDate = data.observations[0].date;
            console.log(`FRED data from ${dataDate}: Prime Rate = ${primeRate}%`);
        } else {
            console.log("No data from FRED, using fallback");
            return getFallbackRates(res);
        }
        const repoRate = (primeRate - 3.5).toFixed(2);
        const rates = {
            primeRate: parseFloat(primeRate),
            repoRate: parseFloat(repoRate),
            source: "FRED API (Federal Reserve Economic Data) - Series IRLTLT01ZAA156N",
            lastUpdated: new Date().toISOString(),
            dataDate: dataDate
        };
        res.json(rates);
    } catch (error) {
        console.error("Error fetching SARB rates:", error.message);
        res.status(500).json({
            primeRate: 10.23,
            repoRate: 6.73,
            source: "SARB Official Data (Fallback - FRED API unavailable)",
            warning: "Failed to fetch live rates. Using cached values.",
            lastUpdated: new Date().toISOString(),
        });

    }
}

module.exports = {
    getSarbRates,
};  