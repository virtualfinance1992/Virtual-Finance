import React from 'react';

export default function Gstr3bReport({ companyId, fromDate, toDate }) {
  return (
    <div>
      <h3>GSTR-3B</h3>
      <p>Company: {companyId}</p>
      <p>From: {fromDate.toLocaleDateString()} To: {toDate.toLocaleDateString()}</p>
      <p>(data will show here)</p>
    </div>
  );
}
