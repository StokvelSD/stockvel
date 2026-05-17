import { useRef } from "react";
import { saveAs } from "file-saver";
import { useReactToPrint } from "react-to-print";

const ExportButtons = ({ paymentHistory, groupContributions, totalPaid }) => {
  const printRef = useRef();

 
 const exportToCSV = () => {
  const headers = ["Date", "Amount (R)", "Group", "Status", "Cumulative Total", "% of Total"];
  
  let cumulative = 0;
  const rows = paymentHistory.map(p => {
    cumulative += p.amount;
    const percentage = ((p.amount / totalPaid) * 100).toFixed(1);
    return [
      new Date(p.date).toLocaleDateString(),
      p.amount,
      p.groupName || "Unknown",
      p.status || "paid",
      cumulative,
      `${percentage}%`
    ];
  });
  
  // Add summary section
  rows.push(["", "", "", "", "", ""]);
  rows.push(["SUMMARY", "", "", "", "", ""]);
  rows.push(["Total Invested", totalPaid, "", "", "", ""]);
  rows.push(["Total Groups", groupContributions.length, "", "", "", ""]);
  rows.push(["Total Payments", paymentHistory.length, "", "", "", ""]);
  rows.push(["", "", "", "", "", ""]);
  rows.push(["BREAKDOWN BY GROUP", "", "", "", "", ""]);
  
  groupContributions.forEach(group => {
    const percentage = ((group.totalPaid / totalPaid) * 100).toFixed(1);
    rows.push([group.groupName, `R${group.totalPaid}`, `${percentage}% of total`, "", "", ""]);
  });
  
  const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `investment_report_${new Date().toISOString().split("T")[0]}.csv`);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Contributions_Report_${new Date().toISOString().split("T")[0]}`,
  });

  return (
    <section style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
      <button onClick={exportToCSV} className="btn btn-outline">
        📄 Export as CSV
      </button>
      <button onClick={handlePrint} className="btn btn-outline">
        🖨️ Export as PDF
      </button>
      
      {/* Hidden PDF content - nicely formatted */}
      <article ref={printRef} style={{ position: "absolute", top: "-9999px", left: "-9999px", width: "800px", padding: "20px", fontFamily: "sans-serif" }}>
        <h2>Contributions Report</h2>
        <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>
        
        <section style={{ marginBottom: "20px" }}>
          <h3>Summary</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr><td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}><strong>Total Paid:</strong></td><td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>R{totalPaid.toLocaleString()}</td></tr>
              <tr><td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}><strong>Number of Payments:</strong></td><td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>{paymentHistory.length}</td></tr>
              <tr><td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}><strong>Groups Participated:</strong></td><td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>{groupContributions.length}</td></tr>
            </tbody>
          </table>
        </section>
        
        <section>
          <h3>Payment History</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
            <thead>
              <tr style={{ backgroundColor: "#f2f2f2" }}>
                <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "left" }}>Date</th>
                <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "left" }}>Amount (R)</th>
                <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "left" }}>Group</th>
                <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "left" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.map((p, idx) => (
                <tr key={idx}>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{new Date(p.date).toLocaleDateString()}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>R{p.amount.toLocaleString()}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{p.groupName || "Unknown"}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{p.status || "paid"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </article>
    </section>
  );
};

export default ExportButtons;