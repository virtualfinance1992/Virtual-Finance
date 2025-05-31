// src/vouchers/JournalEntryForm.jsx
import React, { useState, useEffect } from 'react'
import axios from 'axios'

const JournalEntryForm = ({ companyId, onClose }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [ledgerList, setLedgerList] = useState([])
  const [filteredLedgers, setFilteredLedgers] = useState([[], []])
  const [openDropdown, setOpenDropdown] = useState(null)
  const [lines, setLines] = useState([
    { ledger: null, is_debit: true,  amount: '' },
    { ledger: null, is_debit: false, amount: '' }
  ])

  // fetch ledgers once
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    axios
      .get(`http://localhost:8000/api/accounting/ledger/list/${companyId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setLedgerList(res.data)
        // initialize filteredLedgers to full list for both rows
        setFilteredLedgers([res.data, res.data])
      })
      .catch(console.error)
  }, [companyId])

  // update a single line
  const updateLine = (idx, field, val) => {
    const updated = [...lines]
    if (field === 'amount') {
      // allow only digits+dot
      updated[idx][field] = val.replace(/[^\d.]/g, '')
    } else {
      updated[idx][field] = val
    }
    setLines(updated)
  }

  // build payload & send
  const handleSave = async () => {
    const [l1, l2] = lines
    // validations
    if (!l1.ledger || !l2.ledger) {
      return alert('Select both ledgers.')
    }
    if (!l1.amount || !l2.amount) {
      return alert('Enter both amounts.')
    }
    if (l1.is_debit === l2.is_debit) {
      return alert('One line must be Debit, the other Credit.')
    }
    if (parseFloat(l1.amount) !== parseFloat(l2.amount)) {
      return alert('Debit and Credit amounts must match.')
    }

    const payload = {
      company: companyId,
      date,
      reference: description,
      entries: lines.map(l => ({
        ledger: l.ledger.id,
        is_debit: l.is_debit,
        amount: parseFloat(l.amount)
      }))
    }
    console.log('🔃 [Journal] Payload →', payload)

    try {
      const token = localStorage.getItem('accessToken')
      const res = await axios.post(
        `http://localhost:8000/api/vouchers/journal/${companyId}/create/`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      console.log('✅ [Journal] Response →', res.data)
      alert(`✅ Journal entry #${res.data.voucher_number} created`)
      onClose()
    } catch (err) {
      console.error('❌ [Journal] Error →', err.response?.data || err)
      alert('❌ Failed to save. Check console.')
    }
  }

  return (
    <div className="journal-modal">
      <button className="close-btn" onClick={onClose}>✖</button>
      <h3 className="title">📝 Journal Entry</h3>

      <div className="field">
        <label>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div className="field">
        <label>Description</label>
        <input
          type="text"
          value={description}
          placeholder="Narration"
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      <table className="lines">
        <thead>
          <tr>
            <th>Ledger</th><th>Dr/Cr</th><th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((ln, i) => (
            <tr key={i}>
              <td className="ledger-cell">
                <input
                  type="text"
                  placeholder="Search ledger..."
                  value={ln.ledger?.name||''}
                  onChange={e => {
                    updateLine(i, 'ledger', null)
                    const txt = e.target.value.toLowerCase()
                    setFilteredLedgers(prev => {
                      const copy = [...prev]
                      copy[i] = ledgerList.filter(l=>l.name.toLowerCase().includes(txt))
                      return copy
                    })
                    setOpenDropdown(i)
                  }}
                  onBlur={()=>setTimeout(()=>setOpenDropdown(null),150)}
                />
                {openDropdown===i && (
                  <ul className="dropdown">
                    {filteredLedgers[i].map((l,j)=>(
                      <li key={j} onMouseDown={()=>updateLine(i,'ledger',l)}>
                        {l.name}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td>
                <select
                  value={ln.is_debit?'Dr':'Cr'}
                  onChange={e=>updateLine(i,'is_debit',e.target.value==='Dr')}
                >
                  <option>Dr</option>
                  <option>Cr</option>
                </select>
              </td>
              <td>
                <input
                  type="text"
                  placeholder="0.00"
                  value={ln.amount}
                  onChange={e=>updateLine(i,'amount',e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="save-btn" onClick={handleSave}>
        Save Journal Entry
      </button>

      <style jsx>{`
        .journal-modal {
          max-width: 500px; margin: 40px auto;
          padding: 20px; background: #fff; border-radius: 8px;
          position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .close-btn {
          position:absolute; top:12px; right:12px;
          background:transparent; border:none; font-size:18px; cursor:pointer;
        }
        .title { text-align:center; margin-bottom:20px; }
        .field { margin-bottom:16px; }
        .field label { display:block; margin-bottom:4px; font-weight:500 }
        .field input {
          width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;
        }
        .lines { width:100%; border-collapse:collapse; margin-bottom:16px; }
        .lines th, .lines td { padding:8px; border-bottom:1px solid #eee; }
        .ledger-cell { position:relative }
        .ledger-cell input {
          width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;
        }
        .dropdown {
          position:absolute; top:100%; left:0; right:0;
          background:#fff; border:1px solid #ccc;
          max-height:120px; overflow-y:auto; z-index:10; list-style:none; margin:0; padding:0;
        }
        .dropdown li {
          padding:6px 8px; cursor:pointer;
        }
        .dropdown li:hover { background:#f0f0f0; }
        .save-btn {
          width:100%; padding:10px; background:#28a745; color:#fff;
          border:none; border-radius:4px; font-size:16px; cursor:pointer;
        }
        .save-btn:hover { background:#218838 }
      `}</style>
    </div>
  )
}

export default JournalEntryForm
