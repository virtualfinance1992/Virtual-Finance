import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './BalanceSheetReport.css';

export default function BalanceSheetReport({
  companyName,
  fromDate: initialFrom,
  toDate: initialTo
}) {
  const [periodType, setPeriodType] = useState('custom');
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState('Q1');
  const [customFrom, setCustomFrom] = useState(initialFrom);
  const [customTo, setCustomTo] = useState(initialTo);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const reportRef = useRef(null);

  // Build query params
  const getQueryParams = () => {
    if (periodType === 'custom') {
      return `from=${customFrom.toISOString().slice(0,10)}&to=${customTo.toISOString().slice(0,10)}`;
    }
    if (periodType === 'fy') {
      return `fy=${year}`;
    }
    return `quarter=${quarter}&year=${year}`;
  };

  // Fetch when period changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/reports/balance-sheet?${getQueryParams()}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        setData(await res.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [periodType, year, quarter, customFrom, customTo]);

  const getPeriodLabel = () => {
    if (periodType === 'custom') {
      return `${customFrom.toLocaleDateString()} – ${customTo.toLocaleDateString()}`;
    }
    if (periodType === 'fy') {
      return `FY ${year-1}-${String(year).slice(-2)}`;
    }
    return `${quarter} ${year}`;
  };

  const handlePrint = () => window.print();

  const handleDownloadPDF = () => {
    setExporting(true);
    setTimeout(() => {
      const input = reportRef.current;
      html2canvas(input, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p','mm','a4');
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = (canvas.height * pdfW) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
        pdf.save('Balance_Sheet.pdf');
        setExporting(false);
      });
    }, 100);
  };

  return (
    <div
      id="balance-sheet-report"
      ref={reportRef}
      className={`balance-sheet-report ${exporting ? 'export-mode' : ''}`}
    >
      <div className="report-header">
        <h1>Balance Sheet</h1>
        <div className="report-controls-and-actions">
          <div className="report-controls">
            <label>
              Period:&nbsp;
              <select
                value={periodType}
                onChange={e => setPeriodType(e.target.value)}
              >
                <option value="custom">Custom Range</option>
                <option value="fy">Financial Year</option>
                <option value="quarter">Quarter</option>
              </select>
            </label>
            {periodType === 'custom' && (
              <>
                <input
                  type="date"
                  value={customFrom.toISOString().slice(0,10)}
                  onChange={e => setCustomFrom(new Date(e.target.value))}
                />
                <input
                  type="date"
                  value={customTo.toISOString().slice(0,10)}
                  onChange={e => setCustomTo(new Date(e.target.value))}
                />
              </>
            )}
            {periodType === 'fy' && (
              <select
                value={year}
                onChange={e => setYear(+e.target.value)}
              >
                {[...Array(5)].map((_,i) => {
                  const y = new Date().getFullYear() - i;
                  return (
                    <option key={y} value={y}>
                      FY {y-1}-{String(y).slice(-2)}
                    </option>
                  );
                })}
              </select>
            )}
            {periodType === 'quarter' && (
              <>
                <select
                  value={year}
                  onChange={e => setYear(+e.target.value)}
                >
                  {[...Array(5)].map((_,i) => {
                    const y = new Date().getFullYear() - i;
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
                <select
                  value={quarter}
                  onChange={e => setQuarter(e.target.value)}
                >
                  {['Q1','Q2','Q3','Q4'].map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </>
            )}
          </div>
          <div className="report-actions">
            <button
              className="print-btn"
              onClick={handlePrint}
            >
              Print
            </button>
            <button
              className="download-btn"
              onClick={handleDownloadPDF}
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>

      <div className="report-period-display">
        <strong>{companyName}</strong>
        <span>Selected Period: {getPeriodLabel()}</span>
      </div>

      {loading && <p>Loading data…</p>}
      {error && <p className="error">Error: {error}</p>}
      {!loading && !error && (
        <table className="balance-sheet-table">
          <thead>
            <tr>
              <th>Assets</th>
              <th>Amount (₹)</th>
              <th>Liabilities &amp; Equity</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} className="placeholder">
                  No data for this period.
                </td>
              </tr>
            ) : data.map((r,i) => (
              <tr key={i}>
                <td>{r.assetName}</td>
                <td>{r.assetAmount.toFixed(2)}</td>
                <td>{r.liabilityName}</td>
                <td>{r.liabilityAmount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr>
                <td><strong>Total Assets</strong></td>
                <td>
                  <strong>
                    {data.reduce((sum,r)=>sum+r.assetAmount,0).toFixed(2)}
                  </strong>
                </td>
                <td><strong>Total Liabilities &amp; Equity</strong></td>
                <td>
                  <strong>
                    {data.reduce((sum,r)=>sum+r.liabilityAmount,0).toFixed(2)}
                  </strong>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  );
}
