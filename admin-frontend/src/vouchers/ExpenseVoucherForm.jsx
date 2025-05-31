// src/vouchers/ExpenseVoucherForm.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import ExpensePartyForm from '../expense_mgmt/ExpensePartyForm';
import axios from 'axios';

const ExpenseVoucherForm = ({ onClose }) => {
  const companyId = Number(localStorage.getItem('activeCompanyId'));
  console.log("📦 ExpenseVoucherForm — companyId:", companyId);
  const componentRef = useRef();

  // Payee
  const [payee, setPayee] = useState('');
  const [showPayeeForm, setShowPayeeForm] = useState(false);

  // Expense Type
  const [expenseType, setExpenseType] = useState('INDIRECT');

  // GST
  const [includeGst, setIncludeGst] = useState(false);
  const [gstNumber, setGstNumber] = useState('');
  const [gstDetails, setGstDetails] = useState(null);

  

  // Date
  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Items
  const [items, setItems] = useState([
    { description: '', amount: 0, gst: 0, notes: '' }
  ]);

  // Payment Now
  const [paidNow, setPaidNow] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [showFullPaymentButton, setShowFullPaymentButton] = useState(false);

  // Fetch expense categories
  

  // GST lookup effect
  useEffect(() => {
    if (includeGst && gstNumber.length >= 15) {
      axios
        .get(`/api/vendor/gst-details/${gstNumber}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        })
        .then(res => {
          setGstDetails(res.data);
          if (res.data.name) setPayee(res.data.name);
        })
        .catch(() => setGstDetails(null));
    }
  }, [gstNumber, includeGst]);

  // Item handlers
  const handleItemChange = (idx, field, val) => {
    const arr = [...items];
    if (field === 'amount' || field === 'gst') {
      arr[idx][field] = parseFloat(val) || 0;
    } else {
      arr[idx][field] = val;
    }
    setItems(arr);
  };
  const addItem = () =>
    setItems([...items, { description: '', amount: 0, gst: 0, notes: '' }]);
  const removeItem = idx =>
    setItems(items.filter((_, i) => i !== idx));

  // Totals
  const totalAmount = items.reduce((sum, it) => sum + it.amount, 0);
  const totalGst = includeGst
    ? items.reduce((sum, it) => sum + it.gst * it.amount / 100, 0)
    : 0;
  const grandTotal = totalAmount + totalGst;


  // Print
  const handlePrint = useReactToPrint({ content: () => componentRef.current });

  // Save
  const handleSave = async () => {
  const token = localStorage.getItem('accessToken');
  if (!companyId || !token) {
    alert('Missing company ID or not authenticated');
    return;
  }

  // 1) Create Expense Voucher
  const expensePayload = {
  company: companyId,
  date: voucherDate,
  voucher_type: 'EXPENSE',
  reference: `Expense to ${payee}`,
  notes: '',
  expense_type: expenseType,
  // only include if GST section is active
  ...(includeGst && {
    gst_number: gstNumber,
    gst_amount: parseFloat(totalGst.toFixed(2)),
  }),
  items: items.map(it => ({
    description: it.description,
    amount: it.amount,
    gst: includeGst ? parseFloat(it.gst) : 0,  // pass the GST % per line
    notes: it.notes,
  })),
};

console.log('🔃 Sending Expense Payload:', expensePayload);

  try {
    console.log('📦 Creating Expense voucher payload:', expensePayload);
    const expRes = await axios.post(
      `http://localhost:8000/api/vouchers/expense/${companyId}/create/`,
      expensePayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Expense saved:', expRes.data);
    alert(`✅ Expense saved. Voucher No: ${expRes.data.voucher_number}`);

    // 2) Optionally create Payment Voucher
    if (paidNow && paymentMode && paymentAmount > 0) {
      console.log(
        `💰 Creating Payment for ₹${paymentAmount} via ${paymentMode}...`
      );

      // a) Ensure payment ledgers
      const ledgersRes = await axios.post(
            `http://localhost:8000/api/vouchers/ensure-payment-ledgers/${companyId}/`,
        { name: payee },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const { purchase_ledger_id, supplier_ledger_id } = ledgersRes.data;
      console.log('🧾 Payment ledgers:', ledgersRes.data);

      // b) Build Payment payload
      const paymentPayload = {
        company: companyId,
        date: voucherDate,
        voucher_type: 'PAYMENT',
        reference: `Payment to ${payee}`,
        payment_mode: paymentMode,
        entries: [
          { ledger: supplier_ledger_id, is_debit: true, amount: paymentAmount },
          {
            ledger:
              paymentMode === 'cash' ? purchase_ledger_id : supplier_ledger_id,
            is_debit: false,
            amount: paymentAmount,
          },
        ],
      };
      console.log('📑 Payment payload:', paymentPayload);

      // c) POST Payment voucher
      const payRes = await axios.post(
       `http://localhost:8000/api/vouchers/payment/${companyId}/create/`,
        paymentPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('✅ Payment saved:', payRes.data);
      alert(`✅ Payment saved. Voucher No: ${payRes.data.voucher_number}`);
    }

    // 3) Close form
    onClose();
  } catch (err) {
    console.error('❌ Save error:', err.response?.data || err);
    alert('❌ Failed to save expense/payment. See console for details.');
  }
};



  return (
    <div style={{ maxWidth: 900, margin: '20px auto', padding: 20, background: '#fff', borderRadius: 12, position: 'relative' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'transparent', fontSize: 20 }}>✖</button>

      <div ref={componentRef}>
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>🧾 Expense Voucher</h2>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label>Payee:</label>
            <input
              type="text"
              value={payee}
              onChange={e => setPayee(e.target.value)}
              placeholder="Enter payee"
              style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 12 }}
            />
          </div>
          <div>
            <label>Expense Type:</label>
            <select
              value={expenseType}
              onChange={e => setExpenseType(e.target.value)}
              style={{ padding: 8, marginTop: 4, marginBottom: 12 }}
            >
              <option value="INDIRECT">Indirect Expense</option>
              <option value="DIRECT">Direct Expense</option>
            </select>
          </div>
          
          <div>
            <label>Date:</label>
            <input
              type="date"
              value={voucherDate}
              onChange={e => setVoucherDate(e.target.value)}
              style={{ padding: 8, marginTop: 4, marginBottom: 12 }}
            />
          </div>
        </div>

        {/* GST toggle & input */}
        <div style={{ marginBottom: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={includeGst}
              onChange={e => setIncludeGst(e.target.checked)}
            /> Include GST (%)
          </label>
          {includeGst && (
            <input
              type="text"
              placeholder="GST Number"
              value={gstNumber}
              onChange={e => setGstNumber(e.target.value)}
              style={{ marginLeft: 8, padding: 8 }}
            />
          )}
          {gstDetails && (
            <span style={{ marginLeft: 12, fontStyle: 'italic' }}>
              Vendor: {gstDetails.name}
            </span>
          )}
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
              <th style={{ width: '100%', padding: '12px' }}>Service / Product</th>
              <th style={{ width: '20%', padding: '12px', textAlign: 'right' }}>Amount (₹)</th>
              <th style={{ width: '20%', padding: '12px', textAlign: 'right' }}>GST (%)</th>
              <th style={{ width: '20%', padding: '12px', textAlign: 'right' }}>Total (₹)</th>
              <th style={{ width: '10%' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const amt = parseFloat(it.amount) || 0;
              const rate = parseFloat(it.gst) || 0;
              const gstAmt = parseFloat((amt * rate / 100).toFixed(2));
              const total = parseFloat((amt + gstAmt).toFixed(2));
              return (
                <tr key={idx}>
                  <td style={{ padding: '8px' }}>
                    <textarea
                      rows={2}
                      value={it.description}
                      onChange={e => handleItemChange(idx, 'description', e.target.value)}
                      style={{ width: '100%', padding: 8, resize: 'vertical' }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    <input
                      type="number"
                      value={it.amount}
                      onChange={e => handleItemChange(idx, 'amount', e.target.value)}
                      style={{ width: 80, padding: 8, textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    <input
                      type="number"
                      value={it.gst}
                      onChange={e => handleItemChange(idx, 'gst', e.target.value)}
                      style={{ width: 80, padding: 8, textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {total.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => removeItem(idx)}
                      style={{ background: 'transparent', border: 'none', color: 'red', cursor: 'pointer' }}
                    >
                      ✖
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.some(it => it.notes) && (
              <tr>
                <td colSpan={5} style={{ padding: '12px', background: '#f9f9f9' }}>
                  <strong>Notes:</strong> {items.map(it => it.notes).filter(n => n).join('; ')}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <button
          onClick={addItem}
          style={{
            width: '100%',
            background: '#003366',
            color: '#fff',
            padding: '12px',
            border: 'none',
            borderRadius: '6px',
            marginBottom: '20px',
            cursor: 'pointer',
          }}
        >
          + Add Item
        </button>

        {/* Totals & Save/Print */}
        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
          <div><strong>Net: ₹{totalAmount.toFixed(2)}</strong></div>
          <div><strong>GST: ₹{totalGst.toFixed(2)}</strong></div>
          <div><strong>Grand Total: ₹{grandTotal.toFixed(2)}</strong></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
          <button
            onClick={handleSave}
            style={{ background: '#28a745', color: '#fff', padding: '12px 28px', border: 'none', borderRadius: 8 }}
          >
            Save Expense
          </button>
          <button
            onClick={handlePrint}
            style={{ background: '#007bff', color: '#fff', padding: '12px 28px', border: 'none', borderRadius: 8 }}
          >
            Print / PDF
          </button>
        </div>

        {/* Paid Now Section */}
        <div style={{ borderTop: '1px solid #ddd', paddingTop: 20 }}>
          {!paidNow ? (
            <button
              onClick={() => { setPaidNow(true); setShowFullPaymentButton(true); }}
              style={{ width: '100%', background: '#28a745', color: '#fff', padding: '12px', border: 'none', borderRadius: 8 }}
            >
              Mark as Paid
            </button>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <button
                  onClick={() => setPaymentMode('cash')}
                  style={{
                    background: paymentMode === 'cash' ? '#4caf50' : '#ccc',
                    color: '#fff',
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: 4,
                  }}
                >
                  💵 Cash
                </button>
                <button
                  onClick={() => setPaymentMode('bank')}
                  style={{
                    background: paymentMode === 'bank' ? '#2196f3' : '#ccc',
                    color: '#fff',
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: 4,
                  }}
                >
                  🏦 Bank
                </button>
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong>Amount Paid:</strong>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  style={{ marginLeft: 10, padding: 4, width: 120 }}
                />
                {showFullPaymentButton && (
                  <button onClick={() => setPaymentAmount(grandTotal)} style={{ marginLeft: 10 }}>
                    Full Payment
                  </button>
                )}
              </div>
              <div>
                Mode: <strong>{paymentMode || 'Not selected'}</strong> | Amount Paid: ₹{paymentAmount.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PayeeForm Modal */}
      {showPayeeForm && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}
          onClick={() => setShowPayeeForm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', padding: 20, borderRadius: 6, width: '80%', maxWidth: 800 }}
          >
            <ExpensePartyForm onClose={() => setShowPayeeForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseVoucherForm;
