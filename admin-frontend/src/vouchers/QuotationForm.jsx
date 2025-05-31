import React, { useState, useEffect, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import axios from 'axios'

const QuotationForm = ({ onClose, companyId }) => {
  const [customer, setCustomer] = useState('')
  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [customerList, setCustomerList] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [items, setItems] = useState([{ name: '', quantity: 1, rate: 0, notes: '' }])
  const [notes, setNotes] = useState('')
  const componentRef = useRef()

  useEffect(() => {
    // Fetch existing customers
    const token = localStorage.getItem('accessToken')
    axios
      .get(`http://localhost:8000/api/customers/${companyId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setCustomerList(res.data.map(c => c.name)))
      .catch(() => {})
  }, [companyId])

  const handleItemChange = (index, field, value) => {
    const arr = [...items]
    arr[index][field] =
      field === 'quantity' || field === 'rate' ? parseFloat(value) || 0 : value
    setItems(arr)
  }
  const addItem = () => setItems([...items, { name: '', quantity: 1, rate: 0, notes: '' }])
  const removeItem = i => setItems(items.filter((_, j) => j !== i))

  const totalAmount = items.reduce((sum, it) => sum + it.quantity * it.rate, 0)

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: 'Quotation'
  })

  const handleSave = async () => {
  if (!customer.trim()) {
    alert('Please enter or select a customer')
    return
  }
  if (items.length === 0) {
    alert('Add at least one item')
    return
  }

  // 1) Transform front-end items into serializer-expected shape
  const payloadItems = items.map(it => {
    const amount = it.quantity * it.rate
    return {
      description: it.name,
      amount: amount,
      gst: 0,         // adjust if you have a GST field
      notes: it.notes
    }
  })
  console.log('🔃 [Quotation] Transformed items →', payloadItems)

  // 2) Build the final payload
  const payload = {
    company: companyId,
    date: quotationDate,
    reference: `Quotation for ${customer}`,
    customer: customer,
    items: payloadItems
  }
  console.log('🔃 [Quotation] Final payload →', payload)

  try {
    const token = localStorage.getItem('accessToken')
    const res = await axios.post(
      `http://localhost:8000/api/vouchers/quotations/${companyId}/create/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    console.log('✅ [Quotation] Save response →', res.data)
    const num = res.data.quotation_number || res.data.id
    alert(`✅ Quotation saved. Number: ${num}`)
    onClose()
  } catch (err) {
    console.error('❌ [Quotation] Axios error →', err)
    console.error('❌ [Quotation] Response data →', err.response?.data)
    alert('❌ Failed to save quotation. See console for details.')
  }
}


  return (
    <div style={{ maxWidth: 900, margin: '20px auto', padding: 20, background: '#fff', borderRadius: 12, position: 'relative' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, fontSize: 20, background: 'transparent', border: 'none' }}>
        ✖
      </button>
      <div ref={componentRef}>
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>📄 Quotation</h2>

        {/* Customer */}
        <div style={{ marginBottom: 20 }}>
          <label>Customer:</label>
          <input
            type="text"
            value={customer}
            onChange={e => {
              const v = e.target.value
              setCustomer(v)
              setFilteredCustomers(customerList.filter(c => c.toLowerCase().includes(v.toLowerCase())))
            }}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
          />
          {filteredCustomers.length > 0 && (
            <ul style={{ border: '1px solid #ccc', borderRadius: 6, maxHeight: 120, overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none' }}>
              {filteredCustomers.map((c, i) => (
                <li key={i} onMouseDown={() => { setCustomer(c); setFilteredCustomers([]) }} style={{ padding: 8, cursor: 'pointer' }}>
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Date */}
        <div style={{ marginBottom: 20 }}>
          <label>Date:</label>
          <input
            type="date"
            value={quotationDate}
            onChange={e => setQuotationDate(e.target.value)}
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
          />
        </div>

        {/* Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: 8 }}>Item</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Qty</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Rate</th>
              <th style={{ padding: 8 }}>Notes</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td style={{ padding: 8 }}>
                  <input value={it.name} onChange={e => handleItemChange(idx, 'name', e.target.value)} style={{ width: '100%', padding: 6 }} />
                </td>
                <td style={{ padding: 8, textAlign: 'right' }}>
                  <input type="number" value={it.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} style={{ width: 60, padding: 6, textAlign: 'right' }} />
                </td>
                <td style={{ padding: 8, textAlign: 'right' }}>
                  <input type="number" value={it.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} style={{ width: 80, padding: 6, textAlign: 'right' }} />
                </td>
                <td style={{ padding: 8 }}>
                  <input value={it.notes} onChange={e => handleItemChange(idx, 'notes', e.target.value)} style={{ width: '100%', padding: 6 }} />
                </td>
                <td style={{ padding: 8, textAlign: 'center' }}>
                  <button onClick={() => removeItem(idx)} style={{ background: 'transparent', border: 'none', color: 'red' }}>✖</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addItem} style={{ marginBottom: 20, width: '100%', background: '#003366', color: '#fff', padding: 12, border: 'none', borderRadius: 6 }}>
          + Add Item
        </button>

        {/* Notes & Total */}
        <div style={{ marginBottom: 20 }}>
          <label>Notes:</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }} />
        </div>
        <div style={{ textAlign: 'right', marginBottom: 20 }}>
          <strong>Total: ₹{totalAmount.toFixed(2)}</strong>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          <button onClick={handleSave} style={{ background: '#28a745', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: 8 }}>
            Save Quotation
          </button>
          <button onClick={handlePrint} style={{ background: '#007bff', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: 8 }}>
            Print
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuotationForm
