// File: ReceiptTemplate.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './InvoiceTemplate.css'; // Reuse the existing invoice styles

const ReceiptTemplate = ({
  receiptData,      // all receipt‐specific fields come in via this prop
  onClose,
  onSave,
  onPrint,
  selectedCompanyId,
  customerId,       // not strictly needed here, but kept for parity
}) => {
  // ─── 1) DEBUG LOG ───────────────────────────────────────────────────────────────
  console.log('🔥 [ReceiptTemplate] receiptData prop =', receiptData);
  // ────────────────────────────────────────────────────────────────────────────────

  // ─── 2) HOOKS AT TOP LEVEL ──────────────────────────────────────────────────────
  const [companyData, setCompanyData] = useState(null);
  

  useEffect(() => {
    const companyId = selectedCompanyId || localStorage.getItem('activeCompanyId');
    const token = localStorage.getItem('accessToken');
    if (!companyId || !token) {
      console.warn('⚠️ Missing companyId or token when fetching companyData for Receipt.');
      return;
    }

    console.log('📡 Fetching company details for Receipt:', companyId);
    axios
      .get(`http://localhost:8000/api/admin/company/${companyId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log('✅ Company data fetched for receipt:', res.data);
        setCompanyData(res.data);
      })
      .catch((err) => {
        console.error('❌ Failed to fetch company details for receipt:', err);
        setCompanyData(null);
      });
  }, [selectedCompanyId]);
  // ────────────────────────────────────────────────────────────────────────────────

  if (!receiptData) {
    return <div>❌ No receipt data available.</div>;
  }

  // ─── 3) DESTRUCTURE receiptData ─────────────────────────────────────────────────
  const {
  // object containing company_name, logo_url, gstin, address, phone_number, bank_name, account_number, ifsc_code, branch, etc.
  partyName,      // “Received From” (string)
  receiptDate,    // e.g. "2025-06-02"
  receiptNumber,  // e.g. "REC-2025-0103"
  paymentMode,    // e.g. "cash" or "bank"
  reference,      // e.g. "Received from vamsi" or "--"
  amountPaid,     // numeric, e.g. 50
  totalAmount,    // numeric, same as amountPaid (or s.total_amount)
  amountInWords,  // e.g. "INR 50.00 Only"
  bankDetails,    // object { bankName, accountNumber, ifscCode, branch }
  qrCodeUrl,      // string URL to QR
  signatureUrl,   // string URL to signature image
       // callback when user clicks “Save”
         // callback when user clicks “Close”
} = receiptData;




  // Convert amount to number for formatting
  const amtNum = parseFloat(amountPaid) || 0;
  // Optionally convert to words (simple placeholder)

  // ────────────────────────────────────────────────────────────────────────────────
    const computedAmount =
    typeof totalAmount === 'number' ? totalAmount.toFixed(2) : '0.00';
  console.log('🔢 Computed “Amount” to display:', computedAmount);

  const computedWords =
    amountInWords ||
    (typeof totalAmount === 'number'
      ? `INR ${totalAmount.toFixed(2)} Only`
      : 'INR 0.00 Only');
  console.log('🔤 Computed “Amount (in words)” to display:', computedWords);

  return (
    <div className="invoice-overlay">
      <div className="invoice-box">
        {/* ─── HEADER ───────────────────────────────────────────────────────────────── */}
        <div className="invoice-header">
          <h2>RECEIPT</h2>
          <span className="invoice-label">ORIGINAL FOR RECIPIENT</span>
        </div>

        {/* ─── COMPANY INFO + RECEIPT META ─────────────────────────────────────────────── */}
        <table className="meta-table">
          <tbody>
            <tr>
              <td colSpan="2">
                <div className="company-header">
                  <img
                    src={companyData?.logo_url || '/default_logo.png'}
                    alt="Company Logo"
                    className="logo"
                  />
                  <div className="company-text">
                    <h2>{companyData?.company_name || 'Company Name'}</h2>
                    <p style={{ color: 'red' }}>
                      GSTIN: {companyData?.gstin || '--'}
                    </p>
                    <p>{companyData?.address || '--'}</p>
                    <p>Mobile: {companyData?.phone_number || '--'}</p>
                  </div>
                </div>
              </td>

              <td>
                <strong>Receipt #:</strong>
              </td>
              <td>
                <input type="text" value={receiptNumber || ''} readOnly />
              </td>
            </tr>
            <tr>
              <td>
                <strong>Receipt Date:</strong>
              </td>
              <td>
                <input type="date" value={receiptDate || ''} readOnly />
              </td>
              <td>
                <strong>Payment Mode:</strong>
              </td>
              <td>{paymentMode || 'N/A'}</td>
            </tr>
            <tr>
              <td>
                <strong>Reference:</strong>
              </td>
              <td colSpan="3">{reference || '--'}</td>
            </tr>
          </tbody>
        </table>

        {/* ─── RECEIVED FROM & AMOUNT SECTION ──────────────────────────────────────────── */}
        {/* ─── RECEIVED FROM & AMOUNT SECTION ──────────────────────────────────────────── */}
<table className="address-table">
  <thead>
    <tr>
      <th>Received From</th>
      <th>Amount</th>
      <th>Amount (in words)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>{partyName || '--'}</td>

      {/* Show ₹ X.XX, guarding against non‐number */}
      <td>
        ₹{' '}
        {typeof totalAmount === 'number'
          ? totalAmount.toFixed(2)
          : '0.00'}
      </td>

      {/* In‐words: use amountInWords if provided, otherwise fall back to totalAmount */}
      <td>
                <em>{computedWords}</em>
              </td>
    </tr>
  </tbody>
</table>


        {/* ─── BANK DETAILS + QR + SIGNATORY ───────────────────────────────────────────── */}
        <table className="footer-box">
          <tbody>
            <tr>
              <td>
                <strong>Bank Details:</strong>
                <br />
                Bank: {companyData?.bank_name || '--'}
                <br />
                A/C: {companyData?.account_number || '--'}
                <br />
                IFSC: {companyData?.ifsc_code || '--'}
                <br />
                Branch: {companyData?.branch || '--'}
              </td>
              <td className="qr-cell">
                {companyData?.qr_code && (
                  <img src={companyData.qr_code} alt="QR Code" />
                )}
              </td>
              <td className="stamp-cell">
                {companyData?.signature && (
                  <img src={companyData.signature} alt="Signature" />
                )}
                <br />
                For {companyData?.company_name || '--'}
                <br />
                (Authorized Signatory)
              </td>
            </tr>
          </tbody>
        </table>

        {/* ─── TERMS & CONDITIONS ───────────────────────────────────────────────────────── */}
        <div className="terms-conditions">
          <strong>Terms & Conditions:</strong>
          <ul>
            <li>Receipt is subject to realization of payment.</li>
            <li>No claims after 7 days from date of receipt.</li>
            <li>Keep this receipt safe for future reference.</li>
            <li>Subject to local Jurisdiction.</li>
          </ul>
        </div>

        {/* ─── ACTION BUTTONS ───────────────────────────────────────────────────────────── */}
        <div className="button-row">
          <button className="btn-save" onClick={onSave}>
            Save
          </button>
          <button className="btn-print" onClick={onPrint}>
            Print
          </button>
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptTemplate;