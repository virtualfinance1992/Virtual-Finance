import React from 'react';

export default function TopSupplierReport({ companyId, fromDate, toDate }) {
  return (
    <div>
      <h3>Top Supplier</h3>
      <p>Company: {companyId}</p>
      <p>From: {fromDate.toLocaleDateString()} To: {toDate.toLocaleDateString()}</p>
      <p>(data will show here)</p>
    </div>
  );
}
