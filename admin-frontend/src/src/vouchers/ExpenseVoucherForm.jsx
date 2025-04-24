// ✅ ExpenseVoucherForm.jsx - Connected to backend & removed frontend voucher number fetch
import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import ExpensePartyForm from '../expense_mgmt/ExpensePartyForm';
import axios from 'axios';

const ExpenseVoucherForm = ({ onClose, companyId: passedCompanyId }) => {
  const companyId = JSON.parse(localStorage.getItem('selectedCompany'))?.id;

  console.log("📌 Final resolved companyId in Expense Form:", companyId);


  const [party, setParty] = useState('');
  const [account] = useState('Expenses');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyList, setPartyList] = useState([]);
  const [filteredParties, setFilteredParties] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [items, setItems] = useState([{ description: '', amount: 0, notes: '' }]);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const componentRef = useRef();
  
  console.log("📌 companyId in Expense Form (received via props):", companyId);



  useEffect(() => {
    const fetchPartyList = async () => {
      try {
      //  const token = localStorage.getItem('accessToken');
      //  const res = await axios.get(`https://virtual-finance-backend.onrender.com/api/expenses/parties/${companyId}/`, {
       //   headers: { Authorization: `Bearer ${token}` }
     //   });
       // setPartyList(res.data.map(p => p.name));
       console.log("⏸️ Party fetch is temporarily disabled.");
      } catch (err) {
        console.error('❌ Error fetching party list:', err);
        console.log("📦 ExpenseVoucherForm received companyId:", companyId);
      }
    };

    if (companyId) {
      fetchPartyList();
    }
  }, [companyId]);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
    setItems(updated);
  };

  const addItem = () => setItems([...items, { description: '', amount: 0, notes: '' }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Expense_Voucher_${voucherDate}`,
  });

  const handleSaveExpense = async () => {
    const token = localStorage.getItem('accessToken');
  
    if (!companyId) {
      alert('❌ Company ID is missing.');
      console.error('❌ Missing companyId in Expense Form.');
      return;
    }
  
    // Step 1: Calculate total
    const totalAmount = items.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
  
    // Step 2: Construct payload (only items)
    const payload = {
      company: companyId,
      date: voucherDate,
      voucher_type: 'EXPENSE',
      reference: `Expense paid to ${party}`,
      party: party,  // Optional: if you want to use in backend
      notes: '',
      items: items.map(i => ({
        description: i.description,
        amount: parseFloat(i.amount),
        notes: i.notes
      }))
      // ✅ No `entries` here – backend will assign ledgers & entries dynamically
    };
  
    console.log('📦 Submitting Expense Voucher Payload:', payload);
  
    try {
      const res = await axios.post(
        `https://virtual-finance-backend.onrender.com/api/vouchers/expense/${companyId}/create/`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      console.log('✅ Expense Voucher Saved:', res.data);
      alert(`✅ Expense voucher saved. Voucher No: ${res.data.voucher_number}`);
      onClose();
    } catch (err) {
      console.error('❌ Error saving expense voucher:', err);
      if (err.response) {
        console.error('❌ Backend Error:', err.response.data);
      }
      alert('❌ Failed to save expense.');
    }
  };
  
  

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px', background: '#fff', borderRadius: '16px', boxShadow: '0 0 24px rgba(0,0,0,0.2)', fontFamily: 'Arial, sans-serif', position: 'relative' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>

      <div ref={componentRef}>
        <h2 style={{ textAlign: 'center', color: '#003366', marginBottom: '24px' }}>🧾 Expense Voucher</h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 'bold' }}>Expense Party:</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  value={party}
                  onChange={(e) => {
                    const val = e.target.value;
                    setParty(val);
                    setFilteredParties(partyList.filter(p => p.toLowerCase().includes(val.toLowerCase())));
                    setShowDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Enter or select expense party"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                />
                {showDropdown && filteredParties.length > 0 && (
                  <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #ccc', borderTop: 'none', zIndex: 1000, maxHeight: '160px', overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none' }}>
                    {filteredParties.map((name, index) => (
                      <li key={index} onMouseDown={() => setParty(name)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}>{name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button onClick={() => setShowPartyForm(true)} style={{ padding: '10px 14px', borderRadius: '6px', background: '#28a745', color: '#fff', border: 'none' }}>+ New Party</button>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ fontWeight: 'bold' }}>Account:</label>
              <input type="text" value={account} readOnly style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#f5f5f5', border: '1px solid #ccc', marginTop: '6px' }} />
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <label style={{ fontWeight: 'bold' }}>Date:</label>
            <input type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', marginLeft: '10px' }} />
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Expense Description</th>
              <th style={{ padding: '12px' }}>Amount (₹)</th>
              <th style={{ padding: '12px' }}>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td><input type="text" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} style={{ width: '100%', padding: '8px' }} /></td>
                <td><input type="number" value={item.amount} onChange={(e) => handleItemChange(index, 'amount', e.target.value)} style={{ width: '120px', padding: '8px' }} /></td>
                <td><textarea value={item.notes} onChange={(e) => handleItemChange(index, 'notes', e.target.value)} rows={2} style={{ width: '100%', padding: '8px' }} /></td>
                <td><button onClick={() => removeItem(index)} style={{ color: 'red', fontWeight: 'bold', border: 'none', background: 'transparent' }}>✖</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={addItem} style={{ marginBottom: '20px', backgroundColor: '#003366', color: '#fff', padding: '10px 18px', border: 'none', borderRadius: '6px' }}>+ Add Item</button>

        <div style={{ textAlign: 'right', marginTop: '30px' }}>
          <h3 style={{ color: '#003366' }}>Total Amount: ₹{totalAmount.toFixed(2)}</h3>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button onClick={handleSaveExpense} style={{ padding: '12px 28px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', marginRight: '12px' }}>Save Expense</button>
          <button onClick={handlePrint} style={{ padding: '12px 28px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px' }}>Print / Save PDF</button>
        </div>
      </div>

      {showPartyForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowPartyForm(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ExpensePartyForm onClose={() => setShowPartyForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseVoucherForm;