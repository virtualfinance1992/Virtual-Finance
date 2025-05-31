import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import SupplierForm from '../supplier_mgmt/SupplierForm';
import InventoryForm from '../inventory_mgmt/InventoryForm';
import axios from 'axios'; // if you prefer axios over fetch


const PurchaseVoucherForm = ({ onClose, companyId }) => {
  // ── Header fields ─────────────────────────────────────────────────────────
  const [supplier, setSupplier] = useState('');
  const [account] = useState('Purchase');
  const [purchaseNumber] = useState('AUTO-GENERATED');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  // ── Supplier autocomplete ─────────────────────────────────────────────────
  const [supplierList, setSupplierList] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);

  // ── Inventory & items ────────────────────────────────────────────────────
  const [inventoryList, setInventoryList] = useState([]);
  const [items, setItems] = useState([
    { description: '', unit: '', qty: 1, rate: 0, discount: 0, gst: 18, notes: '' }
  ]);
  // per-row dropdown visibility & filtered arrays
  const [dropdownStates, setDropdownStates] = useState({});
  const [filteredInventories, setFilteredInventories] = useState({});

  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [modalOpenedForItem, setModalOpenedForItem] = useState(null);
  const [prefillItemName, setPrefillItemName] = useState('');

  const componentRef = useRef();
  // ── Add these inside your component, before handleSave ──
  const [paidNow,      setPaidNow]      = useState(false);
  const [paymentMode,  setPaymentMode]  = useState('');   // e.g. 'cash' or 'bank'
  const [paymentAmount,setPaymentAmount]= useState(0);
  
  
  
  const [showFullPaymentButton, setShowFullPaymentButton] = useState(false);



  // ── Fetch suppliers + inventory on mount ─────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!companyId) return;

    const fetchAll = async () => {
      try {
        // inventory
        const invRes = await fetch(
          `http://localhost:8000/api/inventory/items/${companyId}/`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const invData = await invRes.json();
        setInventoryList(Array.isArray(invData) ? invData : []);
        console.log('✅ Inventory loaded:', invData);

        // suppliers
        const supRes = await fetch(
          `http://localhost:8000/api/suppliers/list/${companyId}/`, // ✅ corrected path
          
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const supData = await supRes.json();
        setSupplierList(supData.map(s => s.name));
        console.log('✅ Suppliers loaded:', supData.map(s => s.name));
      } catch (err) {
        console.error('❌ Error loading data:', err);
      }
    };

    fetchAll();
  }, [companyId]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleItemChange = (index, field, value) => {
    console.log(`🔧 [Row ${index}] Field "${field}" →`, value);
    const updated = [...items];

    // numeric parsing
    if (['qty','rate','gst','discount'].includes(field)) {
      value = isNaN(value) ? 0 : parseFloat(value);
    }

    if (field === 'description') {
      // filter dropdown as you type
      const filtered = inventoryList.filter(i =>
        i.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredInventories(f => ({ ...f, [index]: filtered }));
      setDropdownStates(s => ({ ...s, [index]: value.length >= 2 }));

      // immediate prompt if nothing matches after 3 chars
      if (value.trim().length > 2 && filtered.length === 0 && modalOpenedForItem !== value.toLowerCase()) {
        console.warn(`⚠️ No match for "${value}"`);
        if (window.confirm(`⚠️ "${value}" not found. Add it to inventory?`)) {
          setPrefillItemName(value);
          setShowInventoryModal(true);
          setModalOpenedForItem(value.toLowerCase());
        }
      }

      // exact-match autofill
      const match = inventoryList.find(i =>
        i.name.toLowerCase() === value.toLowerCase()
      );
      if (match) {
        console.log('✅ Matched inventory:', match);
        updated[index] = {
          ...updated[index],
          description: match.name,
          rate: match.rate,
          unit: match.unit,
          gst: match.gst_rate || 0,
          notes: match.description || ''
        };
      } else {
        updated[index].description = value;
      }
    } else {
      updated[index][field] = value;
    }

    setItems(updated);
  };

  const addItem = () =>
    setItems([...items, { description:'',unit:'',qty:1,rate:0,discount:0,gst:18,notes:'' }]);
  const removeItem = idx =>
    setItems(items.filter((_,i) => i!==idx));

  // ── Totals ────────────────────────────────────────────────────────────────
  const calculate = (fn) =>
    items.reduce((sum, item) => fn(sum, item), 0);
  
  const total      = calculate((s, i) => s + (i.qty * i.rate - i.discount));
  const totalDisc  = calculate((s, i) => s + i.discount);
  const totalGST   = calculate((s, i) => s + ((i.qty * i.rate - i.discount) * i.gst / 100));
  const grandTotal = total + totalGST;
  

  // ── Print/Save ────────────────────────────────────────────────────────────
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Purchase_${purchaseNumber}`
  });

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    console.log('📦 Saving Purchase Voucher...');
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('🔐 Please log in first.');
      return;
    }
  
    // ── Step 0: Ensure we have the right ledger IDs ───────────────────
    console.log('🔄 Step 0: Fetching/Creating ledgers for Purchase/Payment...');
    let purchaseLedgers;
    try {
      const ledgersRes = await fetch(
        `http://localhost:8000/api/vouchers/ensure-payment-ledgers/${companyId}/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: supplier })
        }
      );
      if (!ledgersRes.ok) throw new Error(await ledgersRes.text());
      purchaseLedgers = await ledgersRes.json();
      console.log('✅ Got ledger IDs:', purchaseLedgers);
      // purchaseLedgers = {
      //   purchase_ledger_id: 12,
      //   gst_ledger_id: 34,
      //   supplier_ledger_id: 56
      // }
    } catch (err) {
      console.error('❌ Failed to fetch ledgers:', err);
      alert('⚠️ Could not determine ledgers — aborting.');
      return;
    }
  
    // ── Step 1: Build & submit Purchase voucher ───────────────────────
    const payload = {
      company: companyId,
      date: purchaseDate,
      voucher_type: 'PURCHASE',
      reference: `Purchase from ${supplier}`,
      notes: '',
      entries: [
        // debit your expense (net of GST)
        {
          ledger: purchaseLedgers.purchase_ledger_id,
          is_debit: true,
          amount: total.toFixed(2)
        },
        // debit GST Input
        {
          ledger: purchaseLedgers.gst_ledger_id,
          is_debit: true,
          amount: totalGST.toFixed(2)
        },
        // credit Accounts Payable (supplier) for full amount
        {
          ledger: purchaseLedgers.supplier_ledger_id,
          is_debit: false,
          amount: grandTotal.toFixed(2)
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
      })),
    };
    console.log("📦 Step 3 Complete: Final payload ready:", payload);
  
    try {
      const res = await fetch(
        `http://localhost:8000/api/vouchers/purchase/${companyId}/create/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      console.log('✅ Purchase saved:', result);
      alert(`✅ Purchase saved. Voucher No: ${result.voucher_number}`);
  
      // ── Step 2: Optionally create Payment voucher ───────────────────
      if (paidNow && paymentMode && paymentAmount > 0) {
        console.log(`💰 Creating Payment for ₹${paymentAmount} via ${paymentMode}...`);
        const paymentPayload = {
          company: companyId,
          date: purchaseDate,
          voucher_type: 'PAYMENT',
          reference: `Payment to ${supplier}`,
          notes: '',
          payment_mode: paymentMode,
          entries: [
            {
              ledger: purchaseLedgers.supplier_ledger_id,
              is_debit: true,
              amount: paymentAmount
            },
            {
              ledger: purchaseLedgers.supplier_ledger_id,
              is_debit: false,
              amount: paymentAmount
            }
          ]
        };
        console.log('📑 Payment payload:', paymentPayload);
  
        try {
          const payRes = await fetch(
            `http://localhost:8000/api/vouchers/payment/${companyId}/create/`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(paymentPayload)
            }
          );
          if (!payRes.ok) throw new Error(await payRes.text());
          const payResult = await payRes.json();
          console.log('✅ Payment saved:', payResult);
          alert(`✅ Payment saved. Voucher No: ${payResult.voucher_number}`);
        } catch (payErr) {
          console.error('❌ Payment creation failed:', payErr);
          alert('⚠️ Purchase saved, but payment creation failed.');
        }
      }
  
      onClose();
    } catch (e) {
      console.error('❌ Save error:', e);
      alert('❌ Failed to save purchase voucher.');
    }
  };
  

  return (
    <div
      style={{
        maxWidth:'1400px', margin:'0 auto', padding:'40px',
        background:'#fff', borderRadius:'16px',
        boxShadow:'0 0 24px rgba(0,0,0,0.2)',
        fontFamily:'Arial, sans-serif', position:'relative'
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position:'absolute', top:16, right:16,
          background:'transparent', border:'none',
          fontSize:'20px', cursor:'pointer'
        }}
      >✖</button>

      <div ref={componentRef}>
        <h2 style={{ textAlign:'center', color:'#003366', marginBottom:'24px' }}>
          🧾 Purchase Voucher
        </h2>

        {/* Supplier + Date */}
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'30px', gap:'20px' }}>
          {/* Supplier field */}
          <div style={{ flex:1 }}>
            <label style={{ fontWeight:'bold' }}>Supplier:</label>
            <div style={{ display:'flex', gap:'10px' }}>
              <div style={{ position:'relative', width:'100%' }}>
                <input
                  type="text"
                  value={supplier}
                  onChange={e => {
                    const v = e.target.value;
                    console.log('🖊️ Supplier input:', v);
                    setSupplier(v);
                    setFilteredSuppliers(
                      supplierList.filter(s=>s.toLowerCase().includes(v.toLowerCase()))
                    );
                    setShowSupplierDropdown(true);
                  }}
                  onBlur={()=> setTimeout(()=>setShowSupplierDropdown(false),150)}
                  placeholder="Enter or select supplier"
                  style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc' }}
                />
                {showSupplierDropdown && filteredSuppliers.length>0 && (
                  <ul style={{
                    position:'absolute', top:'100%', left:0, right:0,
                    backgroundColor:'white', border:'1px solid #ccc',
                    borderTop:'none', zIndex:1000, maxHeight:'160px',
                    overflowY:'auto', margin:0, padding:0, listStyle:'none'
                  }}>
                    {filteredSuppliers.map((s,i)=>(
                      <li
                        key={i}
                        onMouseDown={()=> setSupplier(s)}
                        style={{ padding:'10px', cursor:'pointer', borderBottom:'1px solid #eee' }}
                      >{s}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={()=> setShowSupplierForm(true)}
                style={{
                  padding:'10px 14px', borderRadius:'6px',
                  background:'#28a745', color:'#fff', border:'none',
                  cursor:'pointer'
                }}
              >+ New Supplier</button>
            </div>
            <div style={{ marginTop:'20px' }}>
              <label style={{ fontWeight:'bold' }}>Account:</label>
              <input
                type="text"
                value={account}
                readOnly
                style={{
                  width:'100%', padding:'10px', borderRadius:'6px',
                  background:'#f5f5f5', border:'1px solid #ccc', marginTop:'6px'
                }}
              />
            </div>
          </div>

          {/* Purchase # and Date */}
          <div style={{ textAlign:'right' }}>
            <label style={{ fontWeight:'bold' }}>Purchase #:</label><br/>
            <input
              type="text"
              value={purchaseNumber}
              readOnly
              style={{
                padding:'10px', borderRadius:'6px',
                border:'1px solid #ccc', width:'220px',
                backgroundColor:'#f9f9f9', marginBottom:'16px'
              }}
            /><br/>
            <label style={{ fontWeight:'bold' }}>Date:</label><br/>
            <input
              type="date"
              value={purchaseDate}
              onChange={e=>setPurchaseDate(e.target.value)}
              style={{
                padding:'10px', borderRadius:'6px',
                border:'1px solid #ccc'
              }}
            />
          </div>
        </div>

        {/* Items table */}
        <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'30px' }}>
          <thead>
            <tr style={{ backgroundColor:'#f0f0f0', textAlign:'left' }}>
              {['Item / Service','Unit','Qty','Rate/Unit (₹)','Discount (₹)','GST %','Notes','Amount (₹)',''].map((h,i)=>(
                <th key={i} style={{ padding:'12px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item,index)=> {
              const net = item.qty * item.rate - item.discount;
              const totalWithGST = net + (net * item.gst)/100;
              return (
              <tr key={index}>
                {/* Description + dropdown + +Add */}
                <td>
                  <div style={{
                    display:'flex', alignItems:'center', gap:'4px', position:'relative', width:'100%'
                  }}
                    onMouseEnter={()=>{
                      if(item.description.length>=2)
                        setDropdownStates(s=>({...s, [index]:true}));
                    }}
                    onMouseLeave={()=>{
                      setTimeout(()=>{
                        setDropdownStates(s=>({...s, [index]:false}));
                      },150);
                    }}
                  >
                    <div style={{ flexGrow:1, position:'relative' }}>
                      <input
                        type="text"
                        value={item.description}
                        onChange={e=>{
                          const v=e.target.value;
                          handleItemChange(index,'description',v);
                        }}
                        onBlur={()=>{
                          setTimeout(()=>{
                            setDropdownStates(s=>({...s,[index]:false}));
                          },150);
                        }}
                        placeholder="Enter or select product/service"
                        style={{
                          width:'100%', padding:'10px', fontSize:'14px',
                          borderRadius:'4px', border:'1px solid #ccc'
                        }}
                      />
                      {dropdownStates[index] && filteredInventories[index]?.length>0 && (
                        <ul style={{
                          position:'absolute', top:'100%', left:0, right:0,
                          backgroundColor:'white', border:'1px solid #ccc',
                          zIndex:1000, maxHeight:'180px', overflowY:'auto',
                          listStyle:'none', padding:0, margin:0
                        }}>
                          {filteredInventories[index].map((inv,i2)=>(
                            <li
                              key={i2}
                              onMouseDown={()=>{
                                handleItemChange(index,'description',inv.name);
                                setDropdownStates(s=>({...s,[index]:false}));
                              }}
                              style={{
                                padding:'8px 12px', cursor:'pointer',
                                borderBottom:'1px solid #eee'
                              }}
                            >{inv.name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      onClick={()=>{
                        setPrefillItemName(item.description);
                        setShowInventoryModal(true);
                      }}
                      title="Add new product/service"
                      style={{
                        padding:'4px 8px', fontSize:'12px',
                        height:'36px', borderRadius:'4px',
                        background:'#007bff', color:'#fff',
                        border:'none', cursor:'pointer'
                      }}
                    >+ Add</button>
                  </div>
                </td>

                {/* Other columns */}
                <td>
                  <input
                    type="text"
                    value={item.unit}
                    onChange={e=>handleItemChange(index,'unit',e.target.value)}
                    style={{ width:'70px', padding:'8px' }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={item.qty}
                    onChange={e=>handleItemChange(index,'qty',e.target.value)}
                    style={{ width:'70px', padding:'8px' }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={item.rate}
                    onChange={e=>handleItemChange(index,'rate',e.target.value)}
                    style={{ width:'100px', padding:'8px' }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={item.discount}
                    onChange={e=>handleItemChange(index,'discount',e.target.value)}
                    style={{ width:'100px', padding:'8px' }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={item.gst}
                    onChange={e=>handleItemChange(index,'gst',e.target.value)}
                    style={{ width:'70px', padding:'8px' }}
                  />
                </td>
                <td>
                  <textarea
                    value={item.notes}
                    onChange={e=>handleItemChange(index,'notes',e.target.value)}
                    placeholder="Description or Remarks"
                    rows={2}
                    style={{ width:'100%', padding:'6px' }}
                  />
                </td>
                <td style={{ textAlign:'right' }}>
                  {totalWithGST.toFixed(2)}
                </td>
                <td>
                  <button
                    onClick={()=>removeItem(index)}
                    style={{
                      color:'red', fontWeight:'bold',
                      border:'none', background:'transparent',
                      cursor:'pointer'
                    }}
                  >✖</button>
                </td>
              </tr>
            );})}
          </tbody>
        </table>

        {/* + Add Item */}
        <button
          onClick={addItem}
          style={{
            marginBottom:'20px',
            backgroundColor:'#003366',
            color:'#fff',
            padding:'10px 18px',
            border:'none',
            borderRadius:'6px',
            cursor:'pointer'
          }}
        >+ Add Item</button>

        {/* Totals */}
        <div style={{ textAlign:'right', marginTop:'30px' }}>
          <p><strong>Total Discount:</strong> ₹{totalDisc.toFixed(2)}</p>
          <p><strong>GST Amount:</strong> ₹{totalGST.toFixed(2)}</p>
          <h3 style={{ color:'#003366', marginTop:'12px' }}>
            Grand Total: ₹{grandTotal.toFixed(2)}
          </h3>
        </div>


        <div style={{ marginTop: '30px', padding: '20px', borderTop: '1px solid #ccc' }}>
  <h3>💸 Payment Made Now?</h3>

  {!paidNow && (
    <button
      onClick={() => {
        setPaidNow(true);
        setShowFullPaymentButton(true);
      }}
      style={{
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '5px'
      }}
    >
      Mark as Paid Now
    </button>
  )}

  {paidNow && (
    <div style={{ marginTop: '15px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
        <button
          onClick={() => setPaymentMode('cash')}
          style={{
            backgroundColor: paymentMode === 'cash' ? '#28a745' : '#ccc',
            color: '#fff',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          💵 Cash
        </button>
        <button
          onClick={() => setPaymentMode('bank')}
          style={{
            backgroundColor: paymentMode === 'bank' ? '#007bff' : '#ccc',
            color: '#fff',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          🏦 Bank
        </button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label><strong>Amount Paid:</strong></label>
        <input
          type="number"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
          style={{ marginLeft: '10px', padding: '8px', width: '160px' }}
        />
        {showFullPaymentButton && (
          <button
            onClick={() => setPaymentAmount(grandTotal)}
            style={{
              marginLeft: '12px',
              backgroundColor: '#ffc107',
              color: '#000',
              padding: '8px 14px',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            🔄 Full Payment
          </button>
        )}
      </div>

      <p style={{ color: 'gray' }}>
        Mode: <strong>{paymentMode || 'Not selected'}</strong> | Amount: ₹{paymentAmount.toFixed(2)}
      </p>
    </div>
  )}
</div>


        {/* Actions */}
        <div style={{ textAlign:'center', marginTop:'40px' }}>
          <button
            onClick={handleSave}
            style={{
              padding:'12px 28px',
              backgroundColor:'#28a745',
              color:'#fff',
              border:'none',
              borderRadius:'8px',
              fontSize:'16px',
              marginRight:'12px',
              cursor:'pointer'
            }}
            
          >Save Purchase</button>
          <button
            onClick={handlePrint}
            style={{
              padding:'12px 28px',
              backgroundColor:'#007bff',
              color:'#fff',
              border:'none',
              borderRadius:'8px',
              fontSize:'16px',
              cursor:'pointer'
            }}
          >Print / Save PDF</button>
        </div>
      </div>

      {/* Supplier modal */}
      {showSupplierForm && (
        <div
          style={{
            position:'fixed', top:0, left:0, width:'100vw', height:'100vh',
            backgroundColor:'rgba(0,0,0,0.5)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:9999, cursor:'pointer'
          }}
          onClick={()=>setShowSupplierForm(false)}
        >
          <div onClick={e=>e.stopPropagation()}>
            <SupplierForm onClose={()=>setShowSupplierForm(false)} />
          </div>
        </div>
      )}

      {/* Inventory modal */}
      {showInventoryModal && (
        <div
          style={{
            position:'fixed', top:0, left:0, width:'100vw', height:'100vh',
            backgroundColor:'rgba(0,0,0,0.5)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:9999, cursor:'pointer'
          }}
          onClick={()=>setShowInventoryModal(false)}
        >
          <div onClick={e=>e.stopPropagation()}>
            <InventoryForm
              companyId={companyId}
              initialName={prefillItemName}
              onClose={()=>setShowInventoryModal(false)}
              onSave={newItem=>{
                console.log('📦 Inventory added:', newItem);
                setInventoryList(list=>[...list,newItem]);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseVoucherForm;
