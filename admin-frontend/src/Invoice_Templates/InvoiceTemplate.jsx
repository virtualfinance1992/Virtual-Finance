import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './InvoiceTemplate.css';

const InvoiceTemplate = ({ invoiceData, onClose, onSave, onPrint, selectedCompanyId, customerId }) => {
  const [companyData, setCompanyData] = useState(null);

  useEffect(() => {
  const companyId = selectedCompanyId || localStorage.getItem('activeCompanyId');
  const token = localStorage.getItem('accessToken');

  if (!companyId) {
    console.warn("⚠️ No company ID provided.");
    return;
  }

  if (!token) {
    console.warn("❌ No access token found.");
    return;
  }

  console.log("📡 Fetching company details for Invoice:", companyId);

  axios.get(`http://localhost:8000/api/admin/company/${companyId}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    }
  })
    .then(res => {
      console.log("✅ Company data fetched for invoice:", res.data);
      setCompanyData(res.data);
    })
    .catch(err => {
      console.error("❌ Failed to fetch company details for invoice:", err);
      setCompanyData(null);
    });

}, [selectedCompanyId]);


  if (!invoiceData) return <div>❌ No invoice data found.</div>;

  const { items, invoiceDate, totalAmount, amountPaid, paymentMode, invoiceNumber, customer, customerAddress } = invoiceData;
  const balanceDue = totalAmount - (amountPaid || 0);

  const calculateItemTotals = (item) => {
    const base = item.qty * item.rate - item.discount;
    const tax = (base * item.gst / 100).toFixed(2);
    const amount = (base + parseFloat(tax)).toFixed(2);
    return {
      base: base.toFixed(2),
      tax,
      amount
    };
  };

  return (
    <div className="invoice-overlay">
      <div className="invoice-box">
        <div className="header-top-row">
          <h2 className="invoice-title">TAX INVOICE</h2>
          <span className="original-copy">ORIGINAL FOR RECIPIENT</span>
        </div>

        <table className="meta-table">
  <tbody>
    <tr>
      <td colSpan="2">
        <div className="company-header">
          <img src={companyData?.logo || '/default_logo.png'} alt="Logo" className="logo" />
          <div className="company-text">
            <h2>{companyData?.company_name || 'Company Name'}</h2>
            <p style={{ color: 'red' }}>GSTIN: {companyData?.gst_number || '--'}</p>
            <p>{companyData?.address || '--'}</p>
            <p>Mobile: {companyData?.phone_number || '--'}</p>
          </div>
        </div>
      </td>
      <td><strong>Invoice #</strong></td>
      <td><input type="text" value={invoiceData.invoiceNumber || ''} readOnly /></td>
    </tr>
    <tr>
      <td><strong>Invoice Date</strong></td>
      <td><input type="date" value={invoiceData.invoiceDate || ''} readOnly /></td>
      <td><strong>Place of Supply</strong></td>
      <td><input type="text" value={companyData?.state || '36-TELANGANA'} readOnly /></td>
    </tr>
    <tr>
      <td><strong>Due Date</strong></td>
      <td><input type="text" value="Immediate" readOnly /></td>
      <td colSpan="2"></td>
    </tr>
  </tbody>
</table>


        <table className="address-table">
          <thead>
            <tr>
              <th>Customer Details</th>
              <th>Shipping Address</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{customer}<br />{customerAddress}</td>
              <td>{customerAddress}</td>
              <td>--</td>
            </tr>
          </tbody>
        </table>

        <table className="item-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>HSN/SAC</th>
              <th>Rate / Item</th>
              <th>Qty</th>
              <th>Taxable Value</th>
              <th>Tax Amount</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const { base, tax, amount } = calculateItemTotals(item);
              return (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{item.description || item.name}</td>
                  <td>{item.hsn}</td>
                  <td>{item.rate}</td>
                  <td>{item.qty}</td>
                  <td>{base}</td>
                  <td>{tax}</td>
                  <td>{amount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <table className="summary-table">
          <tbody>
            <tr>
              <td>Total Items: {items.length}</td>
              <td>GST: ₹ {items.reduce((sum, i) => sum + ((i.qty * i.rate) * (i.gst / 100)), 0).toFixed(2)}</td>
              <td><strong>Total: ₹ {totalAmount}</strong></td>
            </tr>
            <tr>
              <td colSpan="3">Amount in words: INR {totalAmount} Only</td>
            </tr>
          </tbody>
        </table>

        <table className="summary-table">
          <tbody>
            <tr>
              <td><strong>Paid:</strong></td>
              <td>₹ {amountPaid || 0}</td>
              <td><strong>Mode:</strong></td>
              <td>{paymentMode || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Due:</strong></td>
              <td colSpan="3">₹ {balanceDue.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <table className="footer-box">
          <tbody>
            <tr>
              <td>
                <strong>Bank Details:</strong><br />
                Bank: {companyData?.bank_name}<br />
                A/C: {companyData?.account_number}<br />
                IFSC: {companyData?.ifsc_code}<br />
                Branch: {companyData?.branch}
              </td>
              <td className="qr-cell">
                {companyData?.qr_code && <img src={companyData.qr_code} alt="QR Code" />}
              </td>
              <td className="stamp-cell">
                {companyData?.signature && <img src={companyData.signature} alt="Signature" />}
                <br />For {companyData?.company_name}<br />(Authorized Signatory)
              </td>
            </tr>
          </tbody>
        </table>

        <div className="terms-section">
          <strong>Terms & Conditions:</strong>
          <ul>
            <li>Goods once sold cannot be taken back or exchanged.</li>
            <li>We are not the manufacturers; warranty as per brand policy.</li>
            <li>Interest @24% p.a. will be charged for delayed payments.</li>
            <li>Subject to local Jurisdiction.</li>
          </ul>
        </div>

        <div className="action-buttons">
          <button className="save-btn" onClick={onSave}>Save</button>
          <button className="print-btn" onClick={onPrint}>Print</button>
          <button className="close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;