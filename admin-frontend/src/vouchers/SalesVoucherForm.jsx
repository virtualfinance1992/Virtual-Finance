import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import CustomerForm from '../customer_mgmt/CustomerForm';
import InventoryForm from '../inventory_mgmt/InventoryForm'; // Add this import
import axios from 'axios';


const productList = [
  { name: 'Product A', rate: 500, unit: 'pcs' },
  { name: 'Product B', rate: 1000, unit: 'kg' },
  { name: 'Service X', rate: 750, unit: 'service' },
];



const SalesVoucherForm = ({ onClose, companyId }) => {
  const [customer, setCustomer] = useState('');
  const [account] = useState('Sales');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerList, setCustomerList] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);  // ✅ Dynamic customer list
  const [items, setItems] = useState([{ description: '', unit: '', qty: 1, rate: 0, discount: 0, gst: 18, notes: '' }]);
  
  const [showCustomerForm, setShowCustomerForm] = useState(false); // Modal toggle
  const componentRef = useRef();
  
  const [inventoryList, setInventoryList] = useState([]);

  useEffect(() => {
    const fetchInventoryItems = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const companyId = localStorage.getItem("selectedCompanyId");
  
        if (!companyId) {
          console.error("❌ No company ID found in localStorage");
          return;
        }
  
        const res = await fetch(`http://localhost:8000/api/inventory/items/${companyId}/`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
  
        const data = await res.json();
        console.log("📦 Inventory List Fetched:", data);
  
        if (Array.isArray(data)) {
          setInventoryList(data);
        } else {
          console.error("❌ Expected array, got:", data);
          setInventoryList([]);
        }
      } catch (err) {
        console.error("🚨 Error fetching inventory:", err);
        setInventoryList([]);
      }
    };
  
    fetchInventoryItems();
  }, []);
  

  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [newInventory, setNewInventory] = useState({ name: '', unit: '', rate: 0 });

  const handleNewInventorySave = () => {
    if (!newInventory.name || !newInventory.unit || !newInventory.rate) {
      alert("❗ Please fill all inventory fields");
      return;
    }
    productList.push({ ...newInventory });
    setShowInventoryModal(false);
    alert("✅ Item added to inventory list.");
  };


  useEffect(() => { 
    const fetchCustomerList = async () => {
      try {
        const token = localStorage.getItem('accessToken'); // ✅ fetch the token
        console.log("📡 Fetching customers for company:", companyId);
        
        const res = await fetch(`http://localhost:8000/api/customers/${companyId}/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`  // ✅ include the token
          }
        });
    
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        
        const data = await res.json();
        const names = data.map(c => c.name);
        console.log("📋 Customer list received:", names);
        setCustomerList(names);
      } catch (err) {
        console.error("❌ Error fetching customer list:", err);
      }
    };
    fetchCustomerList();
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

  const handleCustomerChange = (value) => {
    setCustomer(value);
    if (!customerList.some(c => c.toLowerCase() === value.toLowerCase())) {
      alert('⚠️ No such customer exists. Please add the customer.');
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', unit: '', qty: 1, rate: 0, discount: 0, gst: 18, notes: '' }]);
  };

  const removeItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

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
    documentTitle: `Invoice_${invoiceNumber}`,
  });

  const handleSaveInvoice = async () => {
    const token = localStorage.getItem("accessToken");
  
    try {
      console.log("🔄 Step 1: Fetching/Creating ledgers for Sales Voucher...");
  
      // ✅ Send customer name to ensure a named customer ledger is created
      const ledgerRes = await axios.post(
        `http://127.0.0.1:8000/api/vouchers/ensure-sales-ledgers/${companyId}/`,
        JSON.stringify({ name: customer }),  // ✅ Send JSON string
        {
          headers: {
            'Content-Type': 'application/json',  // ✅ VERY IMPORTANT
            Authorization: `Bearer ${token}`
            
          }
        }
      );
  
      const {
        customer_ledger_id,
        sales_ledger_id,
        gst_ledger_id
      } = ledgerRes.data;
  
      console.log("✅ Step 1 Complete: Ledger IDs fetched from backend:");
      console.log("📌 Customer Ledger ID:", customer_ledger_id);
      console.log("📌 Sales Ledger ID:", sales_ledger_id);
      console.log("📌 GST Ledger ID:", gst_ledger_id);
  
      // 💰 Step 2: Calculate total invoice value
      console.log("🧾 Step 2: Calculating total invoice amount from items...");
      const totalAmount = items.reduce((acc, i) => {
        const base = i.qty * i.rate - i.discount;
        return acc + base + (base * i.gst / 100);
      }, 0);
      console.log("💰 Total Invoice Amount:", totalAmount.toFixed(2));
  
      // 🧾 Step 3: Build the final payload
      const payload = {
        date: invoiceDate,
        reference: `Invoice to ${customer}`,
        notes: '',
        entries: [
          {
            ledger: customer_ledger_id,
            is_debit: true,
            amount: totalAmount.toFixed(2)
          },
          {
            ledger: sales_ledger_id,
            is_debit: false,
            amount: (totalAmount * 0.9).toFixed(2)
          },
          {
            ledger: gst_ledger_id,
            is_debit: false,
            amount: (totalAmount * 0.1).toFixed(2)
          }
        ]
      };
  
      console.log("📦 Step 3 Complete: Final payload ready:", payload);
  
      // 🚀 Step 4: Submit Sales Voucher
      const res = await axios.post(
        `http://127.0.0.1:8000/api/vouchers/sales/${companyId}/create/`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
  
      console.log("✅ Step 4 Complete: Voucher successfully saved:", res.data);
  
      setInvoiceNumber(res.data.voucher_number || '');
      alert(`✅ Invoice saved.\nInvoice Number: ${res.data.voucher_number}`);
      onClose();
    } catch (err) {
      console.error("❌ ERROR during invoice submission.");
      if (err.response) {
        console.error("❌ Backend Response Error:", err.response.data);
      } else if (err.request) {
        console.error("❌ Network Error:", err.request);
      } else {
        console.error("❌ General Code Error:", err.message);
      }
      alert('❌ Failed to save invoice.');
    }
  };
  
  

  return (
    <div className="invoice-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px', background: '#fff', borderRadius: '16px', boxShadow: '0 0 24px rgba(0,0,0,0.2)', fontFamily: 'Arial, sans-serif', position: 'relative' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>

      <div ref={componentRef}>
        <h2 style={{ textAlign: 'center', color: '#003366', marginBottom: '24px' }}>🧾 Sales Voucher</h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 'bold' }}>Customer:</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  value={customer}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomer(val);
                    setFilteredCustomers(customerList.filter(c =>
                      c.toLowerCase().includes(val.toLowerCase())
                    ));
                    setShowDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Enter or select customer"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                />
                {showDropdown && filteredCustomers.length > 0 && (
                  <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderTop: 'none',
                    zIndex: 1000,
                    maxHeight: '160px',
                    overflowY: 'auto',
                    margin: 0,
                    padding: 0,
                    listStyle: 'none'
                  }}>
                    {filteredCustomers.map((name, index) => (
                      <li
                        key={index}
                        onMouseDown={() => setCustomer(name)}
                        style={{
                          padding: '10px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #eee'
                        }}
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                style={{ padding: '10px 14px', borderRadius: '6px', background: '#28a745', color: '#fff', border: 'none' }}
                onClick={() => {
                  console.log("📌 New Customer button clicked");
                  setShowCustomerForm(true);
                }}
              >
                + New Customer
              </button>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ fontWeight: 'bold' }}>Account:</label>
              <input
                type="text"
                value={account}
                readOnly
                style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#f5f5f5', border: '1px solid #ccc', marginTop: '6px' }}
              />
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <label style={{ fontWeight: 'bold' }}>Invoice #:</label>
            <input
              type="text"
              value={invoiceNumber}
              readOnly
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                marginLeft: '10px',
                width: '220px',
                backgroundColor: '#f9f9f9'
              }}
            />
            <br /><br />
            <label style={{ fontWeight: 'bold' }}>Date:</label>
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', marginLeft: '10px' }} />
          </div>
        </div>

        {/* Table: Items */}
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
                      <input
                        list="inventoryList"
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Enter product/service name"
                        style={{ width: '100%', padding: '8px' }}
                      />
                      
                      <datalist id="inventoryList">
                        {inventoryList.map((item, i) => (
                          <option key={i} value={item.name} />
                        ))}
                      </datalist>
    
                      <button
                        title="Add new product or service"
                        onMouseOver={(e) => { e.target.title = 'Add new product or service'; }}
                        onClick={() => {
                          console.log('➕ Add button clicked to open inventory modal');
                          setShowInventoryModal(true);
                        }}
                        style={{ padding: '6px 10px', borderRadius: '4px', background: '#007bff', color: '#fff', border: 'none' }}
                      >+ Add</button>
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

        <div style={{ textAlign: 'right', marginTop: '30px' }}>
          <p><strong>Total Discount:</strong> ₹{totalDiscount.toFixed(2)}</p>
          <p><strong>GST Amount:</strong> ₹{gstAmount.toFixed(2)}</p>
          <h3 style={{ color: '#003366', marginTop: '12px' }}>Grand Total: ₹{grandTotal.toFixed(2)}</h3>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button
            onClick={handleSaveInvoice}
            
            style={{ padding: '12px 28px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', marginRight: '12px' }}>
            Save Invoice
          </button>
          <button onClick={handlePrint} style={{ padding: '12px 28px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px' }}>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* ✅ Customer Form Popup */}
      
      {/* ✅ Inventory Form Popup */}
      {showInventoryModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 9999
          }}
          onClick={() => {
            console.log("🛑 Inventory modal backdrop clicked.");
            setShowInventoryModal(false);
          }}
        >
          <div onClick={(e) => e.stopPropagation()}>
          <InventoryForm
            companyId={companyId}
            onClose={() => setShowInventoryModal(false)}
            onSave={(newItem) => {
              console.log("📦 Inventory item added:", newItem);
            }}
          />

              }}
            />
          </div>
        </div>
      )}


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

export default SalesVoucherForm;
