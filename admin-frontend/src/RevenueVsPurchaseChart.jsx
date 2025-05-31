import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { format, subDays, subMonths, subYears } from 'date-fns';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

const timeRanges = [
  { label: '7D', from: () => subDays(new Date(), 7) },
  { label: '1M', from: () => subMonths(new Date(), 1) },
  { label: '3M', from: () => subMonths(new Date(), 3) },
  { label: '6M', from: () => subMonths(new Date(), 6) },
  { label: '1Y', from: () => subYears(new Date(), 1) },
  { label: '2Y', from: () => subYears(new Date(), 2) },
  { label: 'All', from: () => new Date('2020-01-01') }
];

const RevenueVsPurchaseChart = ({ companyId }) => {
  const [range, setRange] = useState('1Y');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const selectedRange = timeRanges.find(r => r.label === range);
  const from = format(selectedRange.from(), 'yyyy-MM-dd');
  const to = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const url = `http://localhost:8000/api/metrics/trend/${companyId}/?from=${from}&to=${to}`;
      console.log("📡 Selected Time Range:", range);
      console.log("📤 Fetching from:", from, "to:", to);
      console.log("🌐 API URL:", url);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      console.log("📦 API Response:", data);
      setChartData(data);
    } catch (err) {
      console.error("❌ Error loading trend data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (companyId) fetchData();
}, [companyId, range]);


  const data = {
    labels: chartData.map(item => item.label),

    datasets: [
      {
        label: 'Revenue (Sales)',
        data: chartData.map(item => item.sales),
        borderColor: 'rgba(0, 171, 85, 1)',
        backgroundColor: 'rgba(0, 171, 85, 0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
      {
        label: 'Purchases',
        data: chartData.map(item => item.purchases),
        borderColor: 'rgba(255, 87, 34, 1)',
        backgroundColor: 'rgba(255, 87, 34, 0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: ctx => `₹${ctx.parsed.y.toLocaleString()}`
        }
      },
      legend: {
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: value => `₹${value / 1000}k`
        }
      }
    }
  };

  return (
    <div style={{ marginTop: 40 }}>
      <h3 style={{ marginBottom: 10 }}>📊 Revenue vs Purchases</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {timeRanges.map(r => (
          <button
            key={r.label}
            onClick={() => setRange(r.label)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: r.label === range ? '#007bff' : '#f1f1f1',
              color: r.label === range ? '#fff' : '#333',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p>⏳ Loading chart...</p>
      ) : (
        <div style={{ height: '340px' }}>
          <Line data={data} options={options} />
        </div>
      )}
    </div>
  );
};

export default RevenueVsPurchaseChart;
