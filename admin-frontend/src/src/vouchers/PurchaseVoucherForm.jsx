// 📦 Updated PurchaseVoucherForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import SupplierForm from '../supplier_mgmt/SupplierForm';
import InventoryForm from '../inventory_mgmt/InventoryForm';

const productList = [
  { name: 'Product A', rate: 500, unit: 'pcs' },
  { name: 'Product B', rate: 1000, unit: 'kg' },
  { name: 'Service X', rate: 750, unit: 'service' },
];

const PurchaseVoucherForm = ({ onClose, companyId }) => {
  const [supplier, setSupplier] = useState('');
  const [account] = useState('Purchase');
  const [purchaseNumber] = useState('AUTO-GENERATED');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierList, setSupplierList] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [items, setItems] = useState([{ description: '', unit: '', qty: 1, rate: 0, discount: 0, gst: 18, notes: '' }]);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [inventoryList, setInventoryList] = useState([]);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [loadingPurchaseNumber, setLoadingPurchaseNumber] = useState(false);

  const componentRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("accessToken");

      try {
        const res1 = await fetch(`https://virtual-finance-backend.onrender.com/api/inventory/items/${companyId}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const invData = await res1.json();
        setInventoryList(Array.isArray(invData) ? invData : []);

        const res2 = await fetch(`https://virtual-finance-backend.onrender.com/api/suppliers/${companyId}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const suppData = await res2.json();
        setSupplierList(suppData.map(s => s.name));
        console.log("✅ Suppliers and inventory loaded");
      } catch (err) {
        console.error("❌ Failed to load supplier/inventory:", err);
      }
    };

    if (companyId) fetchData();
  }, [companyId]);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    if (['qty', 'rate', 'gst', 'discount'].includes(field)) {
      value = isNaN(value) ? 0 : parseFloat(value);
    }
    if (field === 'description') {
      const matched = inventoryList.find(p => p.name.toLowerCase() === value.toLowerCase());
      if (matched) {
        updated[index] = { ...updated[index], description: matched.name, rate: matched.rate, unit: matched.unit };
      } else {
        updated[index].description = value;
        alert('⚠️ No such product/service found. Please add it.');
      }
    } else {
      updated[index][field] = value;
    }
    setItems(updated);
  };

  const addItem = () => setItems([...items, { description: '', unit: '', qty: 1, rate: 0, discount: 0, gst: 18, notes: '' }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const calculateTotal = () => items.reduce((acc, item) => acc + (item.qty * item.rate - item.discount), 0);
  const calculateDiscount = () => items.reduce((acc, item) => acc + item.discount, 0);
  const calculateGST = () => items.reduce((acc, item) => {
    const net = item.qty * item.rate - item.discount;
    return acc + (net * item.gst) / 100;
  }, 0);

  const total = calculateTotal();
  const totalDiscount = calculateDiscount();
  const gstAmount = calculateGST();
  const grandTotal = total + gstAmount;

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Purchase_${purchaseNumber}`,
  });

  const handleSavePurchase = async () => {
    const token = localStorage.getItem("accessToken");
    console.log("📦 Saving Purchase Voucher...");

    const payload = {
      company: companyId,
      date: purchaseDate,
      voucher_type: 'PURCHASE',
      reference: `Purchase from ${supplier}`,
      notes: '',
      entries: [
        {
          ledger: null,
          is_debit: true,
          amount: (total * 0.9).toFixed(2),
        },
        {
          ledger: null,
          is_debit: true,
          amount: (total * 0.1).toFixed(2),
        },
        {
          ledger: null,
          is_debit: false,
          amount: grandTotal.toFixed(2),
        }
      ]
    };

    try {
      const res = await fetch(`https://virtual-finance-backend.onrender.com/api/vouchers/purchase/${companyId}/create/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.text();
        console.error("❌ Save failed:", errorData);
        return alert("❌ Failed to save purchase voucher.");
      }

      const result = await res.json();
      console.log("✅ Purchase saved:", result);
      alert(`✅ Purchase saved. Voucher No: ${result.voucher_number}`);
      onClose();
    } catch (err) {
      console.error("❌ Save error:", err);
      alert("❌ Error saving purchase voucher.");
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px', background: '#fff', borderRadius: '16px', boxShadow: '0 0 24px rgba(0,0,0,0.2)', fontFamily: 'Arial, sans-serif', position: 'relative' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>
      <div ref={componentRef}>
        <h2 style={{ textAlign: 'center', color: '#003366', marginBottom: '24px' }}>🧾 Purchase Voucher</h2>

        {/* Supplier Field */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 'bold' }}>Supplier:</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
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
                      <li
                        key={index}
                        onMouseDown={() => setSupplier(name)}
                        style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button onClick={() => setShowSupplierForm(true)} style={{ padding: '10px 14px', borderRadius: '6px', background: '#28a745', color: '#fff', border: 'none' }}>
                + New Supplier
              </button>
            </div>
            <div style={{ marginTop: '20px' }}>
              <label style={{ fontWeight: 'bold' }}>Account:</label>
              <input type="text" value={account} readOnly style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#f5f5f5', border: '1px solid #ccc', marginTop: '6px' }} />
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <label style={{ fontWeight: 'bold' }}>Purchase #:</label>
            <input type="text" value={purchaseNumber} readOnly style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', marginLeft: '10px', width: '220px', backgroundColor: '#f9f9f9' }} />
            <br /><br />
            <label style={{ fontWeight: 'bold' }}>Date:</label>
            <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', marginLeft: '10px' }} />
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Item / Service</th>
              <th style={{ padding: '12px' }}>Unit</th>
              <th style={{ padding: '12px' }}>Qty</th>
              <th style={{ padding: '12px' }}>Rate/Unit (₹)</th>
              <th style={{ padding: '12px' }}>Discount (₹)</th>
              <th style={{ padding: '12px' }}>GST %</th>
              <th style={{ padding: '12px' }}>Notes</th>
              <th style={{ padding: '12px' }}>Amount (₹)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const net = item.qty * item.rate - item.discount;
              const totalWithGST = net + (net * item.gst) / 100;
              return (
                <tr key={index}>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input list="inventoryList" type="text" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} placeholder="Enter product/service name" style={{ width: '100%', padding: '8px' }} />
                      <datalist id="inventoryList">
                        {inventoryList.map((item, i) => <option key={i} value={item.name} />)}
                      </datalist>
                      <button onClick={() => setShowInventoryModal(true)} style={{ padding: '6px 10px', borderRadius: '4px', background: '#007bff', color: '#fff', border: 'none' }}>+ Add</button>
                    </div>
                  </td>
                  <td><input type="text" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} style={{ width: '70px', padding: '8px' }} /></td>
                  <td><input type="number" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} style={{ width: '70px', padding: '8px' }} /></td>
                  <td><input type="number" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} style={{ width: '100px', padding: '8px' }} /></td>
                  <td><input type="number" value={item.discount} onChange={(e) => handleItemChange(index, 'discount', e.target.value)} style={{ width: '100px', padding: '8px' }} /></td>
                  <td><input type="number" value={item.gst} onChange={(e) => handleItemChange(index, 'gst', e.target.value)} style={{ width: '70px', padding: '8px' }} /></td>
                  <td><textarea value={item.notes} onChange={(e) => handleItemChange(index, 'notes', e.target.value)} style={{ width: '100%', padding: '6px' }} placeholder="Description or Remarks" rows={2} /></td>
                  <td style={{ textAlign: 'right' }}>{totalWithGST.toFixed(2)}</td>
                  <td><button onClick={() => removeItem(index)} style={{ color: 'red', fontWeight: 'bold', border: 'none', background: 'transparent' }}>✖</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button onClick={addItem} style={{ marginBottom: '20px', backgroundColor: '#003366', color: '#fff', padding: '10px 18px', border: 'none', borderRadius: '6px' }}>+ Add Item</button>

        {/* Totals */}
        <div style={{ textAlign: 'right', marginTop: '30px' }}>
          <p><strong>Total Discount:</strong> ₹{totalDiscount.toFixed(2)}</p>
          <p><strong>GST Amount:</strong> ₹{gstAmount.toFixed(2)}</p>
          <h3 style={{ color: '#003366', marginTop: '12px' }}>Grand Total: ₹{grandTotal.toFixed(2)}</h3>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button onClick={() => { console.log("🟢 Save button clicked"); handleSavePurchase(); }} disabled={loadingPurchaseNumber} style={{ padding: '12px 28px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', marginRight: '12px' }}>Save Purchase</button>
          <button onClick={handlePrint} style={{ padding: '12px 28px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px' }}>Print / Save PDF</button>
        </div>
      </div>

      {/* Modals */}
      {showSupplierForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowSupplierForm(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <SupplierForm onClose={() => setShowSupplierForm(false)} />
          </div>
        </div>
      )}

      {showInventoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowInventoryModal(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <InventoryForm
              onClose={() => setShowInventoryModal(false)}
              onSave={(newItem) => {
                productList.push(newItem);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseVoucherForm;