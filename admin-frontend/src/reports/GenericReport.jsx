// src/reports/GenericReport.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './GenericReport.css';

export default function GenericReport({
  companyId,
  reportKey,
  title,
  companyName,
  fromDate,
  toDate,
}) {
  const [periodType, setPeriodType]   = useState('custom');
  const [year, setYear]               = useState(new Date().getFullYear());
  const [quarter, setQuarter]         = useState('Q1');
  const [customFrom, setCustomFrom]   = useState(fromDate);
  const [customTo, setCustomTo]       = useState(toDate);
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [exporting, setExporting]     = useState(false);
  const reportRef = useRef(null);
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('ALL');

  // ── Memoize parameter builder ──
  const buildParams = useCallback(() => {
    if (periodType === 'custom') {
      return {
        from: customFrom.toISOString().slice(0, 10),
        to:   customTo.toISOString().slice(0, 10),
      };
    }
    if (periodType === 'fy') {
      return { fy: year };
    }
    return { quarter, year };
  }, [periodType, customFrom, customTo, year, quarter]);

  // ── Human‐readable period label ──
  function getPeriodLabel() {
    if (periodType === 'custom') {
      return `${customFrom.toLocaleDateString()} – ${customTo.toLocaleDateString()}`;
    }
    if (periodType === 'fy') {
      return `FY ${year - 1}-${String(year).slice(-2)}`;
    }
    return `${quarter} ${year}`;
  }

  // ── Identify financial‐statement types ──
  const isBalanceSheet = reportKey === 'balance-sheet';
  const isProfitLoss   = reportKey === 'profit-loss' || reportKey === 'profit-and-loss';
  const isCashFlow     = reportKey === 'cash-flow' || reportKey === 'cashflow';

  // ── Fetch report data ──
  useEffect(() => {
    const params = buildParams();
    const query  = new URLSearchParams(params).toString();
    const token  = localStorage.getItem('accessToken') || '';
    const url    = `http://localhost:8000/api/reports/${companyId}/${reportKey}/?${query}`;

    console.log('[GenericReport] Fetching URL:', url, 'with params:', params);

    setLoading(true);
    setError(null);

    fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    })
      .then(res => {
        console.log('[GenericReport] HTTP status:', res.status);
        return res.text().then(text => {
          console.log('[GenericReport] Raw response text:', text.slice(0, 200));
          try {
            const json = JSON.parse(text);
            console.log('[GenericReport] Parsed JSON:', json);
            setData(json);
          } catch (err) {
            console.error('[GenericReport] JSON parse error:', err);
            throw new Error('Expected JSON but got HTML/text');
          }
        });
      })
      .catch(err => {
        console.error('[GenericReport] Fetch error:', err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [companyId, reportKey, buildParams]);

  // ── Print handler ──
  function handlePrint() {
    console.log('[GenericReport] Initiating print for:', reportKey);
    if (!reportRef.current) return;

    const html = reportRef.current.outerHTML;
    const styles = `
      <style>
        :root { --erp-bg:#fff; --erp-text-primary:#2c3e50; --erp-border:#dcdcdc; --erp-button-bg:#2e86ab; --erp-button-text:#fff; }
        body { margin:0;padding:1rem;background:var(--erp-bg);font-family:Arial,sans-serif;color:var(--erp-text-primary); }
        .generic-report { padding:2rem;border-radius:8px;box-shadow:none; }
        .report-header--internal { display:flex;justify-content:space-between;border-bottom:2px solid var(--erp-button-bg);padding-bottom:.5rem;margin-bottom:1rem; }
        .report-header--internal h1 { margin:0;font-size:2rem;color:var(--erp-button-bg); }
        .report-info { font-size:1rem;color:#566573;margin-bottom:1rem; }
        .controls-actions, .error { display:none!important; }
        .data-table { width:100%;border-collapse:collapse;margin-top:1rem; }
        .data-table th, .data-table td { border:1px solid var(--erp-border);padding:.75rem; }
        .data-table th { background:var(--erp-button-bg);color:var(--erp-button-text);text-align:center; }
        .data-table td { text-align:right; }
        .data-table td:first-child, .data-table td:nth-child(3) { text-align:left;font-weight:500; }
        .placeholder { text-align:center;color:#566573;font-style:italic; }
        @page { margin:0; }
      </style>
    `;

    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(`<html><head><title>${title}</title>${styles}</head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
      console.log('[GenericReport] Print dialog closed');
    }, 300);
  }

  // ── PDF download handler ──
  function handleDownloadPDF() {
    console.log('[GenericReport] Generating multipage PDF for:', reportKey);
    setExporting(true);

    html2canvas(reportRef.current, { scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${reportKey}.pdf`);
      console.log('[GenericReport] Multi-page PDF saved');
      setExporting(false);
    }).catch(err => {
      console.error('[GenericReport] PDF error:', err);
      setExporting(false);
    });
  }

  // ─── Render Logic ───
  if (loading) return <p>Loading…</p>;
  if (error)   return <p className="error">Error: {error}</p>;
  if (!data)   return null;

  // ─── A) Balance Sheet (object with assets/liabilities/equity) ───
  if (isBalanceSheet && typeof data === 'object' && !Array.isArray(data)) {
    return (
      <div id={reportKey} ref={reportRef} className={`generic-report ${exporting ? 'export-mode' : ''}`}>
        <div className="report-header--internal">
          <h1>{title}</h1>
          <div className="report-info">
            <strong>{companyName}</strong>
            <span>Period: {getPeriodLabel()}</span>
          </div>
        </div>

        {/* Assets Table */}
        <h2>Assets</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Group</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.assets.length === 0 ? (
              <tr>
                <td colSpan={2} className="placeholder">No assets returned.</td>
              </tr>
            ) : (
              data.assets.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.group}</td>
                  <td>{row.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Liabilities Table */}
        <h2>Liabilities</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Group</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.liabilities.length === 0 ? (
              <tr>
                <td colSpan={2} className="placeholder">No liabilities returned.</td>
              </tr>
            ) : (
              data.liabilities.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.group}</td>
                  <td>{row.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Equity Table */}
        <h2>Equity</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Group</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.equity.length === 0 ? (
              <tr>
                <td colSpan={2} className="placeholder">No equity returned.</td>
              </tr>
            ) : (
              data.equity.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.group}</td>
                  <td>{row.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // ─── B) Profit & Loss (object with revenue/expenses/net_profit) ───
  if (isProfitLoss && typeof data === 'object' && !Array.isArray(data)) {
    return (
      <div id={reportKey} ref={reportRef} className={`generic-report ${exporting ? 'export-mode' : ''}`}>
        <div className="report-header--internal">
          <h1>{title}</h1>
          <div className="report-info">
            <strong>{companyName}</strong>
            <span>Period: {getPeriodLabel()}</span>
          </div>
        </div>

        {/* Revenue Table */}
        <h2>Revenue</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Group</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.revenue.length === 0 ? (
              <tr>
                <td colSpan={2} className="placeholder">No revenue returned.</td>
              </tr>
            ) : (
              data.revenue.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.group}</td>
                  <td>{row.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Expenses Table */}
        <h2>Expenses</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Group</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.expenses.length === 0 ? (
              <tr>
                <td colSpan={2} className="placeholder">No expenses returned.</td>
              </tr>
            ) : (
              data.expenses.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.group}</td>
                  <td>{row.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Net Profit */}
        <h2>Net Profit: {data.net_profit}</h2>
      </div>
    );
  }

  // ─── C) Cash Flow (object with operating/investing/financing/net_change) ───
  if (isCashFlow && typeof data === 'object' && !Array.isArray(data)) {
    return (
      <div id={reportKey} ref={reportRef} className={`generic-report ${exporting ? 'export-mode' : ''}`}>
        <div className="report-header--internal">
          <h1>{title}</h1>
          <div className="report-info">
            <strong>{companyName}</strong>
            <span>Period: {getPeriodLabel()}</span>
          </div>
        </div>

        {/* Operating Activities Table */}
        <h2>Operating Activities</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Group</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.operating.length === 0 ? (
              <tr>
                <td colSpan={2} className="placeholder">No operating activities returned.</td>
              </tr>
            ) : (
              data.operating.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.group}</td>
                  <td>{row.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Investing Activities Table */}
        <h2>Investing Activities</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Group</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.investing.length === 0 ? (
              <tr>
                <td colSpan={2} className="placeholder">No investing activities returned.</td>
              </tr>
            ) : (
              data.investing.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.group}</td>
                  <td>{row.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Financing Activities Table */}
        <h2>Financing Activities</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Group</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.financing.length === 0 ? (
              <tr>
                <td colSpan={2} className="placeholder">No financing activities returned.</td>
              </tr>
            ) : (
              data.financing.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.group}</td>
                  <td>{row.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Net Change */}
        <h2>Net Change: {data.net_change}</h2>
      </div>
    );
  }

  // ─── D) Other reports (array of objects, use data.filter and single table) ───
  if (Array.isArray(data)) {
    return (
      <div id={reportKey} ref={reportRef} className={`generic-report ${exporting ? 'export-mode' : ''}`}>
        <div className="report-header--internal">
          <h1>{title}</h1>
          <div className="report-info">
            <strong>{companyName}</strong>
            <span>Period: {getPeriodLabel()}</span>
          </div>
        </div>

        {/* Voucher Type Filters */}
        <div className="voucher-type-filters">
          {['ALL', 'SALES', 'PURCHASE', 'EXPENSE', 'PAYMENT', 'RECEIPT', 'JOURNAL'].map(type => (
            <button
              key={type}
              className={`voucher-filter-btn ${voucherTypeFilter === type ? 'active' : ''}`}
              onClick={() => setVoucherTypeFilter(type)}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="controls-actions">
          <div className="controls">
            <label>
              Period:&nbsp;
              <select value={periodType} onChange={e => setPeriodType(e.target.value)}>
                <option value="custom">Custom</option>
                <option value="fy">Financial Year</option>
                <option value="quarter">Quarter</option>
              </select>
            </label>
            {periodType === 'custom' && (
              <>
                <input
                  type="date"
                  value={customFrom.toISOString().slice(0, 10)}
                  onChange={e => setCustomFrom(new Date(e.target.value))}
                />
                <input
                  type="date"
                  value={customTo.toISOString().slice(0, 10)}
                  onChange={e => setCustomTo(new Date(e.target.value))}
                />
              </>
            )}
            {periodType === 'fy' && (
              <select value={year} onChange={e => setYear(+e.target.value)}>
                {[...Array(5)].map((_, i) => {
                  const y = new Date().getFullYear() - i;
                  return (
                    <option key={y} value={y}>
                      FY {y - 1}-{String(y).slice(-2)}
                    </option>
                  );
                })}
              </select>
            )}
            {periodType === 'quarter' && (
              <>
                <select value={year} onChange={e => setYear(+e.target.value)}>
                  {[...Array(5)].map((_, i) => {
                    const y = new Date().getFullYear() - i;
                    return (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    );
                  })}
                </select>
                <select value={quarter} onChange={e => setQuarter(e.target.value)}>
                  {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div className="actions">
            <button className="print-btn" onClick={handlePrint}>
              Print
            </button>
            <button className="download-btn" onClick={handleDownloadPDF}>
              Download PDF
            </button>
          </div>
        </div>

        <table className="data-table">
          {data.length > 0 && (
            <thead>
              <tr>
                {Object.keys(data[0]).map((key, idx) => (
                  <th key={idx}>{key.replace(/_/g, ' ').toUpperCase()}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={99} className="placeholder">
                  No data for this period.
                </td>
              </tr>
            ) : (
              data
                .filter(row => voucherTypeFilter === 'ALL' || row.voucher_type === voucherTypeFilter)
                .map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j}>{val}</td>
                    ))}
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // ─── E) Fallback: if data is neither object nor array, render raw JSON ───
  return (
    <div id={reportKey} ref={reportRef} className={`generic-report ${exporting ? 'export-mode' : ''}`}>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
