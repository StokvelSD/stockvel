import { saveAs } from "file-saver";

const ExportButtons = ({ paymentHistory, groupContributions, totalPaid }) => {
  
  const exportToCSV = () => {
    
    const headers = ["Date", "Amount (R)", "Group", "Status"];
    
    
    const rows = paymentHistory.map(p => [
      p?.date ? new Date(p.date).toLocaleDateString() : "Unknown",
      p?.amount || 0,
      p?.groupName || "Unknown",
      p?.status || "paid"
    ]);
    
    rows.push(["", "", "", ""]);
    
    rows.push(["SUMMARY", "", "", ""]);
    rows.push(["Total Invested", `R${(totalPaid || 0).toLocaleString()}`, "", ""]);
    rows.push(["Total Groups", groupContributions?.length || 0, "", ""]);
    rows.push(["Total Payments", paymentHistory?.length || 0, "", ""]);
    
    
    if (groupContributions && groupContributions.length > 0) {
      rows.push(["", "", "", ""]);
      rows.push(["BREAKDOWN BY GROUP", "", "", ""]);
      groupContributions.forEach(group => {
        const percentage = totalPaid > 0 ? ((group.totalPaid / totalPaid) * 100).toFixed(1) : 0;
        rows.push([group.groupName, `R${group.totalPaid.toLocaleString()}`, `${percentage}% of total`, ""]);
      });
    }
    
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const filename = `investment_report_${new Date().toISOString().split("T")[0]}.csv`;
    saveAs(blob, filename);
  };

  return (
    <section style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
      <button 
        onClick={exportToCSV} 
        className="btn btn-outline" 
        style={{ display: "flex", alignItems: "center", gap: "5px" }}
      >
        📄 Export as CSV
      </button>
    </section>
  );
};

export default ExportButtons;