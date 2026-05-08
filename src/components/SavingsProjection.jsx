import { useState, useEffect } from "react";
import { fetchSarbRates } from "../services/sarbRates";

const SavingsProjection = ({ userBalance = 5000 }) => {
    const [rates, setRates] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMonths, setSelectedMonths] = useState(12);

    useEffect(() => {
        const loadRates = async () => {
            try {
                const data = await fetchSarbRates();
                setRates(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        loadRates();
    }, []);
    
    const calculateProjection = () => {
        if (!rates) return null;
        const monthlyRate = rates.repoRate / 100 / 12;
        const projected = userBalance * Math.pow(1 + monthlyRate, selectedMonths);
        return {
            projected: projected.toFixed(2),
            interest: (projected - userBalance).toFixed(2),
        };
    };

    const projection = calculateProjection();

    if (loading) {
        return (
            <section style={{ padding: "15px", background: "#f5f5f5", borderRadius: "8px", marginBottom: "20px" }}>
                <p>Loading SARB interest rates...</p>
            </section>
        );
    }

    if (error && !rates) {
        return (
            <section style={{ padding: "15px", background: "#fff3cd", borderRadius: "8px", marginBottom: "20px", borderLeft: "4px solid #ffc107" }}>
                <p>Unable to load SARB rates. Please try again later.</p>
            </section>
        );
    }

    return (
        <article style={{ 
            padding: "20px", 
            background: "white",
            color: "#1e3c72",
            borderRadius: "12px",
            marginBottom: "20px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e0e0e0"
        }}>
            <header>
                <h3 style={{ margin: "0 0 10px 0", color: "#1e3c72" }}>South African Reserve Bank (SARB) Rates</h3>
            </header>

            <>
                <ul style={{
                    display: "flex",
                    gap: "20px",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                    listStyle: "none",
                    padding: 0
                }}>
                    <li style={{ background: "#e8f0fe", padding: "10px 15px", borderRadius: "8px", borderLeft: "4px solid #2a5298" }}>
                        <small style={{color: "#555"}}>Repo Rate</small>
                        <p style={{ fontSize: "24px", fontWeight: "bold", margin: "5px 0 0 0", color: "#1e3c72" }}>{rates?.repoRate}%</p>
                    </li>

                    <li style={{ background: "#e8f0fe", padding: "10px 15px", borderRadius: "8px", borderLeft: "4px solid #2a5298" }}>
                        <small style={{color: "rgb(49, 96, 250)"}}>Prime Lending Rate</small>
                        <p style={{ fontSize: "24px", fontWeight: "bold", margin: "5px 0 0 0", color: "#1e3c72" }}>{rates?.primeRate}%</p>
                    </li>
                </ul>
                <section style={{ background: "#f0f4fa", padding: "15px", borderRadius: "8px" }}>
                        <h4 style={{ margin: "0 0 10px 0", color: "#1e3c72"}}>Savings Projection</h4>
                        <form style={{ marginBottom: "10px" }}>
                            <label htmlFor="timePeriod" style={{ marginRight: "10px", color: "#333"}}>Time Period:</label>
                            <select
                                id="timePeriod"
                                value={selectedMonths}
                                onChange={e => setSelectedMonths(Number(e.target.value))}
                                style={{ padding: "5px 10px", borderRadius: "5px", border: "none", background: "white"}}
                            >
                                <option value={6}>6 months</option>
                                <option value={12}>1 year</option>
                                <option value={24}>2 years</option>
                                <option value={36}>3 years</option>

                            </select>
                        </form>

                        <article>
                            <p style={{ margin: "5px 0", color: "#333" }}>Current Balance: <strong style={{ color: "#2a5298" }}>R{userBalance.toLocaleString()}</strong> </p>
                            <p style={{ margin: "5px 0", color: "#333" }}>Projected after {selectedMonths} months:</p>
                            <p style={{ fontSize: "28px", fontWeight: "bold", margin: "5px 0", color: "#2a5298"}}>R{projection?.projected?.toLocaleString()}</p>
                            <small style={{ opacity: 0.8, color: "#555" }}>Estimated interest: R{projection?.interest?.toLocaleString()}(at {rates?.primeRate}% p.a.)
                            </small>
                        </article>
                    </section>
                    <footer style={{
                        marginTop: "15px",
                        fontSize: "11px",
                        opacity: 0.7,
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        color: "#665"
                    }}>
                        <small>Source: {rates?.source}</small>
                        <small>Last updated: {rates?.lastUpdated ? new Date(rates.lastUpdated).toLocaleString() : "Unknown"}
                        </small>
                        {rates?.warning && (
                            <small style={{ color: "#d4a000", display: "block" }}>
                                {rates.warning}
                            </small>
                        )}
                    </footer>
            </> 
        </article>  
    );
};

export default SavingsProjection;