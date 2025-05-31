// 📘 PaymentVoucherForm.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import axios from 'axios'
import SupplierForm from '../supplier_mgmt/SupplierForm'

const PaymentVoucherForm = ({ onClose, companyId }) => {
  console.log('🏢 [PaymentVoucherForm] companyId:', companyId)
  // ─── State ──────────────────────────────────────────────────────────────
  const [supplier, setSupplier] = useState('')
  const [supplierLedger, setSupplierLedger] = useState(null)
  const [creditorList, setCreditorList] = useState([])
  const [filteredCreditors, setFilteredCreditors] = useState([])
  const [showCreditorDropdown, setShowCreditorDropdown] = useState(false)

  const [ledgerList, setLedgerList] = useState([])
  const [filteredLedgers, setFilteredLedgers] = useState([])
  const [showLedgerDropdown, setShowLedgerDropdown] = useState(false)
  const [paymentLedgerId, setPaymentLedgerId] = useState(null)
  const [paymentMode, setPaymentMode] = useState('')  // "cash" or "bank"

  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [isAgainstPurchase, setIsAgainstPurchase] = useState(false)

  const [unpaidVouchers, setUnpaidVouchers]   = useState([])  // ← NEW
  const [selectedVoucher, setSelectedVoucher] = useState(null) // ← NEW

  const componentRef = useRef()
  const [showSupplierForm, setShowSupplierForm] = useState(false)


  // ─── Fetch all ledgers ────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    console.log('🔍 [PaymentVoucherForm] fetching ledgers for companyId=', companyId)
    console.log('🔄 Fetching all ledgers for dropdowns...')
    axios.get(`http://127.0.0.1:8000/api/accounting/ledger/list/${companyId}/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      console.log('✅ Raw ledgers:', res.data)
      // suppliers = either is_supplier or any Liability
      const creditors = res.data.filter(l => l.is_supplier || l.nature === 'Liability')
      setCreditorList(creditors)
      setFilteredCreditors(creditors)

      // payments = cash or bank
      const payments = res.data.filter(l =>
        l.group_name.toLowerCase().includes('cash') ||
        l.group_name.toLowerCase().includes('bank')
      )
      setLedgerList(payments)
      setFilteredLedgers(payments)
    })
    .catch(err => console.error('❌ Fetch error:', err))
  }, [companyId])

  // ─── Fetch unpaid vouchers when supplier or type toggles ────────────────
  useEffect(() => {
    if (!supplierLedger) return
    const type = isAgainstPurchase ? 'PURCHASE' : 'EXPENSE'
    console.log(`🔄 Fetching unpaid ${type} vouchers for supplier ${supplierLedger.id}`)
    axios.get(
      `http://127.0.0.1:8000/api/reports/${companyId}/supplier-unpaid/`,
      {
        params: { voucher_type: type, supplier_id: supplierLedger.id },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      }
    )
    .then(res => {
      console.log('✅ Unpaid vouchers:', res.data)
      setUnpaidVouchers(res.data)
    })
    .catch(err => console.error('❌ Error fetching unpaid vouchers:', err))
  }, [companyId, supplierLedger, isAgainstPurchase])

  // ─── Handle user selecting an unpaid voucher ─────────────────────────────
  const handleVoucherSelect = id => {
    const v = unpaidVouchers.find(u => u.id === +id)
    console.log('👆 Selected unpaid voucher:', v)
    setSelectedVoucher(v)
    setAmount(v.outstanding)
  }

  // ─── Save Payment ─────────────────────────────────────────────────────────
  const handleSavePayment = async () => {
    if (!supplierLedger)      return alert('Select a supplier first')
    if (!paymentLedgerId)     return alert('Select a Cash/Bank account')
    if (!amount || amount<=0) return alert('Enter a valid payment amount')

    const payload = {
      company: companyId,
      date: voucherDate,
      reference: `Payment to ${supplierLedger.name}`,
      payment_mode: paymentMode,    // "cash" or "bank"
      entries: [
        { ledger: supplierLedger.id, is_debit: true,  amount },
        { ledger: paymentLedgerId,    is_debit: false, amount }
      ],
      notes,
      against_purchase: isAgainstPurchase,
      ...(selectedVoucher && { against_voucher: selectedVoucher.id })
    }
    console.log('🔃 Sending Payment Payload:', payload)

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/vouchers/payment/${companyId}/create/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(payload)
        }
      )
      if (!res.ok) {
        console.error('❌ Save error payload:', await res.text())
        return alert('❌ Failed to save payment.')
      }
      const data = await res.json()
      console.log('✅ Payment saved:', data)
      alert(`✅ Payment recorded! Voucher No: ${data.voucher_number}`)

      // ← NEW: remove the paid voucher from the list
      if (selectedVoucher) {
        setUnpaidVouchers(prev => prev.filter(v => v.id !== selectedVoucher.id))
        console.log('🗑️ Removed paid voucher; remaining unpaid:', unpaidVouchers)
      }

      onClose()
    } catch (err) {
      console.error('🔥 Unexpected error:', err)
      alert('❌ Failed to save payment.')
    }
  }

  const handlePrint = useReactToPrint({ content: () => componentRef.current })

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      maxWidth:'800px', margin:'0 auto', padding:'32px',
      background:'#fff', borderRadius:'16px', boxShadow:'0 0 16px rgba(0,0,0,0.2)',
      position:'relative'
    }}>
      <button onClick={onClose}
              style={{
                position:'absolute', top:16, right:16,
                background:'transparent', border:'none', fontSize:'20px'
              }}>✖</button>

      <div ref={componentRef}>
        <h2 style={{
          textAlign:'center', marginBottom:'24px', color:'#003366'
        }}>💸 Payment Voucher</h2>

        {/* Supplier Dropdown */}
        <div style={{ marginBottom:'20px' }}>
          <label>Supplier (Creditor):</label>
          <div style={{ position:'relative' }}>
            <input
              type="text"
              value={supplier}
              placeholder="Start typing creditor name..."
              onChange={e => {
                const v = e.target.value
                setSupplier(v)
                setFilteredCreditors(creditorList.filter(l =>
                  l.name.toLowerCase().includes(v.toLowerCase())
                ))
                setShowCreditorDropdown(true)
              }}
              onFocus={() => {
                setFilteredCreditors(creditorList)
                setShowCreditorDropdown(true)
              }}
              onBlur={() => setTimeout(()=>setShowCreditorDropdown(false),150)}
              style={{
                width:'100%', padding:'10px', borderRadius:'6px',
                border:'1px solid #ccc'
              }}
            />
            {showCreditorDropdown && filteredCreditors.length>0 && (
              <ul style={{
                position:'absolute', top:'100%', left:0, right:0,
                background:'#fff', border:'1px solid #ccc', zIndex:1000,
                maxHeight:'140px', overflowY:'auto', listStyle:'none',
                margin:0, padding:0
              }}>
                {filteredCreditors.map((l,i)=>(
                  <li key={i}
                      onMouseDown={()=> {
                        console.log('👆 Selected supplier ledger:', l)
                        setSupplier(l.name)
                        setSupplierLedger(l)
                        setShowCreditorDropdown(false)
                        setSelectedVoucher(null)
                        setAmount(0)
                      }}
                      style={{ padding:'8px', cursor:'pointer' }}
                  >{l.name}</li>
                ))}
              </ul>
            )}
          </div>
          {/* Balance Display */}
          {supplierLedger && (
            <div style={{
              marginTop:'8px', fontStyle:'italic', color:'#555'
            }}>
              Balance: ₹{supplierLedger.net_balance.toFixed(2)} ({supplierLedger.balance_type})
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
                   width:'auto', padding:'8px', borderRadius:'6px',
                   border:'1px solid #ccc'
                 }}
          />
        </div>

        {/* Payment Account Dropdown */}
        <div style={{ marginBottom:'20px' }}>
          <label>Payment Account (Cash/Bank):</label>
          <div style={{ position:'relative' }}>
            <input
              type="text"
              value={paymentMode || ''}
              placeholder="Select cash or bank account"
              readOnly
              onClick={()=> setShowLedgerDropdown(true)}
              style={{
                width:'100%', padding:'10px', borderRadius:'6px',
                border:'1px solid #ccc', background:'#fafafa'
              }}
            />
            {showLedgerDropdown && filteredLedgers.length>0 && (
              <ul style={{
                position:'absolute', top:'100%', left:0, right:0,
                background:'#fff', border:'1px solid #ccc', zIndex:1000,
                maxHeight:'140px', overflowY:'auto', listStyle:'none',
                margin:0, padding:0
              }}>
                {filteredLedgers.map((l,i)=>(
                  <li key={i}
                      onMouseDown={()=> {
                        const mode = l.group_name.toLowerCase().includes('cash')
                          ? 'cash' : 'bank'
                        console.log('👆 Selected payment ledger:', l, 'mapped mode=', mode)
                        setPaymentLedgerId(l.id)
                        setPaymentMode(mode)
                        setShowLedgerDropdown(false)
                      }}
                      style={{ padding:'8px', cursor:'pointer' }}
                  >{l.name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Against Purchase Toggle */}
        <div style={{ marginBottom:'20px' }}>
          <label>
            <input
              type="checkbox"
              checked={isAgainstPurchase}
              onChange={e=>setIsAgainstPurchase(e.target.checked)}
              style={{ marginRight:'8px' }}
            />
            Against Purchase
          </label>
        </div>

        {/* Unpaid Voucher Dropdown */}
        {supplierLedger && unpaidVouchers.length>0 && (
          <div style={{ marginBottom:'20px' }}>
            <label>Apply Against:</label>
            <select
              value={selectedVoucher?.id||''}
              onChange={e=>handleVoucherSelect(e.target.value)}
              style={{
                width:'100%', padding:'10px', borderRadius:'6px',
                border:'1px solid #ccc'
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
          <input
            type="number"
            value={amount}
            onChange={e=>setAmount(parseFloat(e.target.value)||0)}
            style={{
              width:'100%', padding:'10px', borderRadius:'6px',
              border:'1px solid #ccc'
            }}
          />
        </div>
        <div style={{ marginBottom:'30px' }}>
          <label>Notes:</label>
          <textarea
            rows={3}
            value={notes}
            onChange={e=>setNotes(e.target.value)}
            style={{
              width:'100%', padding:'10px', borderRadius:'6px',
              border:'1px solid #ccc'
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ textAlign:'center' }}>
          <button onClick={handleSavePayment}
                  style={{
                    padding:'10px 24px', backgroundColor:'#003366',
                    color:'#fff', border:'none', borderRadius:'6px',
                    marginRight:'10px'
                  }}>
            Save Payment
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

      {/* + New Supplier Modal (if you trigger it) */}
      {showSupplierForm && (
        <div onClick={()=>setShowSupplierForm(false)} style={{
          position:'fixed', top:0, left:0, width:'100vw', height:'100vh',
          backgroundColor:'rgba(0,0,0,0.5)', display:'flex',
          alignItems:'center', justifyContent:'center', zIndex:9999
        }}>
          <div onClick={e=>e.stopPropagation()}>
            <SupplierForm onClose={()=>setShowSupplierForm(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentVoucherForm
