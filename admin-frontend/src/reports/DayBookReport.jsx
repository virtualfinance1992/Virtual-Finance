import React from 'react';

export default function DayBookReport({ companyId, fromDate, toDate }) {
  return (
    <div>
      <h3>Day Book (incl. Post-Dated)</h3>
      <p>Company: {companyId}</p>
      <p>From: {fromDate.toLocaleDateString()} To: {toDate.toLocaleDateString()}</p>
      <p>(data will show here)</p>
    </div>
  );
}
