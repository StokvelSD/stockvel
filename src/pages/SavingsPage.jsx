import {useState, useEffect} from "react";
import {fetchSarbRates} from "../services/sarbRates"

const SavingsPage = () => {
    const [rates, setRates] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userBalance, setUserBalance] = useState(5000);
    const [selectedMonths, setSelectedMonths] = useState(12);

    useEffect(() => {
        fetchSarbRates().then(setRates).finally(() => setLoading(false));
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

    return(
        <article style ={{maxWidth: "600px", margin: "0 auto", padding: "20px"}}>
            <h2>Savings Projection Tool</h2>
        
            {loading ? (
                <p>Loading SARB interest rates...</p>
        
    ) : (
    <>

        <section style={{ padding: "15px", background: "#fff3cd", borderRadius: "8px"}}>
           <h3>Current SARB Rates</h3>
           <ul style={{ listStyle: "none", padding: "15px", borderRadius: "8px"}}>
            <li>Repo Rate: <strong>{rates?.repoRate}%</strong></li>
            <li>Prime Rate: <strong>{rates?.ptimeRate}%</strong></li>
           </ul>
        </section>

        <section style={{ marginTop: "20px" }}>
            <h3>Your Stokvel Details</h3>
            <form>
              <label>Current Balance (R):</label>
              <input 
                type="number" 
                value={userBalance} 
                onChange={e => setUserBalance(Number(e.target.value))}
                style={{ width: "100%", padding: "8px", marginBottom: "15px" }}
              />
              
              <label>Time Period:</label>
              <select 
                value={selectedMonths} 
                onChange={e => setSelectedMonths(Number(e.target.value))}
                style={{ width: "100%", padding: "8px" }}
              >
                <option value={6}>6 months</option>
                <option value={12}>1 year</option>
                <option value={24}>2 years</option>
                <option value={36}>3 years</option>
              </select>
            </form>
          </section>

          <section style={{ 
            marginTop: "20px", 
            padding: "20px", 
            background: "linear-gradient(135deg, #1e3c72, #2a5298)",
            color: "white",
            borderRadius: "12px",
            textAlign: "center"
          }}>
            <h4>Projected Savings</h4>
            <p style={{ fontSize: "36px", fontWeight: "bold", margin: "10px 0" }}>
              R{projection?.projected?.toLocaleString()}
            </p>
            <small>Estimated interest: R{projection?.interest?.toLocaleString()}</small>
          </section>

          <footer style={{ marginTop: "15px", fontSize: "11px", textAlign: "center" }}>
            Source: {rates?.source} | Last updated: {new Date(rates?.lastUpdated).toLocaleDateString()}
          </footer>
        </>
      )}
    </article>
  );
};


export default SavingsPage;