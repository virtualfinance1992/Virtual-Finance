import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import CustomerForm from '../customer_mgmt/CustomerForm';

const ReceiptVoucherForm = ({ onClose, companyId: passedCompanyId }) => {
  const companyId = passedCompanyId || JSON.parse(localStorage.getItem("selectedCompany"))?.id;

  const [customer, setCustomer] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerList, setCustomerList] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [amount, setAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [isAgainstSale, setIsAgainstSale] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const componentRef = useRef();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`https://virtual-finance-backend.onrender.com/api/customers/${companyId}/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setCustomerList(data.map(c => c.name));
      } catch (err) {
        console.error('❌ Error fetching customers:', err);
      }
    };

    if (companyId) {
      fetchCustomers();
    }
  }, [companyId]);

  const handleSaveReceipt = async () => {
    const token = localStorage.getItem('accessToken');
  
    const payload = {
      company: companyId,
      date: voucherDate,
      voucher_type: 'RECEIPT',
      reference: `Receipt from ${customer}`,
      party: customer,
      payment_mode: paymentMode,
      notes,
      against_sale: isAgainstSale,
      items: [{ description: 'Receipt', amount: amount, notes }],
      entries: [
        { ledger: null, is_debit: false, amount: amount.toFixed(2) },  // ✅ lowercase
        { ledger: null, is_debit: true, amount: amount.toFixed(2) }
      ]
    };
  
    console.log("📦 Submitting Receipt Voucher Payload:", payload);
  
    try {
      const res = await fetch(`https://virtual-finance-backend.onrender.com/api/vouchers/receipt/${companyId}/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
  
      if (!res.ok) throw new Error('Receipt creation failed');
      const data = await res.json();
      console.log("✅ Receipt Voucher Saved:", data);
      alert(`✅ Receipt saved successfully. Voucher No: ${data.voucher_number}`);
      onClose();
    } catch (err) {
      console.error('❌ Error saving receipt:', err);
      alert('❌ Failed to save receipt.');
    }
  };
  

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Receipt_${voucherDate}`,
  })

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px', background: '#fff', borderRadius: '16px', boxShadow: '0 0 16px rgba(0,0,0,0.2)', position: 'relative' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', fontSize: '20px' }}>✖</button>
      <div ref={componentRef}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#003366' }}>💰 Receipt Voucher</h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 2 }}>
            <label>Customer:</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, position: 'relative' }}>
                <input
                  type="text"
                  value={customer}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomer(val);
                    setFilteredCustomers(customerList.filter(c => c.toLowerCase().includes(val.toLowerCase())));
                    setShowDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Enter or select customer"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                />
                {showDropdown && filteredCustomers.length > 0 && (
                  <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #ccc', zIndex: 1000, maxHeight: '140px', overflowY: 'auto', listStyle: 'none', margin: 0, padding: 0 }}>
                    {filteredCustomers.map((name, index) => (
                      <li key={index} onMouseDown={() => setCustomer(name)} style={{ padding: '8px', cursor: 'pointer' }}>{name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button onClick={() => setShowCustomerForm(true)} style={{ background: '#28a745', color: '#fff', padding: '10px 14px', borderRadius: '6px', border: 'none' }}>+ New</button>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <label>Voucher #:</label>
            <input
              type="text"
              value="Auto-generated"
              readOnly
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f5f5f5' }}
            />
            <label style={{ marginTop: '12px', display: 'block' }}>Date:</label>
            <input
              type="date"
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <label>Receipt Mode:</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
            {['UPI', 'Online', 'Cash', 'Cheque'].map((mode) => (
              <button
                key={mode}
                onClick={() => setPaymentMode(mode)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: paymentMode === mode ? '#003366' : '#ccc',
                  color: paymentMode === mode ? '#fff' : '#333',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <label>Amount:</label>
          <input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>

        <div style={{ marginTop: '20px' }}>
          <label>Notes:</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>

        <div style={{ marginTop: '20px' }}>
          <label><input type="checkbox" checked={isAgainstSale} onChange={(e) => setIsAgainstSale(e.target.checked)} style={{ marginRight: '10px' }} /> Receipt Against Sale</label>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button onClick={handleSaveReceipt} style={{ padding: '10px 24px', backgroundColor: '#003366', color: '#fff', border: 'none', borderRadius: '6px', marginRight: '10px' }}>Save Receipt</button>
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

export default ReceiptVoucherForm;
