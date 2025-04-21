// 📘 JournalEntryForm.jsx - For manual journal entries
import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

const JournalEntryForm = ({ onClose, companyId: companyIdProp }) => {
    const companyId = companyIdProp || JSON.parse(localStorage.getItem("selectedCompany"))?.id;
  
  const [entries, setEntries] = useState([
    { ledger_name: '', is_debit: true, amount: '' },
    { ledger_name: '', is_debit: false, amount: '' },
  ]);
  const componentRef = useRef();

  const handleEntryChange = (index, field, value) => {
    const updated = [...entries];
    updated[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
    setEntries(updated);
  };

  const addEntry = () => {
    setEntries([...entries, { ledger_name: '', is_debit: true, amount: '' }]);
  };

  const removeEntry = (index) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const totalDebit = entries.filter(e => e.is_debit).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalCredit = entries.filter(e => !e.is_debit).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const isBalanced = totalDebit === totalCredit;

  const handleSave = async () => {
    if (!isBalanced) {
      alert("❌ Journal entry is not balanced!");
      return;
    }

    const payload = {
      company: companyId,
      voucher_type: 'JOURNAL',
      reference: 'Manual journal entry',
      entries: entries.map(e => ({
        ledger: null,
        ledger_name: e.ledger_name,
        is_debit: e.is_debit,
        amount: parseFloat(e.amount)
      })),
      notes: ''
    };

    console.log("📦 Submitting journal entry payload:", payload);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:8000/api/vouchers/journal/${companyId}/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save journal");
      alert("✅ Journal entry saved successfully");
      onClose();
    } catch (err) {
      console.error("❌ Error saving journal entry:", err);
      alert("❌ Failed to save journal entry");
    }
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: 'JournalEntry'
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px', background: '#fff', borderRadius: '16px' }}>
      <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', fontSize: '20px' }}>✖</button>
      <div ref={componentRef}>
        <h2 style={{ textAlign: 'center', color: '#003366' }}>📘 Journal Entry</h2>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '30px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ padding: '12px' }}>Ledger</th>
              <th style={{ padding: '12px' }}>Debit / Credit</th>
              <th style={{ padding: '12px' }}>Amount (₹)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={index}>
                <td>
                  <input
                    type="text"
                    value={entry.ledger_name}
                    onChange={(e) => handleEntryChange(index, 'ledger_name', e.target.value)}
                    style={{ width: '100%', padding: '10px' }}
                  />
                </td>
                <td>
                  <select
                    value={entry.is_debit ? 'Dr' : 'Cr'}
                    onChange={(e) => handleEntryChange(index, 'is_debit', e.target.value === 'Dr')}
                    style={{ padding: '10px' }}
                  >
                    <option value="Dr">Dr</option>
                    <option value="Cr">Cr</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    value={entry.amount}
                    onChange={(e) => handleEntryChange(index, 'amount', e.target.value)}
                    style={{ width: '100%', padding: '10px' }}
                  />
                </td>
                <td>
                  <button onClick={() => removeEntry(index)} style={{ color: 'red', fontWeight: 'bold', background: 'none', border: 'none' }}>✖</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={addEntry} style={{ marginTop: '20px', padding: '10px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px' }}>+ Add Entry</button>

        <div style={{ marginTop: '30px', textAlign: 'right' }}>
          <p>Total Debit: ₹{totalDebit.toFixed(2)} | Total Credit: ₹{totalCredit.toFixed(2)}</p>
          {!isBalanced && <p style={{ color: 'red' }}>⚠️ Debit and Credit are not balanced!</p>}
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button onClick={handleSave} style={{ padding: '12px 28px', backgroundColor: '#003366', color: '#fff', border: 'none', borderRadius: '6px', marginRight: '10px' }}>Save Entry</button>
          <button onClick={handlePrint} style={{ padding: '12px 28px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '6px' }}>Print</button>
        </div>
      </div>
    </div>
  );
};

export default JournalEntryForm;
