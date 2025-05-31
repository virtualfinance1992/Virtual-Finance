// 📘 ReceiptVoucherForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import axios from 'axios';

const ReceiptVoucherForm = ({ onClose, companyId }) => {
  // customer dropdown
  const [customer, setCustomer] = useState('');
  const [customerLedger, setCustomerLedger] = useState(null);
  const [customerList, setCustomerList] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // payment account dropdown
  const [ledgerList, setLedgerList] = useState([]);
  const [filteredLedgers, setFilteredLedgers] = useState([]);
  const [showLedgerDropdown, setShowLedgerDropdown] = useState(false);
  const [paymentLedgerId, setPaymentLedgerId] = useState(null);
  const [paymentMode, setPaymentMode] = useState('');

  // form fields
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isAgainstSale, setIsAgainstSale] = useState(false);

  // unpaid sales to apply against
  const [unpaidVouchers, setUnpaidVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  const componentRef = useRef();

  // ─── fetch all ledgers once ────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    console.log('🔄 Fetching all ledgers for dropdowns...');
    axios.get(`http://127.0.0.1:8000/api/accounting/ledger/list/${companyId}/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      console.log('✅ Raw ledgers:', res.data);
      // customers = is_customer or any Asset
      const custs = res.data.filter(l => l.is_customer || l.nature === 'Asset');
      console.log('👥 Customer candidates:', custs);
      setCustomerList(custs);
      setFilteredCustomers(custs);
      // payments = cash/bank
      const pays = res.data.filter(l =>
        l.group_name.toLowerCase().includes('cash') ||
        l.group_name.toLowerCase().includes('bank')
      );
      console.log('🏦 Payment account candidates:', pays);
      setLedgerList(pays);
      setFilteredLedgers(pays);
    })
    .catch(err => console.error('❌ Fetch error:', err));
  }, [companyId]);

  // ─── fetch unpaid sales when customer or toggle changes ─────────────────────
  useEffect(() => {
    if (!customerLedger) return;
    const type = 'SALES';
    console.log(`🔄 Fetching ALL unpaid ${type} vouchers for customer ${customerLedger.id}`);
    axios.get(
      `http://127.0.0.1:8000/api/reports/${companyId}/customer-unpaid/`,
      {
        params: { voucher_type: type, customer_id: customerLedger.id },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      }
    )
    .then(res => {
      console.log('✅ Unpaid sales vouchers:', res.data);
      setUnpaidVouchers(res.data);
    })
    .catch(err => console.error('❌ Error fetching unpaid vouchers:', err));
  }, [companyId, customerLedger, isAgainstSale]);

  // ─── when user picks one, default amount to its outstanding ───────────────
  const handleVoucherSelect = id => {
    const v = unpaidVouchers.find(u => u.id === +id);
    console.log('👆 Selected unpaid voucher:', v);
    setSelectedVoucher(v);
    setAmount(v.outstanding);
  };

  // ─── Save Receipt ───────────────────────────────────────────────────────────
  const handleSaveReceipt = async () => {
    if (!customerLedger) return alert('Select a customer first');
    if (!paymentLedgerId) return alert('Select a Cash/Bank account');
    if (!amount || amount <= 0) return alert('Enter a valid receipt amount');

    const payload = {
      company: companyId,
      date: voucherDate,
      reference: `Receipt from ${customerLedger.name}`,
      payment_mode: paymentMode,
      entries: [
        { ledger: paymentLedgerId, is_debit: true,  amount },
        { ledger: customerLedger.id, is_debit: false, amount }
      ],
      notes,
      against_sale: isAgainstSale,
      ...(selectedVoucher && { against_voucher: selectedVoucher.id })
    };
    console.log('🔃 Sending Receipt Payload:', payload);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/vouchers/receipt/${companyId}/create/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(payload)
        }
      );
      if (!res.ok) {
        console.error('❌ Save error payload:', await res.text());
        return alert('❌ Failed to save receipt.');
      }
      const data = await res.json();
      console.log('✅ Receipt saved:', data);
      alert(`✅ Receipt recorded! Voucher No: ${data.voucher_number}`);
      onClose();
    } catch (err) {
      console.error('🔥 Unexpected error:', err);
      alert('❌ Failed to save receipt.');
    }
  };

  const handlePrint = useReactToPrint({ content: () => componentRef.current });

  return (
    <div style={{
      maxWidth:'800px', margin:'0 auto', padding:'32px',
      background:'#fff', borderRadius:'16px',
      boxShadow:'0 0 16px rgba(0,0,0,0.2)', position:'relative'
    }}>
      <button onClick={onClose}
        style={{
          position:'absolute', top:16, right:16,
          background:'transparent', border:'none', fontSize:'20px'
        }}>✖</button>
      <div ref={componentRef}>
        <h2 style={{
          textAlign:'center', marginBottom:'24px', color:'#003366'
        }}>💰 Receipt Voucher</h2>

        {/* Customer dropdown */}
        <div style={{ marginBottom:'20px' }}>
          <label>Customer:</label>
          <div style={{ position:'relative' }}>
            <input
              type="text"
              value={customer}
              placeholder="Start typing customer name..."
              onChange={e => {
                const v = e.target.value;
                setCustomer(v);
                setFilteredCustomers(
                  customerList.filter(l => l.name.toLowerCase().includes(v.toLowerCase()))
                );
                setShowCustomerDropdown(true);
              }}
              onFocus={()=>{ setFilteredCustomers(customerList); setShowCustomerDropdown(true) }}
              onBlur={()=>setTimeout(()=>setShowCustomerDropdown(false),150)}
              style={{
                width:'100%', padding:'10px',
                borderRadius:'6px', border:'1px solid #ccc'
              }}
            />
            {showCustomerDropdown && filteredCustomers.length>0 && (
              <ul style={{
                position:'absolute', top:'100%', left:0, right:0,
                background:'#fff', border:'1px solid #ccc',
                zIndex:1000, maxHeight:'140px', overflowY:'auto',
                listStyle:'none', margin:0, padding:0
              }}>
                {filteredCustomers.map((l,i)=>(
                  <li key={i}
                      onMouseDown={()=> {
                        console.log('👆 Selected customer ledger:', l);
                        setCustomer(l.name);
                        setCustomerLedger(l);
                        setShowCustomerDropdown(false);
                        setSelectedVoucher(null);
                        setAmount(0);
                      }}
                      style={{ padding:'8px', cursor:'pointer' }}
                  >{l.name}</li>
                ))}
              </ul>
            )}
          </div>
          {customerLedger && (
            <div style={{ marginTop:'8px', fontStyle:'italic' }}>
              Balance: ₹{customerLedger.net_balance.toFixed(2)} ({customerLedger.balance_type})
            </div>
          )}
        </div>

        {/* Date */}
        <div style={{ marginBottom:'20px' }}>
          <label>Date:</label>
          <input type="date"
            value={voucherDate}
            onChange={e=>setVoucherDate(e.target.value)}
            style={{
              width:'auto', padding:'8px',
              borderRadius:'6px', border:'1px solid #ccc'
            }}
          />
        </div>

        {/* Payment acct */}
        <div style={{ marginBottom:'20px' }}>
          <label>Payment Account (Cash/Bank):</label>
          <div style={{ position:'relative' }}>
            <input
              type="text"
              value={paymentMode}
              placeholder="Select cash or bank account"
              readOnly
              onClick={()=>setShowLedgerDropdown(true)}
              style={{
                width:'100%', padding:'10px',
                borderRadius:'6px', border:'1px solid #ccc',
                background:'#fafafa'
              }}
            />
            {showLedgerDropdown && filteredLedgers.length>0 && (
              <ul style={{
                position:'absolute', top:'100%', left:0, right:0,
                background:'#fff', border:'1px solid #ccc',
                zIndex:1000, maxHeight:'140px', overflowY:'auto',
                listStyle:'none', margin:0, padding:0
              }}>
                {filteredLedgers.map((l,i)=>(
                  <li key={i}
                      onMouseDown={()=> {
                        const mode = l.group_name.toLowerCase().includes('cash')
                          ? 'cash' : 'bank';
                        console.log('👆 Selected payment ledger:', l, 'mode=', mode);
                        setPaymentLedgerId(l.id);
                        setPaymentMode(mode);
                        setShowLedgerDropdown(false);
                      }}
                      style={{ padding:'8px', cursor:'pointer' }}
                  >{l.name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Against Sale */}
        <div style={{ marginBottom:'20px' }}>
          <label>
            <input type="checkbox"
                   checked={isAgainstSale}
                   onChange={e=>setIsAgainstSale(e.target.checked)}
                   style={{ marginRight:'8px' }}
            />
            Against Sale
          </label>
        </div>

        {/* Unpaid sales dropdown */}
        {customerLedger && unpaidVouchers.length>0 && (
          <div style={{ marginBottom:'20px' }}>
            <label>Apply Against:</label>
            <select
              value={selectedVoucher?.id||''}
              onChange={e=>handleVoucherSelect(e.target.value)}
              style={{
                width:'100%', padding:'10px',
                borderRadius:'6px', border:'1px solid #ccc'
              }}
            >
              <option value="">-- select voucher --</option>
              {unpaidVouchers.map(u=>(
                <option key={u.id} value={u.id}>
                  [{u.voucher_type}] {u.voucher_number} — ₹{u.outstanding.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Amount & Notes */}
        <div style={{ marginBottom:'20px' }}>
          <label>Amount:</label>
          <input type="number"
            value={amount}
            onChange={e=>setAmount(parseFloat(e.target.value)||0)}
            style={{
              width:'100%', padding:'10px',
              borderRadius:'6px', border:'1px solid #ccc'
            }}
          />
        </div>
        <div style={{ marginBottom:'30px' }}>
          <label>Notes:</label>
          <textarea rows={3}
            value={notes}
            onChange={e=>setNotes(e.target.value)}
            style={{
              width:'100%', padding:'10px',
              borderRadius:'6px', border:'1px solid #ccc'
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ textAlign:'center' }}>
          <button onClick={handleSaveReceipt}
                  style={{
                    padding:'10px 24px', backgroundColor:'#003366',
                    color:'#fff', border:'none', borderRadius:'6px',
                    marginRight:'10px'
                  }}>
            Save Receipt
          </button>
          <button onClick={handlePrint}
                  style={{
                    padding:'10px 24px', backgroundColor:'#007bff',
                    color:'#fff', border:'none', borderRadius:'6px'
                  }}>
            Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptVoucherForm;
