import React from 'react';

export default function Gstr9Report({ companyId, fromDate, toDate }) {
  return (
    <div>
      <h3>GSTR-9</h3>
      <p>Company: {companyId}</p>
      <p>From: {fromDate.toLocaleDateString()} To: {toDate.toLocaleDateString()}</p>
      <p>(data will show here)</p>
    </div>
  );
}
