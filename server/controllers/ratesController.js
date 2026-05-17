const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs').promises;
const { warn } = require('console');
const path = require('path');

const RATES_CACHE_FILE = path.join(__dirname, "../cache/ratesCache.json");

async function ensureCacheDir() {
    const cacheDir = path.join(__dirname, "../cache");
    try {
        await fs.access(cacheDir);  
    } catch {
        await fs.mkdir(cacheDir, { recursive: true });
    }
}


async function getCachedRates(res) {
    try {
        await ensureCacheDir();
        const data = await fs.readFile(RATES_CACHE_FILE, "utf-8");
        const rates = JSON.parse(data);
        return rates;
    }catch(error){
        console.error("Error reading cached rates:", error.message);
        return null
    }
}

async function cacheRates(rates) {
    try {
        await ensureCacheDir();
        const data = JSON.stringify(rates, null, 2);
        await fs.writeFile(RATES_CACHE_FILE, data);
        console.log("Rates saved to cache successfully");
    } catch (error) {
        console.error("Error caching rates to file:", error.message);
    }
}

function getFallbackRates(res) {
  res.json({
    primeRate: 10.23,
    repoRate: 6.73,
    source: "Ultimate Fallback",
    warning: "Unable to fetch rates. Please check API configuration.",
    lastUpdated: new Date().toISOString(),
  });
}

async function getSarbRates(req, res) {
    try {
        const apiKey = process.env.FRED_API_KEY;
        if (!apiKey) {
            console.warn("FRED_API_KEY not found, using cached rates");
            const cached = await getCachedRates(res);
            if (cached) {
                return res.json({
                    primeRate: cached.primeRate,
                    repoRate: cached.repoRate,
                    source: "Cached (No API Key)",
                    warning: "FRED API key is not configured. Showing last known rates.",
                    lastUpdated: cached.lastUpdated,
                    dataDate: cached.dataDate,
                });
            }
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

       if (data.observations && data.observations[0] && data.observations[0].value) {
            const primeRate = parseFloat(data.observations[0].value).toFixed(2);
            const dataDate = data.observations[0].date;
            const repoRate = (parseFloat(primeRate - 3.5)).toFixed(2);

            const rates = {
                primeRate: parseFloat(primeRate),
                repoRate: parseFloat(repoRate),
                source: "FRED API (Federal Reserve Economic Data) - Series IRLTLT01ZAA156N",
                lastUpdated: new Date().toISOString(),
                dataDate: dataDate
            };
            
            await cacheRates(rates);

            return res.json(rates);
            
        } else {
            console.log("No data from FRED, using fallback");
            const cached = await getCachedRates(res);
            if (cached) {
                return res.json({
                    primeRate: cached.primeRate,
                    repoRate: cached.repoRate,
                    source: "Cached (No FRED data)", 
                    warning: "Failed to fetch live rates. Showing last known rates.",   
                    lastUpdated: cached.lastUpdated,
                    dataDate: cached.dataDate,
                });
            }
            return getFallbackRates(res);
        }
    } catch (error) {
        console.error("Error fetching SARB rates:", error.message);
        const cached = await getCachedRates(res);
        if (cached) {
            return res.json({
                primeRate: cached.primeRate,
                repoRate: cached.repoRate,
                source: "Cached (Error fetching live rates)", 
                warning: "Failed to fetch live rates. Showing last known rates from cache.",   
                lastUpdated: cached.lastUpdated,
                dataDate: cached.dataDate,
            });
        }
        return getFallbackRates(res);

    }
}


module.exports = {
    getSarbRates,
};  