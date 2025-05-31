// src/vouchers/IncomeVoucherForm.jsx

import React, { useState, useEffect, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import axios from 'axios'

const IncomeVoucherForm = ({ onClose }) => {
  
  const companyId = Number(localStorage.getItem('activeCompanyId'))
  console.log('🏢 [IncomeVoucherForm] companyId:', companyId)


  const componentRef = useRef()

  // ─── Party (Customer) Dropdown ─────────────────────────────────────
  const [party, setParty] = useState('')
  const [partyLedger, setPartyLedger] = useState(null)
  const [ledgerList, setLedgerList] = useState([])
  const [filteredLedgers, setFilteredLedgers] = useState([])
  const [showPartyDropdown, setShowPartyDropdown] = useState(false)

  // ─── Income Type ───────────────────────────────────────────────────
  const [incomeType, setIncomeType] = useState('DIRECT')

  // ─── GST Toggle & Lookup ───────────────────────────────────────────
  const [includeGst, setIncludeGst] = useState(false)
  const [gstNumber, setGstNumber] = useState('')
  const [gstDetails, setGstDetails] = useState(null)

  // ─── Date ───────────────────────────────────────────────────────────
  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  // ─── Line Items ─────────────────────────────────────────────────────
  const [items, setItems] = useState([
    { description: '', amount: 0, gst: 0, notes: '' }
  ])
  const handleItemChange = (i, field, val) => {
    const arr = [...items]
    if (field === 'amount' || field === 'gst') {
      arr[i][field] = parseFloat(val) || 0
    } else {
      arr[i][field] = val
    }
    setItems(arr)
  }
  const addItem = () =>
    setItems([...items, { description: '', amount: 0, gst: 0, notes: '' }])
  const removeItem = i => setItems(items.filter((_, j) => j !== i))

  // ─── Totals ─────────────────────────────────────────────────────────
  const totalAmount = items.reduce((s, it) => s + it.amount, 0)
  const totalGst = includeGst
    ? items.reduce((s, it) => s + (it.amount * it.gst) / 100, 0)
    : 0
  const grandTotal = totalAmount + totalGst

  // ─── “Mark as Paid” ─────────────────────────────────────────────────
  const [paidNow, setPaidNow] = useState(false)
  const [paymentMode, setPaymentMode] = useState('cash')
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [showFullPaymentButton, setShowFullPaymentButton] = useState(false)

  // ─── Fetch Parties ───────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    console.log('🔄 [Income] Fetching ledgers...')
    axios
      .get(`http://127.0.0.1:8000/api/accounting/ledger/list/${companyId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        console.log('✅ [Income] Raw ledgers:', res.data)
        const parties = res.data.filter(
          l => l.is_customer || l.nature === 'Asset'
        )
        setLedgerList(parties)
        setFilteredLedgers(parties)
      })
      .catch(err => console.error('❌ [Income] Ledger fetch error:', err))
  }, [companyId])

  // ─── GST Lookup ─────────────────────────────────────────────────────
  useEffect(() => {
    if (includeGst && gstNumber.length >= 15) {
      axios
        .get(`/api/vendor/gst-details/${gstNumber}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        })
        .then(res => {
          setGstDetails(res.data)
          if (res.data.name) setParty(res.data.name)
        })
        .catch(() => setGstDetails(null))
    }
  }, [includeGst, gstNumber])

  // ─── Save Handler ───────────────────────────────────────────────────
  const handleSave = async () => {
  const token = localStorage.getItem('accessToken');
  if (!companyId || !token) {
    alert('Missing company ID or not authenticated');
    return;
  }

  // 1) Create Income Voucher
  const incomePayload = {
    company:      companyId,
    date:         voucherDate,
    voucher_type: 'INCOME',
    reference:    `Income from ${party}`,
    notes:        '',
    income_type:  incomeType,
    ...(includeGst && {
      gst_number: gstNumber,
      gst_amount: parseFloat(totalGst.toFixed(2)),
    }),
    items: items.map(it => ({
      description: it.description,
      amount:      it.amount,
      gst:         includeGst ? parseFloat(it.gst) : 0,
      notes:       it.notes,
    })),
  };

  console.log('🔃 Sending Income Payload:', incomePayload);

  try {
    // a) POST Income voucher
    console.log('📦 Creating Income voucher payload:', incomePayload);
    const incRes = await axios.post(
      `http://localhost:8000/api/vouchers/income/${companyId}/create/`,
      incomePayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✅ Income saved:', incRes.data);
    alert(`✅ Income saved. Voucher No: ${incRes.data.voucher_number}`);

    // 2) Optionally create Receipt Voucher
    if (paidNow && paymentMode && paymentAmount > 0) {
      console.log(`💰 Creating Receipt for ₹${paymentAmount} via ${paymentMode}...`);

      // a) Ensure sales ledgers
      const ledgersRes = await axios.post(
        `http://localhost:8000/api/vouchers/ensure-sales-ledgers/${companyId}/`,
        { name: party },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const { sales_ledger_id, party_ledger_id } = ledgersRes.data;
      console.log('🧾 Receipt ledgers:', ledgersRes.data);

      // b) Build Receipt payload
      const receiptPayload = {
        company:      companyId,
        date:         voucherDate,
        voucher_type: 'RECEIPT',
        reference:    `Receipt from ${party}`,
        payment_mode: paymentMode,
        entries: [
          { ledger: party_ledger_id, is_debit: true,  amount: paymentAmount },
          {
            ledger: paymentMode === 'cash' ? party_ledger_id : sales_ledger_id,
            is_debit: false,
            amount: paymentAmount,
          },
        ],
      };
      console.log('📑 Receipt payload:', receiptPayload);

      // c) POST Receipt voucher
      const recRes = await axios.post(
        `http://localhost:8000/api/vouchers/receipt/${companyId}/create/`,
        receiptPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('✅ Receipt saved:', recRes.data);
      alert(`✅ Receipt saved. Voucher No: ${recRes.data.voucher_number}`);
    }

    // 3) Close form
    onClose();
  } catch (err) {
    console.error('❌ Save error:', err.response?.data || err);
    alert('❌ Failed to save income/receipt. See console for details.');
  }
};


  const handlePrint = useReactToPrint({ content: () => componentRef.current })

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '20px auto',
        padding: 20,
        background: '#fff',
        borderRadius: 12,
        position: 'relative'
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          border: 'none',
          background: 'transparent',
          fontSize: 20
        }}
      >
        ✖
      </button>

      <div ref={componentRef}>
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>
          💰 Income Voucher
        </h2>

        {/* Party Selector */}
        <div style={{ marginBottom: 20 }}>
          <label>Party (Customer):</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={party}
              placeholder="Start typing..."
              onChange={e => {
                setParty(e.target.value)
                setFilteredLedgers(
                  ledgerList.filter(l =>
                    l.name.toLowerCase().includes(e.target.value.toLowerCase())
                  )
                )
                setShowPartyDropdown(true)
              }}
              onFocus={() => {
                setFilteredLedgers(ledgerList)
                setShowPartyDropdown(true)
              }}
              onBlur={() => setTimeout(() => setShowPartyDropdown(false), 150)}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 6,
                border: '1px solid #ccc'
              }}
            />
            {showPartyDropdown && filteredLedgers.length > 0 && (
              <ul
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#fff',
                  border: '1px solid #ccc',
                  maxHeight: 140,
                  overflowY: 'auto',
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  zIndex: 1000
                }}
              >
                {filteredLedgers.map((l, i) => (
                  <li
                    key={i}
                    onMouseDown={() => {
                      console.log('👆 [Income] Selected party:', l)
                      setParty(l.name)
                      setPartyLedger(l)
                      setShowPartyDropdown(false)
                    }}
                    style={{ padding: 8, cursor: 'pointer' }}
                  >
                    {l.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Income Type */}
        <div style={{ marginBottom: 20 }}>
          <label>Income Type:</label>
          <select
            value={incomeType}
            onChange={e => setIncomeType(e.target.value)}
            style={{ marginLeft: 8, padding: 8 }}
          >
            <option value="DIRECT">Direct Income</option>
            <option value="INDIRECT">Indirect Income</option>
          </select>
        </div>

        {/* GST Toggle */}
        <div style={{ marginBottom: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={includeGst}
              onChange={e => setIncludeGst(e.target.checked)}
            />{' '}
            Include GST
          </label>
          {includeGst && (
            <input
              type="text"
              placeholder="GST Number"
              value={gstNumber}
              onChange={e => setGstNumber(e.target.value)}
              style={{ marginLeft: 8, padding: 8 }}
            />
          )}
          {gstDetails && (
            <span style={{ marginLeft: 12, fontStyle: 'italic' }}>
              Vendor: {gstDetails.name}
            </span>
          )}
        </div>

        {/* Line-Items Table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: 20
          }}
        >
          <thead>
            <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
              <th style={{ padding: 12 }}>Description</th>
              <th style={{ padding: 12, textAlign: 'right' }}>Amount</th>
              <th style={{ padding: 12, textAlign: 'right' }}>GST%</th>
              <th style={{ padding: 12, textAlign: 'right' }}>Total</th>
              <th style={{ padding: 12 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const gstAmt = parseFloat((it.amount * it.gst / 100).toFixed(2))
              const total = parseFloat((it.amount + gstAmt).toFixed(2))
              return (
                <tr key={idx}>
                  <td style={{ padding: 8 }}>
                    <textarea
                      rows={2}
                      value={it.description}
                      onChange={e =>
                        handleItemChange(idx, 'description', e.target.value)
                      }
                      style={{ width: '100%', padding: 8, resize: 'vertical' }}
                    />
                  </td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    <input
                      type="number"
                      value={it.amount}
                      onChange={e =>
                        handleItemChange(idx, 'amount', e.target.value)
                      }
                      style={{ width: 80, padding: 8, textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    <input
                      type="number"
                      value={it.gst}
                      onChange={e =>
                        handleItemChange(idx, 'gst', e.target.value)
                      }
                      style={{ width: 80, padding: 8, textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    {total.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => removeItem(idx)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'red',
                        cursor: 'pointer'
                      }}
                    >
                      ✖
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <button
          onClick={addItem}
          style={{
            width: '100%',
            background: '#003366',
            color: '#fff',
            padding: 12,
            border: 'none',
            borderRadius: 6,
            marginBottom: 20,
            cursor: 'pointer'
          }}
        >
          + Add Item
        </button>

        {/* Totals */}
        <div style={{ textAlign: 'right', marginBottom: 20 }}>
          <div>
            <strong>Net: ₹{totalAmount.toFixed(2)}</strong>
          </div>
          <div>
            <strong>GST: ₹{totalGst.toFixed(2)}</strong>
          </div>
          <div>
            <strong>Grand Total: ₹{grandTotal.toFixed(2)}</strong>
          </div>
        </div>

        {/* Save & Print */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 20
          }}
        >
          <button
            onClick={handleSave}
            style={{
              background: '#28a745',
              color: '#fff',
              padding: '12px 28px',
              border: 'none',
              borderRadius: 8
            }}
          >
            Save Income
          </button>
          <button
            onClick={handlePrint}
            style={{
              background: '#007bff',
              color: '#fff',
              padding: '12px 28px',
              border: 'none',
              borderRadius: 8
            }}
          >
            Print / PDF
          </button>
        </div>

        {/* Paid Now */}
        <div style={{ borderTop: '1px solid #ddd', paddingTop: 20 }}>
          {!paidNow ? (
            <button
              onClick={() => {
                setPaidNow(true)
                setShowFullPaymentButton(true)
              }}
              style={{
                width: '100%',
                background: '#28a745',
                color: '#fff',
                padding: 12,
                border: 'none',
                borderRadius: 8
              }}
            >
              Mark as Paid
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <button
                  onClick={() => setPaymentMode('cash')}
                  style={{
                    background: paymentMode === 'cash' ? '#4caf50' : '#ccc',
                    color: '#fff',
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: 4
                  }}
                >
                  💵 Cash
                </button>
                <button
                  onClick={() => setPaymentMode('bank')}
                  style={{
                    background: paymentMode === 'bank' ? '#2196f3' : '#ccc',
                    color: '#fff',
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: 4
                  }}
                >
                  🏦 Bank
                </button>
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong>Amount Paid:</strong>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  style={{ marginLeft: 10, padding: 4, width: 120 }}
                />
                {showFullPaymentButton && (
                  <button onClick={() => setPaymentAmount(grandTotal)} style={{ marginLeft: 10 }}>
                    Full Payment
                  </button>
                )}
              </div>
              <div>
                Mode: <strong>{paymentMode}</strong> | ₹{paymentAmount.toFixed(2)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default IncomeVoucherForm
