import { useState } from "react";

const CustomView = ({ groupContributions, onFilterChange }) => {
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  const handleGroupChange = (e) => {
    const groupId = e.target.value;
    setSelectedGroup(groupId);
    onFilterChange({ groupId, dateRange });
  };

  const handleDateChange = (e) => {
    const range = e.target.value;
    setDateRange(range);
    onFilterChange({ groupId: selectedGroup, dateRange: range });
  };

  return (
    <section className="section-card" style={{ marginBottom: "1rem" }}>
      <h3>🔧 Custom View</h3>
      <form style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <label htmlFor="groupFilter">
          Filter by Group:
          <select 
            id="groupFilter"
            value={selectedGroup} 
            onChange={handleGroupChange} 
            style={{ marginLeft: "8px", padding: "5px" }}
          >
            <option value="all">All Groups</option>
            {groupContributions.map(group => (
              <option key={group.groupId} value={group.groupId}>
                {group.groupName} (R{group.totalPaid.toLocaleString()})
              </option>
            ))}
          </select>
        </label>
        
        <label htmlFor="dateRange">
          Date Range:
          <select 
            id="dateRange"
            value={dateRange} 
            onChange={handleDateChange} 
            style={{ marginLeft: "8px", padding: "5px" }}
          >
            <option value="all">All Time</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
        </label>
      </form>
    </section>
  );
};

export default CustomView;