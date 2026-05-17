import { saveAs } from "file-saver";

const ExportButtons = ({ paymentHistory, groupContributions, totalPaid }) => {
  
  const exportToCSV = () => {
    const headers = ["Date", "Amount", "Group", "Status"];
    const rows = paymentHistory.map(p => [
      new Date(p.date).toLocaleDateString(),
      p.amount,
      p.groupName || "Unknown",
      p.status || "paid"
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `contributions_${new Date().toISOString().split("T")[0]}.csv`);
  };

  const exportToJSON = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      summary: {
        totalPaid: totalPaid,
        groupCount: groupContributions.length,
        paymentCount: paymentHistory.length
      },
      contributions: paymentHistory,
      groupBreakdown: groupContributions
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    saveAs(blob, `contributions_${new Date().toISOString().split("T")[0]}.json`);
  };

  const exportToPDF = () => {
    window.print();
  };

  return (
    <section style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
      <button onClick={exportToCSV} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        📄 Export as CSV
      </button>
      <button onClick={exportToJSON} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        📋 Export as JSON
      </button>
      <button onClick={exportToPDF} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        🖨️ Export as PDF (Print)
      </button>
    </section>
  );
};

export default ExportButtons;