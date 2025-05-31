import React, { useState, useEffect, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import axios from 'axios'

const PurchaseOrderForm = ({ onClose, companyId }) => {
  const [supplier, setSupplier] = useState('')
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [supplierList, setSupplierList] = useState([])
  const [filteredSuppliers, setFilteredSuppliers] = useState([])
  const [items, setItems] = useState([
    { description: '', qty: 1, rate: 0, gst: 18, notes: '' }
  ])
  const componentRef = useRef()

  useEffect(() => {
    // Fetch suppliers
    const token = localStorage.getItem('accessToken')
    
      axios.get(`http://localhost:8000/api/suppliers/list/${companyId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setSupplierList(res.data.map(s => s.name)))
      .catch(() => {})
  }, [companyId])

  const handleItemChange = (i, field, val) => {
    const arr = [...items]
    arr[i][field] = ['qty','rate','gst'].includes(field)
      ? parseFloat(val) || 0
      : val
    setItems(arr)
  }
  const addItem = () =>
    setItems([...items, { description: '', qty: 1, rate: 0, gst: 18, notes: '' }])
  const removeItem = i => setItems(items.filter((_, j) => j !== i))

  const totalAmount = items.reduce((sum, it) => {
    const base = it.qty * it.rate
    return sum + base + (base * it.gst) / 100
  }, 0)

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: 'PurchaseOrder'
  })

 const handleSave = async () => {
  // 1) Basic validations
  if (!supplier.trim()) {
    alert('Please enter or select a supplier')
    return
  }
  if (items.length === 0) {
    alert('Add at least one item')
    return
  }

  // 2) Transform items into serializer‐expected shape
  const payloadItems = items.map(it => {
    const base = it.qty * it.rate
    const gstAmount = (base * it.gst) / 100
    return {
      description: it.description,
      amount: base,        // line amount before GST
      gst_amount: gstAmount,
      notes: it.notes
    }
  })
  console.log('🔃 [PO] Transformed items →', payloadItems)

  // 3) Build final payload
  const payload = {
    company: companyId,
    date: orderDate,
    reference: `Purchase Order to ${supplier}`,
    supplier: supplier,
    items: payloadItems
  }
  console.log('🔃 [PO] Final payload →', payload)

  // 4) POST to the correct endpoint
  try {
    const token = localStorage.getItem('accessToken')
    const res = await axios.post(
      `http://localhost:8000/api/vouchers/purchase-orders/${companyId}/create/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    console.log('✅ [PO] Save response →', res.data)
    const num = res.data.order_number || res.data.id
    alert(`✅ Purchase order saved. Number: ${num}`)
    onClose()
  } catch (err) {
    console.error('❌ [PO] Axios error →', err)
    console.error('❌ [PO] Response data →', err.response?.data)
    console.error('❌ [PO] Response status →', err.response?.status)
    alert('❌ Failed to save purchase order. See console for details.')
  }
}


  return (
    <div style={{ maxWidth: 1100, margin: '20px auto', padding: 24, background: '#fff', borderRadius: 12, position: 'relative' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'transparent', fontSize: 20 }}>✖</button>
      <div ref={componentRef}>
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>📦 Purchase Order</h2>

        {/* Supplier */}
        <div style={{ marginBottom: 20 }}>
          <label>Supplier:</label>
          <input
            type="text"
            value={supplier}
            onChange={e => {
              const v = e.target.value
              setSupplier(v)
              setFilteredSuppliers(
                supplierList.filter(s => s.toLowerCase().includes(v.toLowerCase()))
              )
            }}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
          />
          {filteredSuppliers.length > 0 && (
            <ul style={{ border: '1px solid #ccc', borderRadius: 6, maxHeight: 120, overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none' }}>
              {filteredSuppliers.map((s, i) => (
                <li
                  key={i}
                  onMouseDown={() => { setSupplier(s); setFilteredSuppliers([]) }}
                  style={{ padding: 8, cursor: 'pointer' }}
                >
                  {s}
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
            value={orderDate}
            onChange={e => setOrderDate(e.target.value)}
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
          />
        </div>

        {/* Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: 8 }}>Description</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Qty</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Rate</th>
              <th style={{ padding: 8, textAlign: 'right' }}>GST%</th>
              <th style={{ padding: 8 }}>Notes</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Total</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const base = it.qty * it.rate
              const rowTotal = base + (base * it.gst) / 100
              return (
                <tr key={idx}>
                  <td style={{ padding: 8 }}>
                    <input value={it.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} style={{ width: '100%', padding: 6 }} />
                  </td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    <input type="number" value={it.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} style={{ width: 60, padding: 6, textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    <input type="number" value={it.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} style={{ width: 80, padding: 6, textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    <input type="number" value={it.gst} onChange={e => handleItemChange(idx, 'gst', e.target.value)} style={{ width: 60, padding: 6, textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: 8 }}>
                    <input value={it.notes} onChange={e => handleItemChange(idx, 'notes', e.target.value)} style={{ width: '100%', padding: 6 }} />
                  </td>
                  <td style={{ padding: 8, textAlign: 'right' }}>₹{rowTotal.toFixed(2)}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>
                    <button onClick={() => removeItem(idx)} style={{ background: 'transparent', border: 'none', color: 'red' }}>✖</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <button onClick={addItem} style={{ marginBottom: 20, width: '100%', background: '#003366', color: '#fff', padding: 12, border: 'none', borderRadius: 6 }}>
          + Add Item
        </button>

        {/* Actions */}
        <div style={{ textAlign: 'right', marginBottom: 20 }}>
          <strong>Total: ₹{totalAmount.toFixed(2)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          <button onClick={handleSave} style={{ background: '#28a745', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: 8 }}>
            Save Purchase Order
          </button>
          <button onClick={handlePrint} style={{ background: '#007bff', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: 8 }}>
            Print
          </button>
        </div>
      </div>
    </div>
)
}
export default PurchaseOrderForm
