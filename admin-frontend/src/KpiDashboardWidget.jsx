import React, { useEffect, useState } from 'react';
import './KpiDashboardWidget.css'; // 👈 We'll add styles here

const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '₹0';
  const val = parseFloat(value);
  if (Math.abs(val) >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
  if (Math.abs(val) >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`;
  return `₹${val.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const formatNumber = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return parseFloat(value).toFixed(2);
};

const KpiDashboardWidget = ({ companyId }) => {
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const url = `http://localhost:8000/api/metrics/summary/${companyId}/`;
        console.log("📡 Fetching KPI data from:", url);

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        console.log("📦 KPI API Response:", data);
        setKpi(data);
      } catch (error) {
        console.error("❌ Failed to load KPIs:", error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) fetchKpis();
  }, [companyId]);

  if (loading) return <p>⏳ Loading KPIs...</p>;
  if (!kpi) return <p>⚠️ No KPI data available.</p>;

  const kpiTiles = [
  { label: 'Net Profit', value: formatCurrency(kpi.net_profit), tooltip: 'The total earnings after subtracting all expenses including operational and non-operational costs.' },
  { label: 'Gross Profit', value: formatCurrency(kpi.gross_profit), tooltip: 'Revenue left after subtracting the cost of goods purchased or produced.' },
  { label: 'Net Profit Margin', value: `${formatNumber(kpi.net_profit_margin)}%`, tooltip: 'Shows how much of your revenue remains as profit after all expenses. Higher is better.' },
  { label: 'Gross Profit Margin', value: `${formatNumber(kpi.gross_profit_margin)}%`, tooltip: 'Percentage of sales revenue remaining after deducting direct purchase costs. Indicates production efficiency.' },
  { label: 'Operating Expense Ratio', value: `${formatNumber(kpi.operating_expense_ratio)}%`, tooltip: 'Shows what portion of revenue is consumed by day-to-day operations like rent, salaries, utilities.' },
  { label: 'Sales per Unit', value: formatCurrency(kpi.avg_sale_per_unit), tooltip: 'Average price at which each product or service was sold during the period.' },
  { label: 'Cost per Unit', value: formatCurrency(kpi.avg_cost_per_unit), tooltip: 'Average cost spent to purchase or produce each unit sold.' },
  { label: 'Profit per Unit', value: formatCurrency(kpi.unit_profit_margin), tooltip: 'Net profit earned from each individual product or service sold.' },
  { label: 'Sales/Day', value: formatCurrency(kpi.avg_sales_per_day), tooltip: 'Daily average sales performance. Helps assess consistency in income.' },
  { label: 'Inventory Turnover', value: formatNumber(kpi.inventory_turnover), tooltip: 'How quickly stock is moving. Higher ratio means efficient inventory utilization.' },
  { label: 'Sales:Purchase Ratio', value: formatNumber(kpi.sales_to_purchase_ratio), tooltip: 'Indicates how much sales were generated for every ₹1 spent on purchases.' },
  { label: 'Purchase:Sales Ratio', value: formatNumber(kpi.purchase_to_sales_ratio), tooltip: 'How much of your sales were consumed by purchasing cost. Lower is better.' },
  { label: 'Business Health 🩺', value: kpi.business_health || 'Unknown', tooltip: 'Health is determined based on profit margins and turnover. Healthy = profitable and efficient.' },
];

const getKpiShade = (label, value) => {
  const val = parseFloat(value?.toString().replace(/[₹,%]/g, '')) || 0;

  if (label.includes('Net Profit') || label.includes('Gross Profit')) {
    return val > 0 ? 'shade-green' : val === 0 ? 'shade-orange' : 'shade-red';
  }

  if (label.includes('Margin')) {
    return val >= 15 ? 'shade-green' : val >= 5 ? 'shade-orange' : 'shade-red';
  }

  if (label.includes('Expense') || label.includes('Purchase:Sales')) {
    return val <= 40 ? 'shade-green' : val <= 60 ? 'shade-orange' : 'shade-red';
  }

  if (label.includes('Turnover')) {
    return val >= 1 ? 'shade-green' : val >= 0.5 ? 'shade-orange' : 'shade-red';
  }

  if (label.includes('Health')) {
    return value === 'Healthy' ? 'shade-green'
         : value === 'Moderate' ? 'shade-orange'
         : 'shade-red';
  }

  return ''; // default
};



  return (
    <div className="kpi-grid">
        
      {kpiTiles.map((tile, idx) => (
        <div key={idx} className={`kpi-card ${getKpiShade(tile.label, tile.value)}`}>
          <div className="kpi-label">
            {tile.label}
            <span className="kpi-tooltip-icon" data-tooltip={tile.tooltip}>ⓘ</span>
          </div>
          <div className={`kpi-value ${tile.label.includes('Health') ? tile.value.toLowerCase() : ''}`}>
            {tile.value}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KpiDashboardWidget;
