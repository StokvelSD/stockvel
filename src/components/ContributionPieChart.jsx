import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchContributionsByGroup } from "../services/contributions";
import { useAuth } from "../contexts/AuthContext";

const COLORS = ["#1e3c72", "#2a5298", "#4a90e2", "#7b2cbf", "#e67e22", "#27ae60", "#e74c3c", "#3498db"];

const ContributionPieChart = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAll, setTotalAll] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const groupData = await fetchContributionsByGroup();
        const total = groupData.reduce((sum, g) => sum + g.totalPaid, 0);
        setTotalAll(total);
        
        const chartData = groupData.map((group) => ({
          name: group.groupName.length > 20 ? group.groupName.substring(0, 20) + "..." : group.groupName,
          value: group.totalPaid,
          fullName: group.groupName,
          percentage: ((group.totalPaid / total) * 100).toFixed(1)
        }));
        setData(chartData);
      } catch (error) {
        console.error("Error loading chart data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  if (loading) return <p>Loading chart...</p>;
  if (data.length === 0) return <p>No contribution data yet. Join a group and start saving!</p>;

  return (
    <section className="section-card" style={{ marginBottom: "2rem" }}>
      <header>
        <h3>Contribution Distribution by Group</h3>
      </header>
      
      <figure style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "center", margin: 0 }}>
        <section style={{ width: "250px", height: "250px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `R${value.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </section>
        
        <section style={{ flex: 1, minWidth: "200px" }}>
          <p><strong>Total Contributions:</strong> R{totalAll.toLocaleString()}</p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {data.map((item, idx) => (
              <li key={idx} style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ width: "12px", height: "12px", backgroundColor: COLORS[idx % COLORS.length], borderRadius: "2px", display: "inline-block" }} />
                <strong>{item.name}:</strong>
                <span>R{item.value.toLocaleString()}</span>
                <small style={{ color: "#666" }}>({item.percentage}%)</small>
              </li>
            ))}
          </ul>
        </section>
      </figure>
    </section>
  );
};

export default ContributionPieChart;