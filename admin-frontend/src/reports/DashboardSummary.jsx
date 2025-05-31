// src/reports/DashboardSummary.jsx
import React, { useEffect, useState } from 'react';

export default function DashboardSummary({ companyId, companyName }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!companyId) return;

    const token = localStorage.getItem("accessToken");
    const url = `http://localhost:8000/api/reports/${companyId}/dashboard-summary/`;

    console.log("📡 Fetching Dashboard Summary from:", url);

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        console.log("📊 Summary Response:", data);
        setSummary(data);
      })
      .catch(err => {
        console.error("❌ Error loading summary:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) return <p>Loading summary...</p>;
  if (error) return <p>Error loading summary: {error}</p>;
  if (!summary) return <p>No summary data.</p>;

  return (
    <div className="dashboard-header">
      <h1>{companyName || 'Company'} Dashboard</h1>
      <div className="huge-buttons">
        <div className="huge-button"><h3>TOTAL SALES</h3><p>₹{summary.sales}</p></div>
        <div className="huge-button"><h3>PURCHASE</h3><p>₹{summary.purchases}</p></div>
        <div className="huge-button"><h3>EXPENSE</h3><p>₹{summary.expenses}</p></div>
        <div className="huge-button"><h3>INCOME</h3><p>₹{summary.income}</p></div>
        <div className="huge-button"><h3>GST COLLECTED</h3><p>₹{summary.gst_collected}</p></div>
        <div className="huge-button"><h3>GST PAID</h3><p>₹{summary.gst_paid}</p></div>
        
      </div>
    </div>
  );
}
