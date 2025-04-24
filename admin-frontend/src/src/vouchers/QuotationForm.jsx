// 📘 QuotationForm.jsx - Create and manage customer quotations
import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import CustomerForm from '../customer_mgmt/CustomerForm';

const QuotationForm = ({ onClose, companyId }) => {
  const [customer, setCustomer] = useState('');
  const [quotationNumber, setQuotationNumber] = useState('');
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerList, setCustomerList] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [items, setItems] = useState([{ name: '', quantity: 1, rate: 0, notes: '' }]);
  const [notes, setNotes] = useState('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const componentRef = useRef();

  useEffect(() => {
    const fetchQuotationNumber = async () => {
      const res = await fetch(`https://virtual-finance-backend.onrender.com/api/quotations/next-number/?company_id=${companyId}`);
      const data = await res.json();
      setQuotationNumber(data.next_quotation_number);
    };

    const fetchCustomers = async () => {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`https://virtual-finance-backend.onrender.com/api/customers/${companyId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCustomerList(data.map(c => c.name));
    };

    fetchQuotationNumber();
    fetchCustomers();
  }, [companyId]);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === 'quantity' || field === 'rate' ? parseFloat(value) || 0 : value;
    setItems(updated);
  };

  const addItem = () => setItems([...items, { name: '', quantity: 1, rate: 0, notes: '' }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Quotation_${quotationNumber}`,
  });

  const handleSave = async () => {
    const payload = {
      company: companyId,
      customer,
      quotation_number: quotationNumber,
      date: quotationDate,
      items,
      notes,
      total: totalAmount,
    };

    const res = await fetch('/api/quotations/create/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return alert('❌ Failed to save quotation');
    alert('✅ Quotation saved.');
    onClose();
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px', background: '#fff', borderRadius: '16px', boxShadow: '0 0 16px rgba(0,0,0,0.2)', position: 'relative' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, fontSize: '20px', border: 'none', background: 'transparent' }}>✖</button>
      <div ref={componentRef}>
        <h2 style={{ textAlign: 'center', color: '#003366', marginBottom: '24px' }}>📄 Quotation</h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
          <div style={{ flex: 2 }}>
            <label>Customer:</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={customer}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomer(val);
                    setFilteredCustomers(customerList.filter(c => c.toLowerCase().includes(val.toLowerCase())));
                  }}
                  placeholder="Enter or select customer"
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>
              <button onClick={() => setShowCustomerForm(true)} style={{ padding: '10px 14px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px' }}>+ New</button>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <label>Quotation #:</label>
            <input type="text" value={quotationNumber} readOnly style={{ width: '100%', padding: '10px', background: '#f0f0f0' }} />
            <label style={{ marginTop: '10px' }}>Date:</label>
            <input type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} style={{ width: '100%', padding: '10px' }} />
          </div>
        </div>

        <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ padding: '10px' }}>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td><input value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} style={{ width: '100%' }} /></td>
                <td><input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} style={{ width: '80px' }} /></td>
                <td><input type="number" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} style={{ width: '100px' }} /></td>
                <td><input value={item.notes} onChange={(e) => handleItemChange(index, 'notes', e.target.value)} style={{ width: '100%' }} /></td>
                <td><button onClick={() => removeItem(index)} style={{ color: 'red', border: 'none', background: 'transparent' }}>✖</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={addItem} style={{ marginTop: '10px', backgroundColor: '#003366', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '6px' }}>+ Add Item</button>

        <div style={{ textAlign: 'right', marginTop: '20px' }}>
          <strong>Total: ₹{totalAmount.toFixed(2)}</strong>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button onClick={handleSave} style={{ padding: '10px 24px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', marginRight: '12px' }}>Save Quotation</button>
          <button onClick={handlePrint} style={{ padding: '10px 24px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '6px' }}>Print</button>
        </div>
      </div>

      {showCustomerForm && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 9999
          }}
          onClick={() => {
            console.log("🛑 Modal backdrop clicked, closing form.");
            setShowCustomerForm(false);
          }}
        >
          <div
            style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '600px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <CustomerForm onClose={() => {
              console.log("✅ Customer form closed");
              setShowCustomerForm(false);
            }} />
          </div>
        </div>
      )}
      
    </div>
  );
};

export default QuotationForm;
