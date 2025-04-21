// 📘 PurchaseOrderForm.jsx - Purchase Order Form similar to Purchase Voucher
import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import SupplierForm from '../supplier_mgmt/SupplierForm';

const PurchaseOrderForm = ({ onClose, companyId }) => {
  const [supplier, setSupplier] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierList, setSupplierList] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [items, setItems] = useState([{ description: '', unit: '', qty: 1, rate: 0, discount: 0, gst: 18, notes: '' }]);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const componentRef = useRef();

  useEffect(() => {
    const fetchOrderNumber = async () => {
      const res = await fetch(`http://localhost:8000/api/purchase-orders/next-number/?company_id=${companyId}`);
      const data = await res.json();
      setOrderNumber(data.next_order_number);
    };

    const fetchSuppliers = async () => {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:8000/api/suppliers/${companyId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSupplierList(data.map(s => s.name));
    };

    fetchOrderNumber();
    fetchSuppliers();
  }, [companyId]);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = field === 'qty' || field === 'rate' || field === 'discount' || field === 'gst'
      ? parseFloat(value) || 0
      : value;
    setItems(updated);
  };

  const addItem = () => setItems([...items, { description: '', unit: '', qty: 1, rate: 0, discount: 0, gst: 18, notes: '' }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const totalAmount = items.reduce((sum, item) => {
    const amount = (item.qty * item.rate) - item.discount;
    return sum + (amount + (amount * item.gst / 100));
  }, 0);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `PurchaseOrder_${orderNumber}`,
  });

  const handleSave = async () => {
    const payload = {
      company: companyId,
      supplier,
      order_number: orderNumber,
      date: orderDate,
      items,
      total: totalAmount,
    };

    const res = await fetch('/api/purchase-orders/create/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return alert('❌ Failed to save order');
    alert('✅ Purchase order saved.');
    onClose();
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px', background: '#fff', borderRadius: '16px', boxShadow: '0 0 24px rgba(0,0,0,0.2)', position: 'relative' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>
      <div ref={componentRef}>
        <h2 style={{ textAlign: 'center', color: '#003366', marginBottom: '24px' }}>📦 Purchase Order</h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <label>Supplier:</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
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
                  <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #ccc', borderTop: 'none', zIndex: 1000, maxHeight: '160px', overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none' }}>
                    {filteredSuppliers.map((name, index) => (
                      <li key={index} onMouseDown={() => setSupplier(name)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}>{name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button onClick={() => setShowSupplierForm(true)} style={{ padding: '10px 14px', borderRadius: '6px', background: '#28a745', color: '#fff', border: 'none' }}>+ New</button>
            </div>
          </div>

          <div style={{ textAlign: 'right', flex: 1 }}>
            <label>Order #:</label>
            <input type="text" value={orderNumber} readOnly style={{ padding: '10px', width: '100%', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f5f5f5' }} />
            <br /><br />
            <label>Date:</label>
            <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} style={{ padding: '10px', width: '100%', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '30px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Item / Service</th>
              <th>Unit</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Discount</th>
              <th>GST %</th>
              <th>Notes</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const base = (item.qty * item.rate) - item.discount;
              const total = base + (base * item.gst / 100);
              return (
                <tr key={index}>
                  <td><input value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} style={{ width: '100%', padding: '8px' }} /></td>
                  <td><input value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} style={{ width: '80px', padding: '8px' }} /></td>
                  <td><input type="number" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} style={{ width: '60px', padding: '8px' }} /></td>
                  <td><input type="number" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} style={{ width: '100px', padding: '8px' }} /></td>
                  <td><input type="number" value={item.discount} onChange={(e) => handleItemChange(index, 'discount', e.target.value)} style={{ width: '80px', padding: '8px' }} /></td>
                  <td><input type="number" value={item.gst} onChange={(e) => handleItemChange(index, 'gst', e.target.value)} style={{ width: '60px', padding: '8px' }} /></td>
                  <td><input value={item.notes} onChange={(e) => handleItemChange(index, 'notes', e.target.value)} style={{ width: '100%', padding: '8px' }} /></td>
                  <td>₹{total.toFixed(2)}</td>
                  <td><button onClick={() => removeItem(index)} style={{ color: 'red', fontWeight: 'bold', border: 'none', background: 'transparent' }}>✖</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button onClick={addItem} style={{ marginBottom: '20px', backgroundColor: '#003366', color: '#fff', padding: '10px 18px', border: 'none', borderRadius: '6px' }}>+ Add Item</button>

        <div style={{ textAlign: 'right', marginTop: '30px' }}>
          <h3 style={{ color: '#003366' }}>Total Amount: ₹{totalAmount.toFixed(2)}</h3>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button onClick={handleSave} style={{ padding: '12px 28px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', marginRight: '12px' }}>Save Order</button>
          <button onClick={handlePrint} style={{ padding: '12px 28px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px' }}>Print / Save PDF</button>
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

export default PurchaseOrderForm;
