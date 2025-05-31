// src/vouchers/CreditNoteForm.jsx

import React, { useState, useEffect } from 'react'
import axios from 'axios'

const CreditNoteForm = ({ companyId, onClose }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [reference, setReference] = useState('')
  const [ledgerList, setLedgerList] = useState([])
  const [filtered, setFiltered] = useState([[], []])
  const [openIdx, setOpenIdx] = useState(null)
  const [lines, setLines] = useState([
    // For credit note, line-1 is Credit, line-2 is Debit
    { ledger: null, is_debit: false, amount: '' },
    { ledger: null, is_debit: true,  amount: '' }
  ])

  // Fetch all ledgers once
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    axios
      .get(
        `http://localhost:8000/api/accounting/ledger/list/${companyId}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(res => {
        setLedgerList(res.data)
        setFiltered([res.data, res.data])
      })
      .catch(console.error)
  }, [companyId])

  // Update a line in our two-row table
  const updateLine = (i, field, val) => {
    const copy = [...lines]
    if (field === 'amount') {
      copy[i][field] = val.replace(/[^\d.]/g, '')
    } else {
      copy[i][field] = val
    }
    setLines(copy)
  }

  // Save the credit note
  const handleSave = async () => {
    const [cr, dr] = lines
    if (!cr.ledger || !dr.ledger) {
      return alert('Please select both accounts.')
    }
    if (!cr.amount || !dr.amount) {
      return alert('Please enter both amounts.')
    }
    if (parseFloat(cr.amount) !== parseFloat(dr.amount)) {
      return alert('Amounts must match.')
    }
    if (!(cr.is_debit === false && dr.is_debit === true)) {
      return alert('Line 1 must be Credit, Line 2 Debit.')
    }

    const payload = {
      company: companyId,
      date,
      reference,
      voucher_type: 'CREDIT_NOTE',
      entries: [
        {
          ledger: cr.ledger.id,
          is_debit: cr.is_debit,
          amount: parseFloat(cr.amount)
        },
        {
          ledger: dr.ledger.id,
          is_debit: dr.is_debit,
          amount: parseFloat(dr.amount)
        }
      ]
    }
    console.log('🔃 [CreditNote] Payload →', payload)

    try {
      const token = localStorage.getItem('accessToken')
      const res = await axios.post(
        `http://localhost:8000/api/vouchers/credit-note/${companyId}/create/`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      console.log('✅ [CreditNote] Response →', res.data)
      alert(`✅ Credit Note ${res.data.voucher_number} created`)
      onClose()
    } catch (err) {
      console.error(err.response?.data || err)
      alert('❌ Failed to save credit note.')
    }
  }

  // Inline styling (same as DebitNoteForm)
  const styles = {
    modal: {
      maxWidth: 500,
      margin: '40px auto',
      padding: 20,
      background: '#fff',
      borderRadius: 8,
      position: 'relative',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    close: {
      position: 'absolute',
      top: 16,
      right: 16,
      border: 'none',
      background: 'transparent',
      fontSize: 18,
      cursor: 'pointer'
    },
    label: { display: 'block', marginTop: 12, fontWeight: 500 },
    input: {
      width: '100%',
      padding: 8,
      marginTop: 4,
      border: '1px solid #ccc',
      borderRadius: 4,
      boxSizing: 'border-box'
    },
    table: { width: '100%', borderCollapse: 'collapse', margin: '16px 0' },
    thtd: { padding: 8, borderBottom: '1px solid #eee' },
    ledgerCell: { position: 'relative' },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      background: '#fff',
      border: '1px solid #ccc',
      maxHeight: 120,
      overflowY: 'auto',
      zIndex: 10,
      listStyle: 'none',
      margin: 0,
      padding: 0
    },
    dropdownItem: { padding: '6px 8px', cursor: 'pointer' },
    save: {
      width: '100%',
      padding: 10,
      marginTop: 8,
      background: '#007bff',
      color: '#fff',
      border: 'none',
      borderRadius: 4,
      fontSize: 16,
      cursor: 'pointer'
    }
  }

  return (
    <div style={styles.modal}>
      <button style={styles.close} onClick={onClose}>✖</button>
      <h3>📄 Credit Note</h3>

      <label style={styles.label}>Date</label>
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        style={styles.input}
      />

      <label style={styles.label}>Reference</label>
      <input
        type="text"
        value={reference}
        onChange={e => setReference(e.target.value)}
        placeholder="Credit note ref"
        style={styles.input}
      />

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.thtd}>Account</th>
            <th style={styles.thtd}>Cr/Dr</th>
            <th style={styles.thtd}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((ln, i) => (
            <tr key={i}>
              <td style={{ ...styles.thtd, ...styles.ledgerCell }}>
                <input
                  type="text"
                  placeholder="Search..."
                  value={ln.ledger?.name || ''}
                  onChange={e => {
                    updateLine(i, 'ledger', null)
                    const txt = e.target.value.toLowerCase()
                    setFiltered(prev => {
                      const nxt = [...prev]
                      nxt[i] = ledgerList.filter(l =>
                        l.name.toLowerCase().includes(txt)
                      )
                      return nxt
                    })
                    setOpenIdx(i)
                  }}
                  onBlur={() => setTimeout(() => setOpenIdx(null), 150)}
                  style={styles.input}
                />
                {openIdx === i && (
                  <ul style={styles.dropdown}>
                    {filtered[i].map((l, j) => (
                      <li
                        key={j}
                        style={styles.dropdownItem}
                        onMouseDown={() => updateLine(i, 'ledger', l)}
                      >
                        {l.name}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td style={styles.thtd}>
                <select
                  value={ln.is_debit ? 'Dr' : 'Cr'}
                  onChange={e =>
                    updateLine(i, 'is_debit', e.target.value === 'Dr')
                  }
                  style={styles.input}
                >
                  <option>Cr</option>
                  <option>Dr</option>
                </select>
              </td>
              <td style={styles.thtd}>
                <input
                  type="text"
                  value={ln.amount}
                  placeholder="0.00"
                  onChange={e => updateLine(i, 'amount', e.target.value)}
                  style={styles.input}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button style={styles.save} onClick={handleSave}>
        Save Credit Note
      </button>
    </div>
  )
}

export default CreditNoteForm
