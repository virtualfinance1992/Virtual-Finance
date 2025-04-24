// 📘 IncomeVoucherForm.jsx - Compatible with backend logic
import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import IncomePartyForm from '../income_mgmt/IncomePartyForm';
import axios from 'axios';

const IncomeVoucherForm = ({ onClose }) => {
  const companyId = JSON.parse(localStorage.getItem('selectedCompany'))?.id;
  console.log("📌 Final resolved companyId in Income Form:", companyId);

  const [party, setParty] = useState('');
  const [account] = useState('Income');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([{ description: '', amount: 0, notes: '' }]);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const componentRef = useRef();

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
    setItems(updated);
  };

  const addItem = () => setItems([...items, { description: '', amount: 0, notes: '' }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const totalAmount = items.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Income_Voucher_${voucherDate}`,
  });

  const handleSaveIncome = async () => {
    const token = localStorage.getItem('accessToken');
    if (!companyId) {
      alert('❌ Company ID is missing.');
      return;
    }

    const payload = {
      company: companyId,
      date: voucherDate,
      voucher_type: 'INCOME',
      reference: `Income received from ${party}`,
      party: party,
      notes: '',
      items: items.map(i => ({
        description: i.description,
        amount: parseFloat(i.amount),
        notes: i.notes
      })),
      entries: [
        {
          ledger: null, // Income Ledger
          is_debit: false,
          amount: (totalAmount * 0.9).toFixed(2)
        },
        {
          ledger: null, // GST Ledger
          is_debit: false,
          amount: (totalAmount * 0.1).toFixed(2)
        },
        {
          ledger: null, // Customer/Cash (receivable)
          is_debit: true,
          amount: totalAmount.toFixed(2)
        }
      ]
    };

    console.log('📤 Submitting Income Voucher Payload:', payload);

    try {
      const res = await axios.post(
        `https://virtual-finance-backend.onrender.com/api/vouchers/income/${companyId}/create/`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );
      console.log('✅ Income Voucher Saved:', res.data);
      alert(`✅ Income voucher saved. Voucher No: ${res.data.voucher_number}`);
      onClose();
    } catch (err) {
      console.error('❌ Error saving income voucher:', err);
      if (err.response) console.error('❌ Backend Error:', err.response.data);
      alert('❌ Failed to save income voucher.');
    }
  };

  return (
    <div style={{ padding: '40px', background: '#fff', borderRadius: '16px', position: 'relative', maxWidth: '1200px', margin: 'auto', boxShadow: '0 0 24px rgba(0,0,0,0.2)' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, fontSize: 20, background: 'none', border: 'none' }}>✖</button>
      <div ref={componentRef}>
        <h2 style={{ textAlign: 'center' }}>💰 Income Voucher</h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30, gap: 20 }}>
          <div style={{ flex: 1 }}>
            <label>Party Name:</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                value={party}
                onChange={(e) => setParty(e.target.value)}
                placeholder="Enter party name"
                style={{ flex: 1, padding: 10 }}
              />
              <button onClick={() => setShowPartyForm(true)} style={{ padding: '10px 14px', background: '#28a745', color: '#fff' }}>+ Add</button>
            </div>

            <div style={{ marginTop: 20 }}>
              <label>Account:</label>
              <input type="text" value={account} readOnly style={{ width: '100%', padding: 10, background: '#eee' }} />
            </div>
          </div>

          <div>
            <label>Date:</label>
            <input type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} style={{ padding: 10 }} />
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount (₹)</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td><input value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} /></td>
                <td><input type="number" value={item.amount} onChange={(e) => handleItemChange(index, 'amount', e.target.value)} /></td>
                <td><input value={item.notes} onChange={(e) => handleItemChange(index, 'notes', e.target.value)} /></td>
                <td><button onClick={() => removeItem(index)}>✖</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={addItem} style={{ margin: '20px 0' }}>+ Add Item</button>

        <h3>Total: ₹{totalAmount.toFixed(2)}</h3>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button onClick={handleSaveIncome} style={{ marginRight: 10, padding: '12px 20px', background: '#28a745', color: '#fff' }}>Save Income</button>
          <button onClick={handlePrint} style={{ padding: '12px 20px', background: '#007bff', color: '#fff' }}>Print</button>
        </div>
      </div>

      {showPartyForm && (
        <div onClick={() => setShowPartyForm(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div onClick={(e) => e.stopPropagation()}>
            <IncomePartyForm onClose={() => setShowPartyForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomeVoucherForm;
