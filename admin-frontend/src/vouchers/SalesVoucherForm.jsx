import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import CustomerForm from '../customer_mgmt/CustomerForm';
import InventoryForm from '../inventory_mgmt/InventoryForm'; // Add this import
import axios from 'axios';
import InvoiceTemplate from '../Invoice_Templates/InvoiceTemplate'; // adjust path if needed
import '../vouchers/SalesVoucherForm.scss';



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
  const [prefillCustomerName, setPrefillCustomerName] = useState(''); // to take name to the customer form
  const [filteredInventory, setFilteredInventory] = useState([]);  // invetorydrop down
  const [showInventoryDropdown, setShowInventoryDropdown] = useState(false);
  const [dropdownStates, setDropdownStates] = useState({});  // key = row index
  const [modalOpenedForItem, setModalOpenedForItem] = useState(null);
  const [prefillItemName, setPrefillItemName] = useState('');
  const [receivedNow, setReceivedNow] = useState(false);
  const [paymentMode, setPaymentMode] = useState(''); // 'cash' or 'bank'
  const [receiptAmount, setReceiptAmount] = useState(0);
  const [showFullPaymentButton, setShowFullPaymentButton] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [lastInvoiceData, setLastInvoiceData] = useState(null);
  const [filteredInventories, setFilteredInventories] = useState({});
  

  const selectedCompanyId = localStorage.getItem('selectedCompanyId'); // Fetch from localStorage
  const [customerDetails, setCustomerDetails] = useState(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false); // Modal toggle
  const componentRef = useRef();
  const [remarks, setRemarks] = useState('');
  const [paymentLedgerId, setPaymentLedgerId] = useState(null);

  
  const [inventoryList, setInventoryList] = useState([]);

  useEffect(() => {
    const fetchInventoryItems = async () => {
      try {
        const token = localStorage.getItem("accessToken");
  
        if (!companyId) {
          console.error("❌ No company ID passed as prop to SalesVoucherForm");
          return;
        }
  
        console.log("📦 Fetching inventory for company ID:", companyId);
  
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
  }, [companyId]); // 👈 make sure to include companyId as a dependency
  
  

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
    console.log(`🔧 [Row ${index}] Field "${field}" changed to:`, value);
  
    const updated = [...items];
  
    // parse numeric fields
    if (['qty', 'rate', 'gst', 'discount'].includes(field)) {
      value = isNaN(value) ? 0 : parseFloat(value);
    }
  
    if (field === 'description') {
      // filter dropdown as user types
      const filtered = inventoryList.filter(i =>
        i.name.toLowerCase().includes(value.toLowerCase())
      );
      console.log('📋 Filtered inventory list:', filtered);
      setFilteredInventory(filtered);
      setShowInventoryDropdown(value.length >= 2);
  
      // if nothing matches and they've typed at least 3 chars, prompt immediately
      if (value.trim().length > 2 && filtered.length === 0 && modalOpenedForItem !== value.toLowerCase()) {
        console.warn(`⚠️ No inventory match for "${value}"`);
        if (window.confirm(`Inventory item "${value}" not found. Do you want to add it now?`)) {
          setPrefillItemName(value);
          setShowInventoryModal(true);
          setModalOpenedForItem(value.toLowerCase());
        }
      }
  
      // try to match exact name for autofill
      const matched = inventoryList.find(p =>
        p.name.toLowerCase() === value.toLowerCase()
      );
      if (matched) {
        console.log('✅ Matched item from inventory:', matched);
        updated[index] = {
          ...updated[index],
          description: matched.name,
          rate: matched.rate,
          unit: matched.unit,
          gst: matched.gst_rate || 0,
          hsn_code: matched.hsn_code || '',
          notes: matched.description || ''
        };
      } else {
        updated[index].description = value;
      }
    } else {
      // for all other fields (unit, qty, rate, discount, gst, notes)
      updated[index][field] = value;
    }
  
    setItems(updated);
  };
  
  
  
  const handleCustomerChange = (value) => {
    console.log("🖊️ Customer input changed:", value);
    setCustomer(value);
  
    const exists = customerList.some(c => c.toLowerCase() === value.toLowerCase());
    setFilteredCustomers(customerList.filter(c =>
      c.toLowerCase().includes(value.toLowerCase())
    ));
    setShowDropdown(true);
  
    if (!exists) {
      console.log("⚠️ Customer not found in list:", value);
      setTimeout(() => {
        const confirmAdd = window.confirm(`⚠️ Customer "${value}" not found.\nWould you like to add them now?`);
        if (confirmAdd) {
          console.log("✅ Opening CustomerForm to add:", value);
          setShowCustomerForm(true);
        } else {
          console.log("❌ User chose not to add the customer.");
        }
      }, 300);
    } else {
      console.log("✅ Customer exists:", value);
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

  const handleViewInvoiceClick = async () => {
    const selectedCompanyId = localStorage.getItem('selectedCompanyId');
    const customerName = typeof customer === 'string' ? customer : customer?.name;
    const token = localStorage.getItem('accessToken');
  
    console.log("📄 View Invoice button clicked");
    console.log("🏢 selectedCompanyId:", selectedCompanyId);
    console.log("👤 customer name:", customerName);
  
    let customerDetails = null;
  
    if (customerName && selectedCompanyId && token) {
      try {
        const res = await axios.get(
          `http://localhost:8000/api/customers/search/?name=${customerName}&company=${selectedCompanyId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        customerDetails = res.data;
        console.log("✅ Customer found by name:", customerDetails);
      } catch (err) {
        console.error("❌ Error fetching customer by name:", err);
      }
    } else {
      console.warn("⚠️ Missing customer name, company ID, or token");
    }
  
    if (customerDetails) {
      const calculatedTotal = items.reduce((acc, i) => {
        const base = i.qty * i.rate - i.discount;
        return acc + base + (base * i.gst / 100);
      }, 0);
  
      const tempInvoiceData = {
        customer: customerName,
        customerId: customerDetails?.id || null,
        customerAddress: customerDetails?.address || '', // Passing address
        customerEmail: customerDetails?.email || '', // Passing email
        invoiceDate,
        items,
        invoiceNumber: invoiceNumber || 'Preview-Only',
        totalAmount: calculatedTotal.toFixed(2),
        amountPaid: receiptAmount,
        paymentMode: paymentMode || '',
      };
  
      console.log("🧾 Prepared invoice preview data:", tempInvoiceData);
  
      setLastInvoiceData(tempInvoiceData); // Saving the prepared invoice data
      setShowInvoicePreview(true); // Trigger the preview visibility
  
      console.log("👀 showInvoicePreview:", true);
      console.log("🧾 lastInvoiceData:", tempInvoiceData);
    } else {
      console.warn("⚠️ Customer details not found. Cannot generate invoice preview.");
    }
  };
  
  


  // ... all existing code

  const handleSaveInvoice = async () => {
    const token = localStorage.getItem("accessToken");
  
    if (!token || !companyId || !customer) {
      console.error("❌ Missing token, company ID, or customer.");
      alert("Missing required information to save invoice.");
      return;
    }
  
    try {
      console.log("🔄 Step 1: Fetching/Creating ledgers for Sales Voucher...");
  
      const ledgerRes = await axios.post(
        `http://127.0.0.1:8000/api/vouchers/ensure-sales-ledgers/${companyId}/`,
        JSON.stringify({ name: customer }),
        {
          headers: {
            'Content-Type': 'application/json',
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
  
      // Step 2: Calculate total
      console.log("🧾 Step 2: Calculating total invoice amount from items...");
      const totalAmount = items.reduce((acc, i) => {
        const base = i.qty * i.rate - i.discount;
        return acc + base + (base * i.gst / 100);
      }, 0);
      console.log("💰 Total Invoice Amount:", totalAmount.toFixed(2));
  
      // Step 3: Build payload
      const payload = {
        date: invoiceDate,
        reference: `Invoice to ${customer}`,
        
        entries: [
          {
            ledger: customer_ledger_id,
            is_debit: true,
            amount: totalAmount.toFixed(2)
          },
          {
            ledger: sales_ledger_id,
            is_debit: false,
            // net = sum(qty*rate − discount)
            amount: calculateTotal().toFixed(2)
          },
          {
            ledger: gst_ledger_id,
            is_debit: false,
            // GST portion = sum((qty*rate − discount) * gst/100)
            amount: calculateGST().toFixed(2)
          }
        ],
        
      // send exactly the same fields your back-end expects for VoucherItemSerializer
        items: items.map(item => ({
        product:      item.description,  // your back-end maps 'product' → item_name
        quantity:     item.qty,
        price:        item.rate,
        discount_amt: item.discount,
        gst_pct:      item.gst,
        unit:         item.unit,
        notes:        item.notes || '',  // ← include per-item notes too, if you have them
        remarks:    remarks,   
      })),
    };
    console.log("📦 Step 3 Complete: Final payload ready:", payload);
  
      // Step 4: Submit Sales Voucher
      const res = await axios.post(
        `http://127.0.0.1:8000/api/vouchers/sales/${companyId}/create/`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
      const { id: voucherId, voucher_number: newInvoiceNo } = res.data;

      console.log('✅ Created voucher ID:', voucherId);
      console.log('📄 Invoice Number:', newInvoiceNo);
  
      console.log("✅ Step 4 Complete: Voucher successfully saved:", res.data);
      // const newInvoiceNo = res.data.voucher_number || '';
      setInvoiceNumber(newInvoiceNo);
  
      // Set invoice data for preview
      setLastInvoiceData({
        customer,
        invoiceDate,
        items,
        invoiceNumber: newInvoiceNo,
        totalAmount: totalAmount.toFixed(2),
      });
  
      // Step 5: Optionally create Receipt
      if (receivedNow && paymentMode && receiptAmount > 0) {
        console.log(`💰 Creating Receipt for ₹${receiptAmount} via ${paymentMode}...`);
  
        const receiptPayload = {
          company:       companyId,  
          voucher_type: 'RECEIPT',
          against_voucher: voucherId,        // ← link back to the sale here! 
          date: invoiceDate,
          reference: `Received from ${customer}`,
          party_name: customer,  // ✅ important: used to find or create correct ledger
          notes: '',
          payment_mode: paymentMode,
          
          entries: [
            {
              ledger: paymentLedgerId,
              is_debit: true,
              amount: receiptAmount
            },
            {
              ledger: customer_ledger_id,
              is_debit: false,
              amount: receiptAmount
            }
          ]
        };
  
        try {
          const receiptRes = await axios.post(
            `http://127.0.0.1:8000/api/vouchers/receipt/${companyId}/create/`,
            receiptPayload,
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              }
            }
          );
          console.log("✅ Receipt created successfully:", receiptRes.data);
         
        } catch (err) {
          
          console.error("❌ Failed to create receipt:", err);
          alert('⚠️ Invoice saved, but receipt creation failed.');
        }
      }
  
      alert(`✅ Invoice saved.\nInvoice Number: ${newInvoiceNo}`);
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
  
  
  
  
  const totalAmount = items.reduce((acc, i) => {
    const base = i.qty * i.rate - i.discount;
    return acc + base + (base * i.gst / 100);
  }, 0);
  



return (
  <div className="invoice-container" ref={componentRef}>
    {/* ─── Meta Section ─── */}
    <div className="voucher-meta">
      {/* Customer + New Customer */}
      {/* Row 1: Customer (col 1), Invoice # (col 2) */}
      <div className="meta-group customer-dropdown">
        <label>Customer:</label>
        <div className="autocomplete-group">
          <input
            type="text"
            value={customer}
            onChange={e => {
              const val = e.target.value;
              console.log("✍️ Customer typing:", val);
              setCustomer(val);
              setFilteredCustomers(customerList.filter(c =>
                c.toLowerCase().includes(val.toLowerCase())
              ));
              setShowDropdown(true);
            }}
            onBlur={() => {
              console.log("🔍 Customer input blurred:", customer);
              setTimeout(() => setShowDropdown(false), 150);
              const trimmed = customer.trim().toLowerCase();
              const exists = customerList.some(c => c.toLowerCase() === trimmed);
              if (!exists && trimmed.length > 2) {
                console.log("⚠️ Final customer name not found:", trimmed);
                setPrefillCustomerName(customer);
                setTimeout(() => {
                  if (
                    window.confirm(
                      `⚠️ Customer "${customer}" not found.\nWould you like to add them now?`
                    )
                  ) {
                    console.log("✅ User chose to add new customer:", customer);
                    setShowCustomerForm(true);
                  } else {
                    console.log("❌ User cancelled adding customer.");
                  }
                }, 100);
              } else {
                console.log("✅ Customer exists:", trimmed);
              }
            }}
            placeholder="Enter or select customer"
          />
          {showDropdown && filteredCustomers.length > 0 && (
            <ul>
              {filteredCustomers.map((name, i) => (
                <li
                  key={i}
                  onMouseDown={() => {
                    console.log("👤 Customer selected from dropdown:", name);
                    setCustomer(name);
                  }}
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          className="btn-inline"
          onClick={() => {
            console.log("📌 New Customer button clicked");
            setShowCustomerForm(true);
          }}
        >
          New Customer
        </button>
      </div>

      {/* Account */}
      {/* Row 2: Account (col 1), Date (col 2) */}
  <div className="meta-group account-group">
        <label>Account:</label>
        <input type="text" value={account} readOnly />
      </div>

      {/* Invoice # */}
        <div className="meta-group invoice-group">
        <label>Invoice #:</label>
        <input type="text" value={invoiceNumber} readOnly />
      </div>

      {/* Date */}
       <div className="meta-group date-group">
        <label>Date:</label>
        <input
          type="date"
          value={invoiceDate}
          onChange={e => {
            console.log("📅 Date changed:", e.target.value);
            setInvoiceDate(e.target.value);
          }}
        />
      </div>
    </div>

    {/* ─── Items Table ─── */}
    <table className="voucher-table">
      <thead>
        <tr>
          <th>Item / Service</th>
          <th>Unit</th>
          <th>Qty</th>
          <th>Rate/Unit (₹)</th>
          <th>Discount (₹)</th>
          <th>GST %</th>
          <th>Notes</th>
          <th className="text-right">Amount (₹)</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => {
          const net = item.qty * item.rate - item.discount;
          const totalWithGST = net + (net * item.gst) / 100;
          return (
            <tr key={idx}>
              <td className="item-cell">
                <input
                  type="text"
                  value={item.description}
                  onChange={e => {
                    const val = e.target.value;
                    console.log(`✍️ Item[${idx}] typing:`, val);
                    handleItemChange(idx, 'description', val);
                    const filtered = inventoryList.filter(i =>
                      i.name.toLowerCase().includes(val.toLowerCase())
                    );
                    setFilteredInventories(f => ({ ...f, [idx]: filtered }));
                    setDropdownStates(s => ({ ...s, [idx]: val.length >= 2 }));
                  }}
                  onBlur={() => {
                    console.log(`🔍 Item[${idx}] blur:`, item.description);
                    setTimeout(() => {
                      setDropdownStates(s => ({ ...s, [idx]: false }));
                      const typed = item.description.trim().toLowerCase();
                      const exists = inventoryList.some(i =>
                        i.name.toLowerCase() === typed
                      );
                      if (!exists && typed.length > 2 && modalOpenedForItem !== typed) {
                        console.log("⚠️ Inventory item not found on blur:", typed);
                        if (
                          window.confirm(
                            `⚠️ "${item.description}" not found in inventory.\nDo you want to add it?`
                          )
                        ) {
                          setPrefillItemName(item.description);
                          setShowInventoryModal(true);
                          setModalOpenedForItem(typed);
                        } else {
                          console.log("❌ Inventory add cancelled.");
                        }
                      } else {
                        console.log("✅ Inventory exists or too short:", typed);
                      }
                    }, 150);
                  }}
                  placeholder="Enter or select product/service"
                />
                {dropdownStates[idx] && filteredInventories[idx]?.length > 0 && (
                  <ul>
                    {filteredInventories[idx].map((inv, i) => (
                      <li
                        key={i}
                        onMouseDown={() => {
                          console.log(`📥 Inventory selected:`, inv.name);
                          handleItemChange(idx, 'description', inv.name);
                          setDropdownStates(s => ({ ...s, [idx]: false }));
                        }}
                      >
                        {inv.name}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  className="add-item-btn"
                  title="Add new product or service"
                  onClick={() => {
                    console.log("📌 Add Inventory modal open for:", item.description);
                    setPrefillItemName(item.description);
                    setShowInventoryModal(true);
                  }}
                >
                  Add
                </button>
              </td>
              <td><input type="text" value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} /></td>
              <td><input type="number" value={item.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} /></td>
              <td><input type="number" value={item.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} /></td>
              <td><input type="number" value={item.discount} onChange={e => handleItemChange(idx, 'discount', e.target.value)} /></td>
              <td><input type="number" value={item.gst} onChange={e => handleItemChange(idx, 'gst', e.target.value)} /></td>
              <td><textarea value={item.notes} onChange={e => handleItemChange(idx, 'notes', e.target.value)} /></td>
              <td className="text-right">{totalWithGST.toFixed(2)}</td>
              <td>
                <button
                  className="remove-btn"
                  onClick={() => {
                    console.log(`🗑️ Removing item[${idx}]`);
                    removeItem(idx);
                  }}
                >
                  ✖
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    <button className="add-item-btn" onClick={() => {
      console.log("➕ Adding new empty item row");
      addItem();
    }}>
      Add Item
    </button>

    {/* ─── Totals ─── */}
    <div className="voucher-totals">
      <p><strong>Total Discount:</strong> ₹{totalDiscount.toFixed(2)}</p>
      <p><strong>GST Amount:</strong> ₹{gstAmount.toFixed(2)}</p>
      <h3>Grand Total: ₹{grandTotal.toFixed(2)}</h3>
    </div>

    {/* ─── Remarks Box ─── */}
<div className="remarks-box">
  <label htmlFor="remarks">Remarks:</label>
  <textarea
    id="remarks"
    name="remarks"
    rows={3}
     placeholder={`• Goods once sold will not be returned
• Payment due within 30 days
• Please inspect upon delivery`}
    value={remarks}
    onChange={e => setRemarks(e.target.value)}
  />
</div>

    {/* ─── Payment Section ─── */}
    <div className={`payment-section ${receivedNow ? 'received' : ''}`}>
      <h3>Payment Received Now?</h3>
      {!receivedNow ? (
        <button className="mark-received-btn" onClick={() => {
          console.log("✅ Marking payment as received now");
          setReceivedNow(true);
          setShowFullPaymentButton(true);
        }}>
          Mark as Received Now
        </button>
      ) : (
        <>
          <div className="mode-buttons">
            <button
              className={`cash ${paymentMode === 'cash' ? 'active' : ''}`}
              onClick={() => {
                console.log("💵 Payment mode set to cash");
                setPaymentMode('cash');
              }}
            >
              Cash
            </button>
            <button
              className={`bank ${paymentMode === 'bank' ? 'active' : ''}`}
              onClick={() => {
                console.log("🏦 Payment mode set to bank");
                setPaymentMode('bank');
              }}
            >
              Bank
            </button>
          </div>
          <div className="amount-input">
            <label>Amount Received:</label>
            <input
              type="number"
              value={receiptAmount}
              onChange={e => {
                console.log("💰 Receipt amount changed:", e.target.value);
                setReceiptAmount(+e.target.value);
              }}
            />
            {showFullPaymentButton && (
              <button
                className="full-pay-btn"
                onClick={() => {
                  console.log("🔄 Full payment button clicked");
                  setReceiptAmount(grandTotal);
                }}
              >
                Full Payment
              </button>
            )}
          </div>
          <div className="summary">
            Mode: <strong>{paymentMode}</strong> | Amount: ₹{receiptAmount.toFixed(2)}
          </div>
        </>
      )}
    </div>

    {/* ─── Actions ─── */}
    <div className="voucher-actions">
      <button className="save-btn" onClick={() => {
        console.log("💾 Saving invoice");
        handleSaveInvoice();
      }}>
        Save Invoice
      </button>
      <button className="view-btn" onClick={() => {
        console.log("🔍 View invoice clicked");
        handleViewInvoiceClick();
      }}>
        View Invoice
      </button>
    </div>

   {showInvoicePreview && lastInvoiceData && (
  <div className="erp-modal-overlay" onClick={() => setShowInvoicePreview(false)}>
    <div className="erp-modal-container" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2 className="modal-title">Invoice Preview</h2>
        <button className="modal-close" onClick={() => setShowInvoicePreview(false)}>✕</button>
      </div>
      <div className="modal-body">
        <InvoiceTemplate
          invoiceData={lastInvoiceData}
          onClose={() => setShowInvoicePreview(false)}
          selectedCompanyId={selectedCompanyId}
          onPrint={() => window.print()}
        />
      </div>
    </div>
  </div>
)}


    {/* ─── Inventory Modal ─── */}
    {showInventoryModal && (
      <div
        className="erp-modal-overlay"
        onClick={() => {
          console.log("🛑 Inventory modal backdrop clicked.");
          setShowInventoryModal(false);
          setModalOpenedForItem(null);
        }}
      >
        <div
          className="erp-modal-container"
          onClick={e => {
            e.stopPropagation();
            console.log("🛑 Click inside modal, not closing.");
          }}
        >
          <div className="modal-header">
            <h2 className="modal-title">Add Inventory Item</h2>
            <button
              className="modal-close"
              onClick={() => {
                console.log("❌ Modal close button clicked.");
                setShowInventoryModal(false);
                setModalOpenedForItem(null);
              }}
            >
              ✕
            </button>
          </div>
          <div className="modal-body">
            <InventoryForm
              companyId={companyId}
              initialName={prefillItemName}
              onClose={() => {
                console.log("✅ InventoryForm onClose called.");
                setShowInventoryModal(false);
                setModalOpenedForItem(null);
              }}
              onSave={newItem => {
                console.log("📦 InventoryForm onSave:", newItem);
                setShowInventoryModal(false);
                setModalOpenedForItem(null);
              }}
            />
          </div>
        </div>
      </div>
    )}

    {/* ─── Customer Modal ─── */}
    {showCustomerForm && (
      <div
        className="erp-modal-overlay"
        onClick={() => {
          console.log("🛑 Modal backdrop clicked, closing CustomerForm");
          setShowCustomerForm(false);
        }}
      >
        <div
          className="erp-modal-container"
          onClick={e => {
            e.stopPropagation();
            console.log("🛑 Click inside CustomerForm modal");
          }}
        >
          <div className="modal-header">
            <h2 className="modal-title">New Customer</h2>
            <button
              className="modal-close"
              onClick={() => {
                console.log("❌ CustomerForm modal close clicked");
                setShowCustomerForm(false);
              }}
            >
              ✕
            </button>
          </div>
          <div className="modal-body">
            <CustomerForm
              initialName={prefillCustomerName}
              onClose={() => {
                console.log("✅ CustomerForm onClose called");
                setShowCustomerForm(false);
              }}
              onCustomerSaved={customerObj => {
                console.log("✅ CustomerForm onSave:", customerObj);
                setCustomer(customerObj);
                setShowCustomerForm(false);
              }}
            />
          </div>
        </div>
      </div>
    )}
  </div>
);

  
};

export default SalesVoucherForm;
