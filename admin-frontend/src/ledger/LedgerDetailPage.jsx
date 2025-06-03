// src/ledger/LedgerDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link }            from 'react-router-dom';
import { toast }                       from 'react-toastify';
import { ToastContainer } from 'react-toastify';
import axios                           from 'axios';
import './LedgerDetailPage.css';
import { Share2 }                      from 'lucide-react';
import InvoiceTemplate from '../Invoice_Templates/InvoiceTemplate';  // adjust the path as needed
import ReceiptTemplate from '../Invoice_Templates/ReceiptTemplate';





import { useRef } from "react";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';




const API_BASE = 'http://localhost:8000/api/accounting';

export default function LedgerDetailPage() {
  const { ledgerId } = useParams();
  const companyId    = localStorage.getItem('activeCompanyId');
  const token        = localStorage.getItem('accessToken');
  const [company, setCompany] = useState(null);
  const [ledgerPeriod, setLedgerPeriod] = useState({ from: '', to: '' });

  const [ledger,      setLedger]      = useState(null);
  const [entries,     setEntries]     = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [showSummary, setShowSummary] = useState(true);
  const [summary, setSummary] = useState({ count: 0, totalDr: 0, totalCr: 0, balance: 0 });

    // ─── Receipt‐modal state ─────────────────────────────────────────────────────
  // State to hold and show a Receipt‐only modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData]         = useState(null);

  // ─────────────────────────────────────────────────────────────────────────────



   // → state for history modal
   const [historyModal,     setHistoryModal]     = useState(false);
   const [historySnapshots, setHistorySnapshots] = useState([]);
   const [selectedVoucher,  setSelectedVoucher]  = useState(null);
  // fOR INVOICE TEMPLATE 
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData]       = useState(null);

  const selectedCompanyName = localStorage.getItem('selectedCompanyName');
  const selectedCompanyLogo = localStorage.getItem('selectedCompanyLogo');
  


  console.log("🏢 Selected Company Name:", selectedCompanyName);
  console.log("🖼️ Selected Company Logo URL:", selectedCompanyLogo);
  



  const th = {
  padding: '10px',
  borderBottom: '2px solid #ccc',
  textAlign: 'left',
  fontWeight: 600,
};

const td = {
  padding: '8px 10px',
  borderBottom: '1px solid #eee',
};


  const openingBalance = entries.reduce((acc, e) => {
  if (dateFrom && new Date(e.date) < new Date(dateFrom)) {
    return e.type === 'Dr' ? acc + e.amount : acc - e.amount;
  }
  return acc;
}, 0);



// 1️⃣ Update your API_BASE (if not already)
const API_BASE = 'http://localhost:8000/api/accounting';

// Fetch company info
useEffect(() => {
  if (!companyId || !token) return;

  axios.get(`http://localhost:8000/api/admin/company/${companyId}/`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => {
    setCompany(res.data);
    console.log("🏢 Company loaded:", res.data);
  })
  .catch(err => {
    console.error("❌ Company fetch failed:", err);
  });
}, [companyId, token]);

// Calculate ledger period
useEffect(() => {
  if (!entries || entries.length === 0) return;

  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  setLedgerPeriod({
    from: sorted[0]?.date,
    to: sorted[sorted.length - 1]?.date
  });
}, [entries]);


useEffect(() => {
  if (!company || !company.logo) return;

  const logoPath = company.logo;
  const fullLogoUrl = logoPath.startsWith('http')
    ? logoPath
    : `http://localhost:8000${logoPath}`;

  localStorage.setItem('selectedCompanyLogo', fullLogoUrl);
  console.log("💾 Saved logo URL to localStorage:", fullLogoUrl);
}, [company]);

// 2️⃣ Your openHistory function:
/*function openHistory(voucherId) {
  const url = `http://localhost:8000/api/voucher-audit/company/${companyId}/voucher/${voucherId}/history/`;
  console.log('🔄 Open history for voucher_id:', voucherId);
  console.log('📤 GET', url, 'Authorization: Bearer', token);

  axios.get(url, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => {
    console.log('✅ History snapshots:', res.data);
    console.log('🔍 Full snapshot objects:', JSON.stringify(res.data, null, 2));
    setHistorySnapshots(res.data);
    setHistoryModal(true);
  })
  .catch(err => {
    console.error('❌ Error fetching history:', err);
    toast.error('Failed to load voucher history');
  });
} */

// 3️⃣ Wire it up in your table:



  // 1) Load ledger & entries
  useEffect(() => {
    console.log(`🔄 Loading ledger ${ledgerId} for company ${companyId}`);
    axios.get(`${API_BASE}/ledger/${companyId}/detail/${ledgerId}/`, {
      headers:{ Authorization:`Bearer ${token}` }
    })
    .then(res => {
      console.log('🔍 Entries raw response:', res);
      console.log('🔍 Entries data payload:', res.data);
      console.log('✅ Ledger info:', res.data);
      setLedger(res.data);
    })
    .catch(err => {
      console.error('❌ Error loading ledger detail:', err);
      toast.error('Failed to load ledger');
    });

    axios.get(`${API_BASE}/ledger/${companyId}/entries/${ledgerId}/`, {
      headers:{ Authorization:`Bearer ${token}` }
    })
    .then(res => {
      console.log('✅ Entries loaded:', res.data);
      setEntries(res.data);

      // compute summary
      const sum = res.data.reduce((acc, e) => {
        acc.count += 1;
        if (e.type === 'Dr') acc.totalDr += e.amount;
        else                 acc.totalCr += e.amount;
        return acc;
      }, { count: 0, totalDr: 0, totalCr: 0 });
      console.log('ℹ️ Summary computed:', sum);
      setSummary(sum);
    })
    .catch(err => {
      console.error('❌ Error loading entries:', err);
      toast.error('Failed to load entries');
    });
  }, [ledgerId, companyId, token]);

  // 2) Filter by searchTerm & date range
  useEffect(() => {
  console.log('🔍 Filtering entries based on search and date range', { searchTerm, dateFrom, dateTo });

  const low = searchTerm.toLowerCase();

  const filteredEntries = entries.filter(e => {
    const dateOK =
      (!dateFrom || new Date(e.date) >= new Date(dateFrom)) &&
      (!dateTo || new Date(e.date) <= new Date(dateTo));
    const textOK =
      e.voucher_number.toString().toLowerCase().includes(low) ||
      e.party_name.toLowerCase().includes(low) ||
      e.particulars.toLowerCase().includes(low);
    return dateOK && textOK;
  });

  setFiltered(filteredEntries);
  console.log('✅ Filtered entries:', filteredEntries);

  // Compute totals from filtered entries
  const computed = filteredEntries.reduce((acc, e) => {
    acc.count += 1;
    if (e.type === 'Dr') acc.totalDr += e.amount;
    else acc.totalCr += e.amount;
    return acc;
  }, { count: 0, totalDr: 0, totalCr: 0 });

  computed.balance = computed.totalDr - computed.totalCr;
  console.log('📊 Computed summary:', computed);

  setSummary(computed);
}, [entries, searchTerm, dateFrom, dateTo]);

  

  // 3) Delete handler (stub)
const deleteVoucher = async (companyId, voucher_id, voucher_number) => {
  const token = localStorage.getItem("accessToken");

  console.log("🧾 Attempting to delete voucher:");
  console.log("📦 Voucher Number:", voucher_number);
  console.log("🔑 Voucher ID:", voucher_id);
  console.log("🏢 Company ID:", companyId);

  const confirmDelete = window.confirm(
    `Are you sure you want to delete voucher ${voucher_number}?\n\nNote: If this voucher is linked to other transactions, they may also be removed.`
  );

  if (!confirmDelete) {
    console.log("❌ Deletion cancelled by user.");
    toast.info("Voucher deletion cancelled.");
    return;
  }

  const url = `http://localhost:8000/api/vouchers/${companyId}/voucher/${voucher_id}/delete/`;
  console.log("📡 DELETE Endpoint:", url);

  try {
    const res = await axios.delete(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("✅ Voucher deleted successfully:", res.data);

    // ⬇️ Log entire backend response for debugging
    console.log("🧾 Full response data from backend:", res.data);

    // ⬇️ Use backend data if available, else fallback to passed value
    const deletedVoucherNumber = res.data?.voucher_number || voucher_number;
    const deletedVoucherType = res.data?.voucher_type || "Voucher";

    toast.success(`🗑️ Deleted: ${deletedVoucherType} ${deletedVoucherNumber}`);

    // Refresh entries if function provided
    if (typeof setEntries === "function") {
      console.log("🔄 Refreshing entries after deletion...");
      setEntries(prev => prev.filter(ent => ent.voucher_id !== voucher_id));
    }

    // Log any linked vouchers also deleted
    if (res.data.linked_vouchers?.length > 0) {
      console.warn("🔗 Linked vouchers also deleted:", res.data.linked_vouchers);
      toast.warn(`Note: ${res.data.linked_vouchers.length} linked vouchers also deleted.`);
    }
  } catch (err) {
    console.error("❌ Error deleting voucher:", err.response?.data || err.message);
    toast.error(err.response?.data?.error || "Failed to delete voucher.");
  }
};



  if (!ledger) return <div>Loading…</div>;

// ─── NEW: openInvoice helper ───────────────────────────────────────────────
   /**
   * Fetches history snapshots and opens either InvoiceTemplate or ReceiptTemplate
   * depending on snapshot.voucher_type.
   */
  async function openVoucher(voucherId) {
  const url = `http://localhost:8000/api/voucher-audit/company/${companyId}/voucher/${voucherId}/history/`;
  console.log('📤 Endpoint:', url);
  console.log('🔄 Fetching history for voucher_id:', voucherId);

  try {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const snapshots = res.data;
    console.log('✅ History snapshots:', snapshots);

    // Find the wrapper whose h.voucher === voucherId
    const snapWrapper = snapshots.find(h => h.voucher === voucherId);
    if (!snapWrapper) {
      console.error('❌ No snapshot at all for voucher', voucherId);
      alert('Could not find any data for this voucher.');
      return;
    }

    const s = snapWrapper.snapshot;
    console.log('🔍 Using snapshot:', JSON.stringify(s, null, 2));

    if (s.voucher_type === 'SALES') {
      console.log('📂 Detected SALES voucher. Building invoiceData...');

      // ─── Build items[] ─────────────────────────────────────────
      const items = Array.isArray(s.items)
        ? s.items.map(i => ({
            name:     i.item_name,
            qty:      i.qty,
            rate:     parseFloat(i.rate),
            discount: parseFloat(i.discount),
            gst:      parseFloat(i.gst),
            unit:     i.unit,
            notes:    i.notes,
          }))
        : [];

      const totalAmount = items
        .reduce((sum, i) => {
          const base = i.qty * i.rate - i.discount;
          return sum + base + (base * i.gst / 100);
        }, 0)
        .toFixed(2);

      // Initialize payload
      const payload = {
        customer:      s.reference?.replace(/^Invoice to\s*/i, '') || s.party_name || 'Unknown',
        invoiceDate:   s.date,
        invoiceNumber: s.voucher_number,
        items:         items,
        totalAmount:   totalAmount,
        amountPaid:    0,
        paymentDate:   null,
        paymentNumber: null,
        paymentMode:   null,
        receiptTotal:  0,
      };

      // ─── Merge any matching RECEIPT snapshot ───────────────────
      const receiptSnapWrapper = snapshots.find(h =>
        h.snapshot.voucher_type === 'RECEIPT' &&
        (h.snapshot.against_voucher === s.id ||
         h.snapshot.against_voucher === s.voucher_number)
      );

      if (receiptSnapWrapper) {
        const r = receiptSnapWrapper.snapshot;
        console.log('💰 Merging receipt snapshot into invoiceData:', JSON.stringify(r, null, 2));

        const paidEntry = Array.isArray(r.entries)
          ? r.entries.find(e => e.is_debit)
          : null;

        payload.paymentDate   = r.date;
        payload.paymentNumber = r.voucher_number;
        payload.amountPaid    = paidEntry?.amount ? parseFloat(paidEntry.amount) : 0;
        payload.paymentMode   = r.payment_mode || 'Unknown';
        payload.receiptTotal  = r.total_amount != null
                               ? parseFloat(r.total_amount)
                               : 0;

        console.log('➡️ invoiceData.paymentDate:',   payload.paymentDate);
        console.log('➡️ invoiceData.paymentNumber:', payload.paymentNumber);
        console.log('➡️ invoiceData.amountPaid:',    payload.amountPaid);
        console.log('➡️ invoiceData.paymentMode:',   payload.paymentMode);
        console.log('➡️ invoiceData.receiptTotal:',  payload.receiptTotal);
      }

      console.log('📨 Final invoice payload ready:', payload);
      console.log('🔗 [openVoucher] Sending to InvoiceTemplate');

      setInvoiceData(payload);
      setShowInvoiceModal(true);
      console.log('✅ Invoice modal opened for voucher:', voucherId);
    }
    else if (s.voucher_type === 'RECEIPT') {
  console.log('📂 Detected RECEIPT voucher. Building receiptData…');

  // ─── 1) Find the “debit” entry (amount the customer actually paid) ───────────
  const paidEntry = Array.isArray(s.entries)
    ? s.entries.find(e => e.is_debit)
    : null;

  const amountPaid = paidEntry?.amount
    ? parseFloat(paidEntry.amount)
    : 0;

  // ─── 2) Compute a totalAmount (fall back to amountPaid if total_amount is missing) ───
  const totalAmount = typeof s.total_amount === 'number'
    ? parseFloat(s.total_amount)
    : amountPaid;

  // ─── 3) Figure out “Received From”: use s.reference if present,
  //      otherwise fall back to party_name, otherwise “—” ───────────────────────────
  const receivedFrom =
    s.reference && s.reference.trim() !== ''
      ? s.reference.replace(/^Received\s*from\s*/i, '')
      : (s.party_name && s.party_name.trim() !== ''
         ? s.party_name
         : '—');

  // ─── 4) Build the final receipt payload ──────────────────────────────────────────
  const receiptPayload = {
    // exactly mirror the fields you passed to InvoiceTemplate,
    // plus new “totalAmount” and “amountPaid” fields:
    partyName:     receivedFrom,      // “Received From”
    receiptDate:   s.date,            // e.g. "2025-06-02"
    receiptNumber: s.voucher_number,  // e.g. "REC-2025-0103"
    paymentMode:   s.payment_mode || 'N/A',
    amountPaid,                        // e.g. 50
    totalAmount,                       // e.g. 50  (or s.total_amount if provided)
    amountInWords: `INR ${totalAmount.toFixed(2)} Only`,
    reference:     s.reference || '--',
    // If you also want to pass company-level info exactly as Invoice does,
    // you can bundle that in here (assuming you already have companyData in outer scope):
    companyName:    company?.company_name || 'Company Name',
    companyLogo:    company?.logo_url       || '/default_logo.png',
    gstNumber:      company?.gstin          || '--',
    companyAddress: company?.address        || '--',
    companyPhone:   company?.phone_number   || '--',
    bankDetails: {
      bankName:       company?.bank_name       || '--',
      accountNumber:  company?.account_number  || '--',
      ifscCode:       company?.ifsc_code       || '--',
      branch:         company?.branch          || '--',
    },
    qrCodeUrl:     company?.qr_code    || null,
    signatureUrl:  company?.signature  || null,
  };

  console.log('➡️ receiptData.amountPaid:',     receiptPayload.amountPaid);
  console.log('➡️ receiptData.totalAmount:',    receiptPayload.totalAmount);
  console.log('➡️ receiptData.receivedFrom:',   receiptPayload.partyName);
  console.log('➡️ receiptData.paymentMode:',    receiptPayload.paymentMode);
  console.log('➡️ receiptData.reference:',      receiptPayload.reference);
  console.log('📨 Final receipt payload ready:', receiptPayload);
  console.log('🔗 [openVoucher] Sending to ReceiptTemplate');

  setReceiptData(receiptPayload);
  setShowReceiptModal(true);
  console.log('✅ Receipt modal opened for voucher:', voucherId);
}

    else {
      console.error('❌ Unsupported voucher_type:', s.voucher_type);
      alert('Cannot display this voucher type.');
    }
  }
  catch (err) {
    console.error('❌ Error fetching voucher history or opening template:', err);
    toast.error('Failed to load voucher data');
  }
}


 // Download PDF for activeLedger


const downloadPDF = () => {
  const doc = new jsPDF();
  const selectedCompanyLogo = localStorage.getItem('selectedCompanyLogo');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const primaryColor = [75, 169, 184];

  const formatAmount = (amount) => `₹ ${amount.toLocaleString('en-IN')}`;

  const renderHeader = () => {
    const logoWidth = 25;
    const logoHeight = 25;

    if (selectedCompanyLogo) {
      doc.addImage(selectedCompanyLogo, 'PNG', 10, 10, logoWidth, logoHeight);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text(company?.company_name || 'Company Name', pageWidth - 14, 16, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Address: ${company?.address || '-'}`, pageWidth - 14, 22, { align: 'right' });
    doc.text(`GSTIN: ${company?.gst_number || '-'}`, pageWidth - 14, 27, { align: 'right' });

    doc.setTextColor(0);
    doc.text(`Ledger: ${ledger?.name || 'Ledger'} Statement`, pageWidth - 14, 34, { align: 'right' });
    doc.text(`Period: ${ledgerPeriod.from || '—'} to ${ledgerPeriod.to || '—'}`, pageWidth - 14, 39, { align: 'right' });
  };

  const renderSummaryCard = () => {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(10, 45, pageWidth - 20, 22, 6, 6, 'F');

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text("Total Txns", 20, 53);
    doc.text("Total Debit", 90, 53);
    doc.text("Total Credit", 165, 53);
    doc.text("Outstanding", 20, 67);


    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(summary.count.toString(), 20, 60);

    doc.setTextColor(0, 150, 0);
    doc.text(formatAmount(summary.totalDr), 90, 60);

    doc.setTextColor(200, 0, 0);
    doc.text(formatAmount(summary.totalCr), 165, 60);
    doc.setTextColor(0, 0, 200);
    doc.text(formatAmount(summary.totalDr - summary.totalCr), 20, 74);

  };

  const drawWatermarkAndContinue = (callback) => {
    if (!selectedCompanyLogo) return callback();

    const img = new Image();
    img.src = selectedCompanyLogo;
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.globalAlpha = 0.06;
      ctx.drawImage(img, 0, 0);
      const fadedLogo = canvas.toDataURL('image/png');
      doc.addImage(fadedLogo, 'PNG', pageWidth / 2 - 25, pageHeight / 2 - 25, 50, 50);
      callback();
    };

    img.onerror = () => {
      console.warn('⚠️ Failed to load watermark image.');
      callback();
    };
  };

  drawWatermarkAndContinue(() => {
    renderHeader();
    renderSummaryCard();

    autoTable(doc, {
      startY: 80,
      head: [['Date', 'Voucher #', 'Party', 'Type', 'Amount', 'Description']],
      body: filtered.map((entry) => [
        entry.date,
        entry.voucher_number,
        entry.party_name,
        entry.type,
        formatAmount(entry.amount),
        entry.particulars || ''
      ]),
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 5,
        textColor: '#333',
        lineColor: [230, 230, 230],
        lineWidth: 0.2,
        halign: 'left',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [240, 248, 255],
        textColor: 0,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: 6,
        lineColor: [200, 200, 200],
        lineWidth: 0.5,
      },
      alternateRowStyles: {
        fillColor: [252, 252, 252],
      },
      margin: { top: 50, left: 10, right: 10 },
      didDrawPage: (data) => {
        const page = doc.internal.getCurrentPageInfo().pageNumber;
        if (page > 1) renderHeader();

        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${page} of ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, pageHeight - 8);
      }
    });

    doc.save(`${ledger?.name || 'Ledger'}-Statement.pdf`);
  });
};




  return (
    <div className="detail-container">

      {/* Toolbar */}
      <div className="detail-toolbar">
        <h2>📋 {ledger.name} Ledger</h2>
        <div className="toolbar-buttons">

          {/* Summary toggle */}
          <button
            className="btn-summary"
            onClick={() => {
              console.log('📊 Toggle Summary →', !showSummary);
              setShowSummary(s => !s);
            }}
          >
            Summary
          </button>

          {/* Date filters */}
          <input
            type="date"
            value={dateFrom}
            onChange={e => {
              console.log('📅 From:', e.target.value);
              setDateFrom(e.target.value);
            }}
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => {
              console.log('📅 To:', e.target.value);
              setDateTo(e.target.value);
            }}
          />

          {/* Search */}
          <input
            className="search-input"
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => {
              console.log('🔍 Search:', e.target.value);
              setSearchTerm(e.target.value);
            }}
          />

          {/* Add New */}
         <button className="btn-download" onClick={downloadPDF}>
  Download PDF
</button>


        </div>
      </div>

      {/* Summary Panel */}
      {showSummary && (
        <section className="detail-summary">
          <div>
            <strong>Total Txns</strong>
            <div>{summary.count}</div>
          </div>
          <div>
            <strong>Total Debit</strong>
            <div className="balance-incoming">₹{summary.totalDr.toFixed(2)}</div>
          </div>
          <div>
            <strong>Total Credit</strong>
            <div className="balance-outgoing">₹{summary.totalCr.toFixed(2)}</div>
          </div>
        </section>
      )}

      {/* Entries Table */}
      <table className="detail-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Voucher #</th>
            <th>Party</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Outstanding Balance</th>
            <th>Action</th>
          </tr>
        </thead>
      <tbody>
  {(() => {
    let runningBalance = entries.reduce((acc, e) => {
      if (dateFrom && new Date(e.date) < new Date(dateFrom)) {
        return e.type === 'Dr' ? acc + e.amount : acc - e.amount;
      }
      return acc;
    }, 0);

    console.log("📊 Initial Opening Balance:", runningBalance);

    return filtered.map((e, index) => {
      runningBalance += e.type === 'Dr' ? e.amount : -e.amount;
      console.log(`📅 ${e.date} | ${e.type} ₹${e.amount} → 💰 Balance: ₹${runningBalance}`);

      return (
        <tr key={e.id}>
          <td>{new Date(e.date).toLocaleDateString()}</td>
          <td>{e.voucher_number || '—'}</td>
          <td>{e.party_name || '—'}</td>
          <td>{e.type}</td>
          <td className={e.type === 'Dr' ? 'balance-incoming' : 'balance-outgoing'}>
            ₹{e.amount.toLocaleString('en-IN')}
          </td>
          <td>
            ₹{runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </td>
        <td className="action-cell">
  <button
    onClick={() => {
      console.log('🔢 Entry object keys:', Object.keys(e));
      console.log('🔄 Open history for voucher_id:', e.voucher_id);
      openVoucher(e.voucher_id);
    }}
  >
    View
  </button>


            {' | '}
            <Link
              to={`/voucher-edit/${e.voucher_number}`}
              onClick={() => console.log('✏️ Edit voucher', e.voucher_number)}
            >
              Edit
            </Link>
            {' | '}
<button
  onClick={() => deleteVoucher(companyId, e.voucher_id, e.voucher_number)}
  className="delete-btn"
>
  🗑️ Delete
</button>


            {' | '}
            <button
              className="btn-share"
              onClick={() => console.log('📤 Share voucher', e.voucher_number)}
              aria-label="Share voucher"
            >
              <Share2 size={16} />
            </button>
          </td>
        </tr>
      );
    });
  })()}
</tbody>


      </table>
      {/* History Modal */}
{/* History Modal */}
{historyModal && (
  <div
    className="modal-overlay"
    onClick={() => {
      console.log('❌ Closing history modal');
      setHistoryModal(false);
    }}
  >
    <div className="modal history-modal" onClick={e => e.stopPropagation()}>
      <h3>🕒 Voucher History for #{selectedVoucher}</h3>

      {historySnapshots.length === 0 ? (
        <p>No snapshots found.</p>
      ) : (
        historySnapshots.map(s => {
          console.log('🗂️ Snapshot detail:', s);
          const v = s.snapshot;
          return (
            <div key={s.id} className="snapshot-block">
              {/* Metadata */}
              <p><strong>Viewed at:</strong> {new Date(s.viewed_at).toLocaleString()}</p>
              <p><strong>User ID:</strong> {s.user}</p>

              {/* Voucher header */}
              <h4>Voucher #{v.voucher_number}</h4>
              <p><strong>Date:</strong> {v.date}</p>
              <p><strong>Type:</strong> {v.voucher_type}</p>
              <p><strong>Reference:</strong> {v.reference}</p>
              {v.notes && <p><strong>Notes:</strong> {v.notes}</p>}

              {/* Entries table */}
              <table className="snapshot-table">
                <thead>
                  <tr>
                    <th>Ledger ID</th>
                    <th>Dr/Cr</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {v.entries.map((je, i) => (
                    <tr key={i}>
                      <td>{je.ledger}</td>
                      <td>{je.is_debit ? 'Dr' : 'Cr'}</td>
                      <td>₹{parseFloat(je.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>




              {/* If you later add items to the snapshot, render them similarly */}
              {v.items && v.items.length > 0 && (
                <>
                  <h5>Line Items</h5>
                  <table className="snapshot-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Discount</th>
                        <th>GST%</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {v.items.map((it, j) => (
                        <tr key={j}>
                          <td>{it.item_name}</td>
                          <td>{it.qty}</td>
                          <td>₹{it.rate}</td>
                          <td>₹{it.discount}</td>
                          <td>{it.gst}%</td>
                          <td>{it.notes}</td>

                      
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          );
        })
      )}

      <button
        className="btn-close"
        onClick={() => {
          console.log('❌ Closing history modal');
          setHistoryModal(false);
        }}
      >
        Close
      </button>
    </div>
  </div>
)}
        {/* ─── Invoice Modal ──────────────────────────────────────────────────── */}
      {showInvoiceModal && (
        <InvoiceTemplate
          invoiceData={invoiceData}
          onClose={() => setShowInvoiceModal(false)}
          onSave={() => { /* optional: save PDF or email logic */ }}
          onPrint={() => window.print()}
          selectedCompanyId={companyId}
        />
      )}

      {/* ─── Receipt Modal ──────────────────────────────────────────────────── */}
      {showReceiptModal && (
        <ReceiptTemplate
          receiptData={receiptData}
          onClose={() => setShowReceiptModal(false)}
          onSave={() => { /* optional: save PDF or email logic */ }}
          onPrint={() => window.print()}
          selectedCompanyId={companyId}
        />
      )}


{/*download pdf*/}






      <Link to="/ledgers" className="btn-back">
        ← Back to Ledgers
      </Link>
      <ToastContainer />
    </div>
    
  );
}
