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
  // ─── State & Refs ───
  const [periodType, setPeriodType] = useState('custom');
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState('Q1');
  const [customFrom, setCustomFrom] = useState(fromDate);
  const [customTo, setCustomTo] = useState(toDate);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [voucherTypeFilter, setVoucherTypeFilter] = useState('ALL');
  const reportRef = useRef(null);

  // For “Sales Accounts” expand/collapse in P&L
  const [expandedSales, setExpandedSales] = useState(false);

  // For any other group (other_income, cogs, expenses, income_tax)
  const [expandedGroups, setExpandedGroups] = useState({});

  function toggleSales() {
    setExpandedSales(prev => !prev);
  }
  function toggleGroup(section, groupName) {
    const key = `${section}::${groupName}`;
    setExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  // ─── Parameter builder (memoized) ───
  const buildParams = useCallback(() => {
    if (periodType === 'custom') {
      return {
        from: customFrom.toISOString().slice(0, 10),
        to: customTo.toISOString().slice(0, 10),
      };
    }
    if (periodType === 'fy') {
      return { fy: year };
    }
    return { quarter, year };
  }, [periodType, customFrom, customTo, year, quarter]);

  function getPeriodLabel() {
    if (periodType === 'custom') {
      return `${customFrom.toLocaleDateString()} – ${customTo.toLocaleDateString()}`;
    }
    if (periodType === 'fy') {
      return `FY ${year - 1}-${String(year).slice(-2)}`;
    }
    return `${quarter} ${year}`;
  }

  // Determine which kind of report we’re showing
  const isBalanceSheet = reportKey === 'balance-sheet';
  const isProfitLoss =
    reportKey === 'profit-loss' || reportKey === 'profit-and-loss';
  const isCashFlow = reportKey === 'cash-flow' || reportKey === 'cashflow';

  // ─── Fetch report data whenever companyId, reportKey, or period changes ───
  useEffect(() => {
    const params = buildParams();
    // Don’t fetch until “period” is fully selected:
    if (
      (periodType === 'custom' && (!customFrom || !customTo)) ||
      (periodType === 'fy' && !year) ||
      (periodType === 'quarter' && (!quarter || !year))
    ) {
      console.log('[GenericReport] Skipping fetch: period not fully selected');
      return;
    }

    const query = new URLSearchParams(params).toString();
    const token = localStorage.getItem('accessToken') || '';
    const url = `http://localhost:8000/api/reports/${companyId}/${reportKey}/?${query}`;

    console.log('[GenericReport] Fetching URL:', url, 'with params:', params);
    setLoading(true);
    setError(null);

    fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    })
      .then((res) => {
        console.log('[GenericReport] HTTP status:', res.status);
        return res.text().then((text) => {
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
      .catch((err) => {
        console.error('[GenericReport] Fetch error:', err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [companyId, reportKey, buildParams, periodType, customFrom, customTo, year, quarter]);

  // ─── Print / Download handlers (unchanged) ───
  function handlePrint() {
    console.log('[GenericReport] Initiating print for:', reportKey);
    if (!reportRef.current) return;
    // … (rest of print code) …
  }

  function handleDownloadPDF() {
    console.log('[GenericReport] Generating multipage PDF for:', reportKey);
    setExporting(true);
    // … (rest of PDF code) …
  }

  // ─── Early return states ───
  // If still loading:
  if (loading) return <p>Loading…</p>;
  // If we got an error:
  if (error) return <p className="error">Error: {error}</p>;
  // If data is null (e.g. before first fetch):
  if (!data) return null;

  // ───────────────────────────────────────────────────────────────────────────
  // ─── A) BALANCE SHEET ───
  // If this is a Balance Sheet response, it should be an object with keys
  // “assets”, “liabilities”, “equity”. We render that and return immediately.
  // ───────────────────────────────────────────────────────────────────────────
  if (isBalanceSheet && typeof data === 'object' && !Array.isArray(data)) {
    return (
      <div
        id={reportKey}
        ref={reportRef}
        className={`generic-report ${exporting ? 'export-mode' : ''}`}
      >
        {/* … Balance Sheet header … */}
        <div className="report-header--internal">
          <h1>{title}</h1>
          <div className="report-info">
            <strong>{companyName}</strong>
            <span>Period: {getPeriodLabel()}</span>
          </div>
        </div>

        {/* ASSETS */}
        <h2>Assets</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Group</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.assets.length === 0 ? (
              <tr>
                <td colSpan={2} className="placeholder">
                  No assets returned.
                </td>
              </tr>
            ) : (
              data.assets.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.group}</td>
                  <td style={{ textAlign: 'right' }}>{row.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* LIABILITIES */}
        <h2>Liabilities</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Group</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.liabilities.length === 0 ? (
              <tr>
                <td colSpan={2} className="placeholder">
                  No liabilities returned.
                </td>
              </tr>
            ) : (
              data.liabilities.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.group}</td>
                  <td style={{ textAlign: 'right' }}>{row.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* EQUITY */}
        <h2>Equity</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Group</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.equity.length === 0 ? (
              <tr>
                <td colSpan={2} className="placeholder">
                  No equity returned.
                </td>
              </tr>
            ) : (
              data.equity.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.group}</td>
                  <td style={{ textAlign: 'right' }}>{row.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    ); 
    // ← Notice we close this if‐block here, and do NOT close the GenericReport function yet!
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ─── B) PROFIT & LOSS ───
  // If this is a Profit & Loss response, data should be an object with keys:
  //   revenue, sales_by_party, other_income, cogs, gross_profit, expenses,
  //   operating_income, income_tax, net_income
  // We render it and return immediately.
  // ───────────────────────────────────────────────────────────────────────────
  if (isProfitLoss && typeof data === 'object' && !Array.isArray(data)) {
    // Combine “Sales Accounts” (data.revenue) with “Other Income” groups:
    const allIncomeGroups = [
      ...(data.revenue || []),      // might be empty if no sales at all
      ...(data.other_income || [])
    ];

    return (
      <div
        id={reportKey}
        ref={reportRef}
        className={`generic-report ${exporting ? 'export-mode' : ''}`}
      >
        {/* ─── Header ─── */}
        <div className="report-header--internal">
          <h1>{title}</h1>
          <div className="report-info">
            <strong>{companyName}</strong>
            <span>Period: {getPeriodLabel()}</span>
          </div>
        </div>

        {/* ─── Controls ─── */}
        <div className="controls-actions">
          <div className="controls">
            <label>
              Period:&nbsp;
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
              >
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
                  onChange={(e) => setCustomFrom(new Date(e.target.value))}
                />
                <input
                  type="date"
                  value={customTo.toISOString().slice(0, 10)}
                  onChange={(e) => setCustomTo(new Date(e.target.value))}
                />
              </>
            )}
            {periodType === 'fy' && (
              <select value={year} onChange={(e) => setYear(+e.target.value)}>
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
                <select value={year} onChange={(e) => setYear(+e.target.value)}>
                  {[...Array(5)].map((_, i) => {
                    const y = new Date().getFullYear() - i;
                    return (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                >
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
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

         {/* ─── REVENUE ─── */}
      <h2>Revenue</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '2rem' }}></th>
            <th>Account Group</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {(!data.revenue || data.revenue.length === 0) ? (
            <tr>
              <td colSpan={3} className="placeholder">
                No revenue returned.
              </td>
            </tr>
          ) : (
            data.revenue.map((grp, idx) => {
              // “isSales” if the group name contains the substring “sales” (case‐insensitive)
              const isSales = grp.group.toLowerCase().includes('sales');
              const key = isSales ? 'sales' : `other_income::${grp.group}`;
              const isExpanded = isSales ? expandedSales : !!expandedGroups[key];

              return (
                <React.Fragment key={idx}>
                  <tr>
                    <td
                      style={{ cursor: 'pointer', textAlign: 'center' }}
                      onClick={() => {
                        if (isSales) toggleSales();
                        else toggleGroup('other_income', grp.group);
                      }}
                    >
                      {isExpanded ? '−' : '+'}
                    </td>
                    <td>{grp.group}</td>
                    <td style={{ textAlign: 'right' }}>{grp.amount}</td>
                  </tr>

                  {/* NESTED ROWS: 
                       if “Sales,” show party‐wise; 
                       otherwise show raw “other_income” entries */}
                  {isExpanded && (
                    <tr>
                      <td></td>
                      <td colSpan={2}>
                        {isSales ? (
                          (data.sales_by_party && data.sales_by_party.length > 0) ? (
                            <table className="nested-table">
                              <thead>
                                <tr>
                                  <th>Party</th>
                                  <th style={{ textAlign: 'right' }}>Party Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.sales_by_party.map((partyRow, j) => (
                                  <tr key={j}>
                                    <td>{partyRow.party}</td>
                                    <td style={{ textAlign: 'right' }}>{partyRow.amount}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="placeholder">
                              No party‐wise sales returned.
                            </div>
                          )
                        ) : (
                          // “other_income” drill‐down
                          grp.entries && grp.entries.length > 0 ? (
                            <table className="nested-table">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Voucher #</th>
                                  <th>Ledger</th>
                                  <th style={{ textAlign: 'right' }}>Signed Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {grp.entries.map((e, j) => (
                                  <tr key={j}>
                                    <td>{e.date}</td>
                                    <td>{e.voucher_number}</td>
                                    <td>{e.ledger_name}</td>
                                    <td style={{ textAlign: 'right' }}>{e.signed_amount}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="placeholder">
                              No entries for {grp.group}.
                            </div>
                          )
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>

      {/* ─── COST OF GOODS SOLD ─── */}
      <h2>Cost of Goods Sold</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '2rem' }}></th>
            <th>Account Group</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {(!data.cogs || data.cogs.length === 0) ? (
            <tr>
              <td colSpan={3} className="placeholder">
                No COGS returned.
              </td>
            </tr>
          ) : (
            data.cogs.map((row, idx) => {
              const key = `cogs::${row.group}`;
              const isExpanded = !!expandedGroups[key];

              return (
                <React.Fragment key={idx}>
                  <tr>
                    <td
                      style={{ cursor: 'pointer', textAlign: 'center' }}
                      onClick={() =>
                        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
                      }
                    >
                      {isExpanded ? '−' : '+'}
                    </td>
                    <td>{row.group}</td>
                    <td style={{ textAlign: 'right' }}>{row.amount}</td>
                  </tr>

                  {/* If “Purchase Accounts,” show vendor‐wise totals */}
                  {isExpanded && row.group === 'Purchase Accounts' && (
                    <tr>
                      <td></td>
                      <td colSpan={2}>
                        <table className="nested-table">
                          <thead>
                            <tr>
                              <th>Vendor</th>
                              <th style={{ textAlign: 'right' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(data.purchase_by_party && data.purchase_by_party.length > 0) ? (
                              data.purchase_by_party.map((vrow, j) => (
                                <tr key={j}>
                                  <td>{vrow.party}</td>
                                  <td style={{ textAlign: 'right' }}>{vrow.amount}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={2} className="placeholder">
                                  No party‐wise purchases returned.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}

                  {/* Otherwise, show raw entries for any other COGS group */}
                  {isExpanded && row.group !== 'Purchase Accounts' && (
                    <tr>
                      <td></td>
                      <td colSpan={2}>
                        <table className="nested-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Voucher #</th>
                              <th>Ledger</th>
                              <th style={{ textAlign: 'right' }}>Signed Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.entries.map((e, j) => (
                              <tr key={j}>
                                <td>{e.date}</td>
                                <td>{e.voucher_number}</td>
                                <td>{e.ledger_name}</td>
                                <td style={{ textAlign: 'right' }}>{e.signed_amount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>

      {/* ─── GROSS PROFIT ─── */}
      <h2>Gross Profit: {data.gross_profit}</h2>

      {/* ─── EXPENSES ─── */}
      <h2>Expenses</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '2rem' }}></th>
            <th>Account Group</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {(!data.expenses || data.expenses.length === 0) ? (
            <tr>
              <td colSpan={3} className="placeholder">
                No expenses returned.
              </td>
            </tr>
          ) : (
            data.expenses.map((grp, idx) => {
              const key = `expenses::${grp.group}`;
              const isExpanded = !!expandedGroups[key];

              return (
                <React.Fragment key={idx}>
                  <tr>
                    <td
                      style={{ cursor: 'pointer', textAlign: 'center' }}
                      onClick={() => toggleGroup('expenses', grp.group)}
                    >
                      {isExpanded ? '−' : '+'}
                    </td>
                    <td>{grp.group}</td>
                    <td style={{ textAlign: 'right' }}>{grp.amount}</td>
                  </tr>
                  {isExpanded && grp.entries && grp.entries.length > 0 && (
                    <tr>
                      <td></td>
                      <td colSpan={2}>
                        <table className="nested-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Voucher #</th>
                              <th>Ledger</th>
                              <th style={{ textAlign: 'right' }}>Signed Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grp.entries.map((e, j) => (
                              <tr key={j}>
                                <td>{e.date}</td>
                                <td>{e.voucher_number}</td>
                                <td>{e.ledger_name}</td>
                                <td style={{ textAlign: 'right' }}>{e.signed_amount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>

      {/* ─── OPERATING INCOME ─── */}
      <h2>Operating Income: {data.operating_income}</h2>

      {/* ─── INCOME TAX EXPENSE ─── */}
      <h2>Income Tax Expense</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '2rem' }}></th>
            <th>Account Group</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {(!data.income_tax || data.income_tax.length === 0) ? (
            <tr>
              <td colSpan={3} className="placeholder">
                No income tax returned.
              </td>
            </tr>
          ) : (
            data.income_tax.map((grp, idx) => {
              const key = `income_tax::${grp.group}`;
              const isExpanded = !!expandedGroups[key];

              return (
                <React.Fragment key={idx}>
                  <tr>
                    <td
                      style={{ cursor: 'pointer', textAlign: 'center' }}
                      onClick={() => toggleGroup('income_tax', grp.group)}
                    >
                      {isExpanded ? '−' : '+'}
                    </td>
                    <td>{grp.group}</td>
                    <td style={{ textAlign: 'right' }}>{grp.amount}</td>
                  </tr>
                  {isExpanded && grp.entries && grp.entries.length > 0 && (
                    <tr>
                      <td></td>
                      <td colSpan={2}>
                        <table className="nested-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Voucher #</th>
                              <th>Ledger</th>
                              <th style={{ textAlign: 'right' }}>Signed Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grp.entries.map((e, j) => (
                              <tr key={j}>
                                <td>{e.date}</td>
                                <td>{e.voucher_number}</td>
                                <td>{e.ledger_name}</td>
                                <td style={{ textAlign: 'right' }}>{e.signed_amount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>

      {/* ─── NET INCOME ─── */}
      <h2>Net Income: {data.net_income}</h2>
    </div>
  );
}

  // ───────────────────────────────────────────────────────────────────────────
  // ─── C) CASH FLOW ───
  // If this is a Cash Flow response, data should be an object with keys:
  //   operating, investing, financing, net_change
  // We render it and return immediately.
  // ───────────────────────────────────────────────────────────────────────────
  if (isCashFlow && typeof data === 'object' && !Array.isArray(data)) {
    return (
      <div
        id={reportKey}
        ref={reportRef}
        className={`generic-report ${exporting ? 'export-mode' : ''}`}
      >
        {/* … Cash Flow header & controls … */}
        <div className="report-header--internal">
          <h1>{title}</h1>
          <div className="report-info">
            <strong>{companyName}</strong>
            <span>Period: {getPeriodLabel()}</span>
          </div>
        </div>

        <div className="controls-actions">
          <div className="controls">
            <label>
              Period:&nbsp;
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
              >
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
                  onChange={(e) => setCustomFrom(new Date(e.target.value))}
                />
                <input
                  type="date"
                  value={customTo.toISOString().slice(0, 10)}
                  onChange={(e) => setCustomTo(new Date(e.target.value))}
                />
              </>
            )}
            {periodType === 'fy' && (
              <select
                value={year}
                onChange={(e) => setYear(+e.target.value)}
              >
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
                <select
                  value={year}
                  onChange={(e) => setYear(+e.target.value)}
                >
                  {[...Array(5)].map((_, i) => {
                    const y = new Date().getFullYear() - i;
                    return (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                >
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
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

        {/* ─── Operating Activities ─── */}
        <h2>Operating Activities</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Group</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.operating.length === 0 ? (
              <tr>
                <td colSpan={2} className="placeholder">
                  No operating activities returned.
                </td>
              </tr>
            ) : (
              data.operating.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.group}</td>
                  <td style={{ textAlign: 'right' }}>{row.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ─── Investing Activities ─── */}
        <h2>Investing Activities</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Group</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.investing.length === 0 ? (
              <tr>
                <td colSpan={2} className="placeholder">
                  No investing activities returned.
                </td>
              </tr>
            ) : (
              data.investing.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.group}</td>
                  <td style={{ textAlign: 'right' }}>{row.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ─── Financing Activities ─── */}
        <h2>Financing Activities</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Account Group</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.financing.length === 0 ? (
              <tr>
                <td colSpan={2} className="placeholder">
                  No financing activities returned.
                </td>
              </tr>
            ) : (
              data.financing.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.group}</td>
                  <td style={{ textAlign: 'right' }}>{row.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ─── Net Change ─── */}
        <h2>Net Change: {data.net_change}</h2>
      </div>
    );
    // ← Cash Flow return closes here, but STILL inside GenericReport!
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ─── D) OTHER REPORTS (array of objects) ───
  // If data is a simple array (Sales Register, Purchase Register, etc.), render a single table:
  // ───────────────────────────────────────────────────────────────────────────
  if (Array.isArray(data)) {
    return (
      <div
        id={reportKey}
        ref={reportRef}
        className={`generic-report ${exporting ? 'export-mode' : ''}`}
      >
        {/* … header, controls … */}
        <div className="report-header--internal">
          <h1>{title}</h1>
          <div className="report-info">
            <strong>{companyName}</strong>
            <span>Period: {getPeriodLabel()}</span>
          </div>
        </div>
        <div className="voucher-type-filters">
          {['ALL', 'SALES', 'PURCHASE', 'EXPENSE', 'PAYMENT', 'RECEIPT', 'JOURNAL'].map((type) => (
            <button
              key={type}
              className={`voucher-filter-btn ${
                voucherTypeFilter === type ? 'active' : ''
              }`}
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
              <select value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
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
                  onChange={(e) => setCustomFrom(new Date(e.target.value))}
                />
                <input
                  type="date"
                  value={customTo.toISOString().slice(0, 10)}
                  onChange={(e) => setCustomTo(new Date(e.target.value))}
                />
              </>
            )}
            {periodType === 'fy' && (
              <select value={year} onChange={(e) => setYear(+e.target.value)}>
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
                <select value={year} onChange={(e) => setYear(+e.target.value)}>
                  {[...Array(5)].map((_, i) => {
                    const y = new Date().getFullYear() - i;
                    return (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                >
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
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
                .filter(
                  (row) =>
                    voucherTypeFilter === 'ALL' || row.voucher_type === voucherTypeFilter
                )
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

  // ───────────────────────────────────────────────────────────────────────────
  // ─── E) Fallback: If data is neither an object‐report nor array‐report, show raw JSON ───
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div
      id={reportKey}
      ref={reportRef}
      className={`generic-report ${exporting ? 'export-mode' : ''}`}
    >
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );

  // ─── At this point, we close the GenericReport function ───
}
