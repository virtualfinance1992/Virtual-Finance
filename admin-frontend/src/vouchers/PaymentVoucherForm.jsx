// 📘 PaymentVoucherForm.jsx - Updated with voucher number and enlarged popup
import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import SupplierForm from '../supplier_mgmt/SupplierForm';

const PaymentVoucherForm = ({ onClose, companyId }) => {
  const [supplier, setSupplier] = useState('');
  const [account] = useState('Payment');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierList, setSupplierList] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [amount, setAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [isAgainstPurchase, setIsAgainstPurchase] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const componentRef = useRef();

  useEffect(() => {
    const fetchVoucherNumber = async () => {
      const res = await fetch(`http://localhost:8000/api/vouchers/payment/next-number/?company_id=${companyId}`);
      const data = await res.json();
      setVoucherNumber(data.next_payment_number);
    };

    const fetchSuppliers = async () => {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:8000/api/suppliers/${companyId}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSupplierList(data.map(s => s.name));
    };

    fetchVoucherNumber();
    fetchSuppliers();
  }, [companyId]);

  const handleSavePayment = async () => {
    const payload = {
      company: companyId,
      voucher_number: voucherNumber,
      date: voucherDate,
      party: { name: supplier, is_supplier: true },
      amount,
      payment_mode: paymentMode,
      notes,
      type: 'PAYMENT',
      against_purchase: isAgainstPurchase
    };

    const res = await fetch('/api/vouchers/payment/create/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) return alert('❌ Failed to save payment.');
    alert('✅ Payment recorded successfully');
    onClose();
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Payment_${voucherNumber}`,
  });

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px', background: '#fff', borderRadius: '16px', boxShadow: '0 0 16px rgba(0,0,0,0.2)', position: 'relative' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', fontSize: '20px' }}>✖</button>
      <div ref={componentRef}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#003366' }}>💸 Payment Voucher</h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 2 }}>
            <label>Supplier:</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, position: 'relative' }}>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSupplier(val);
                    setFilteredSuppliers(supplierList.filter(s => s.toLowerCase().includes(val.toLowerCase())));
                    setShowDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Enter or select supplier"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                />
                {showDropdown && filteredSuppliers.length > 0 && (
                  <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #ccc', zIndex: 1000, maxHeight: '140px', overflowY: 'auto', listStyle: 'none', margin: 0, padding: 0 }}>
                    {filteredSuppliers.map((name, index) => (
                      <li key={index} onMouseDown={() => setSupplier(name)} style={{ padding: '8px', cursor: 'pointer' }}>{name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button onClick={() => setShowSupplierForm(true)} style={{ background: '#28a745', color: '#fff', padding: '10px 14px', borderRadius: '6px', border: 'none' }}>+ New</button>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <label>Voucher #:</label>
            <input
              type="text"
              value={voucherNumber}
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
          <label>Payment Mode:</label>
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
          <label><input type="checkbox" checked={isAgainstPurchase} onChange={(e) => setIsAgainstPurchase(e.target.checked)} style={{ marginRight: '10px' }} /> Payment Against Purchase</label>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button onClick={handleSavePayment} style={{ padding: '10px 24px', backgroundColor: '#003366', color: '#fff', border: 'none', borderRadius: '6px', marginRight: '10px' }}>Save Payment</button>
          <button onClick={handlePrint} style={{ padding: '10px 24px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '6px' }}>Print</button>
        </div>
      </div>

      {showSupplierForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowSupplierForm(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <SupplierForm onClose={() => setShowSupplierForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentVoucherForm;