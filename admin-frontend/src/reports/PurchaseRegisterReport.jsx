import React from 'react';

export default function PurchaseRegisterReport({ companyId, fromDate, toDate }) {
  return (
    <div>
      <h3>Purchase Register</h3>
      <p>Company: {companyId}</p>
      <p>From: {fromDate.toLocaleDateString()} To: {toDate.toLocaleDateString()}</p>
      <p>(data will show here)</p>
    </div>
  );
}
