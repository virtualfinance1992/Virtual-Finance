// 📘 JournalEntryForm.jsx - Manual Journal Entries
import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

const JournalEntryForm = ({ onClose, companyId }) => {
  const resolvedCompanyId = companyId || JSON.parse(localStorage.getItem("selectedCompany"))?.id;
  console.log("📌 Resolved companyId for Journal:", resolvedCompanyId);

  const [entries, setEntries] = useState([
    { ledger_name: '', is_debit: true, amount: '' },
    { ledger_name: '', is_debit: false, amount: '' }
  ]);
  const [voucherNumber, setVoucherNumber] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const componentRef = useRef();

  useEffect(() => {
    const fetchVoucherNumber = async () => {
      try {
        const res = await fetch(`https://virtual-finance-backend.onrender.com/api/vouchers/journal/next-number/?company_id=${resolvedCompanyId}`);
        const data = await res.json();
        setVoucherNumber(data.voucher_number);
        console.log("🧾 Journal Voucher Number:", data.voucher_number);
      } catch (err) {
        console.error("❌ Failed to fetch journal voucher number:", err);
      }
    };

    if (resolvedCompanyId) {
      fetchVoucherNumber();
    }
  }, [resolvedCompanyId]);

  const handleEntryChange = (index, field, value) => {
    const updated = [...entries];
    updated[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
    setEntries(updated);
  };

  const addEntry = () => {
    setEntries([...entries, { ledger_name: '', is_debit: false, amount: '' }]);
  };

  const removeEntry = (index) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    const totalDebit = entries.filter(e => e.is_debit).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalCredit = entries.filter(e => !e.is_debit).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    if (totalDebit !== totalCredit) {
      alert('❌ Debit and Credit totals must be equal.');
      return;
    }

    const payload = {
      company: resolvedCompanyId,
      voucher_type: 'JOURNAL',
      voucher_number: voucherNumber,
      reference: 'Manual journal entry',
      entries: entries.map(e => ({
        ledger: null,
        ledger_name: e.ledger_name,
        is_debit: e.is_debit,
        amount: parseFloat(e.amount)
      })),
      notes: ''
    };

    console.log("📦 Submitting Journal Entry Payload:", payload);

    try {
      const res = await fetch(`https://virtual-finance-backend.onrender.com/api/vouchers/journal/${resolvedCompanyId}/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save journal entry');

      const data = await res.json();
      console.log("✅ Journal Entry Saved:", data);
      alert(`✅ Journal saved. Voucher No: ${data.voucher_number}`);
      onClose();
    } catch (err) {
      console.error("❌ Error saving journal:", err);
      alert("❌ Failed to save journal entry");
    }
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `JournalEntry_${voucherNumber}`,
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px', background: '#fff', borderRadius: '16px', boxShadow: '0 0 16px rgba(0,0,0,0.2)', fontFamily: 'Arial' }}>
      <div ref={componentRef}>
        <h2 style={{ textAlign: 'center', color: '#003366' }}>📘 Journal Entry</h2>
        <p style={{ textAlign: 'right' }}><strong>Voucher No:</strong> {voucherNumber}</p>
        <p style={{ textAlign: 'right' }}>
          <label><strong>Date:</strong> </label>
          <input type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} style={{ padding: '6px', marginLeft: '10px' }} />
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '24px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ padding: '10px' }}>Ledger Name</th>
              <th style={{ padding: '10px' }}>Dr / Cr</th>
              <th style={{ padding: '10px' }}>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={index}>
                <td><input type="text" value={entry.ledger_name} onChange={(e) => handleEntryChange(index, 'ledger_name', e.target.value)} style={{ width: '100%', padding: '8px' }} /></td>
                <td>
                  <select value={entry.is_debit ? 'Dr' : 'Cr'} onChange={(e) => handleEntryChange(index, 'is_debit', e.target.value === 'Dr')}>
                    <option value="Dr">Dr</option>
                    <option value="Cr">Cr</option>
                  </select>
                </td>
                <td><input type="number" value={entry.amount} onChange={(e) => handleEntryChange(index, 'amount', e.target.value)} style={{ width: '100%', padding: '8px' }} /></td>
                <td>{index > 1 && <button onClick={() => removeEntry(index)} style={{ color: 'red', fontWeight: 'bold', border: 'none', background: 'transparent' }}>✖</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={addEntry} style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#003366', color: '#fff', border: 'none', borderRadius: '6px' }}>+ Add Entry</button>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button onClick={handleSave} style={{ padding: '10px 24px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', marginRight: '10px' }}>Save Journal</button>
          <button onClick={handlePrint} style={{ padding: '10px 24px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '6px' }}>Print</button>
        </div>
      </div>
    </div>
  );
};

export default JournalEntryForm;
