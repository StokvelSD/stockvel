const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
async function getSarbRates(req, res) {
    try {
        const url = 'https://api.worldbank.org/v2/country/ZA/indicator/FR.INR.LEND?format=json&per_page=1&sort=desc';
        const response = await fetch(url);
        const data = await response.json(); 
        let primeRate = 10.25;
        if(data[1] && data[1][0] && data[1][0].value !== null ) {
            primeRate = parseFloat(data[1][0].value).toFixed(2);
             console.log(`✅ Live prime rate fetched: ${primeRate}%`);
        } else {
            console.log("⚠️ No live data available, using fallback prime rate");
        }
        const repoRate = (primeRate - 3.5).toFixed(2);
        const rates = {
            primeRate: parseFloat(primeRate),
            repoRate: parseFloat(repoRate),
            source: "World Bank API",
            lastUpdated: new Date().toISOString(),
        };
        res.json(rates);
    } catch (error) {
        console.error("Error fetching SARB rates:", error.message);
        res.status(500).json({
            primeRate: 10.25,
            repoRate: 6.75,
            source: "Offline Fallback",
            warning: "Failed to fetch live rates. Using cached values.",
            lastUpdated: new Date().toISOString(),
        });

    }
}

module.exports = {
    getSarbRates,
};  