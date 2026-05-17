const API_BASE_URL = import.meta.env.VITE_SARB_API_BASE_URL || "http://localhost:5000/api";

export async function fetchSarbRates() {
  try {
    const response = await fetch(`${API_BASE_URL}/sarb-rates`);
    
    if(!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);  
    }

    const rates = await response.json();

    return {
        primeRate: rates.primeRate || 10.25,
        repoRate: rates.repoRate || 6.75,
        source: rates.source || "SARB API",
        lastUpdated: rates.lastUpdated || new Date().toISOString(),
        warning: rates.warning || null
    };
  } catch (error) {
    console.error("Error fetching SARB rates:", error);
    return {
        primeRate: 10.25,
        repoRate: 6.75,
        source: "Offline Fallback",
        lastUpdated: new Date().toISOString(),
        warning: "Failed to fetch live rates. Using cached values."
    };
  }
}