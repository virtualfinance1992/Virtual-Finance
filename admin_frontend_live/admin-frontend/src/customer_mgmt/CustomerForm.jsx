import React, { useState } from 'react';

const CustomerForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    gst: '',
    address: '',
    phone: '',
    email: '',
    opening_balance: '',
    balance_type: 'credit'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`📥 Input changed - ${name}:`, value);
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const token = localStorage.getItem('accessToken');
    const companyId = localStorage.getItem('activeCompanyId');
  
    console.log("🔐 Access Token from localStorage:", token);
    console.log("🏢 Company ID from localStorage:", companyId);
  
    if (!companyId) {
      alert("❌ Company ID not found in localStorage.");
      return;
    }
  
    const payload = {
      ...formData,
      company: companyId,
      opening_balance: parseFloat(formData.opening_balance || 0),
      balance_type: formData.balance_type
    };
  
    console.log("🚀 Submitting new customer to /api/customers/ with payload:", payload);
  
    try {
      const res = await fetch(`http://localhost:8000/api/customers/${companyId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
  
      if (!res.ok) {
        const errData = await res.json();
        console.error("❌ Backend returned error:", errData);
        alert(`❌ Error: ${errData.error || 'Could not create customer.'}`);
        return;
      }
  
      const result = await res.json();
      console.log("✅ Customer created:", result);
      alert("✅ Customer added successfully.");
      onClose();
    } catch (err) {
      console.error("❌ Error while saving customer:", err);
      alert("❌ Failed to create customer.");
    }
  };
  
  
  

  return (
    <div>
      <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>🧾 Add New Customer</h2>
      <form onSubmit={handleSubmit}>
        <label>Name:</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />

        <label>GST No:</label>
        <input type="text" name="gst" value={formData.gst} onChange={handleChange} style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />

        <label>Address:</label>
        <textarea name="address" value={formData.address} onChange={handleChange} rows="2" style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />

        <label>Phone:</label>
        <input type="text" name="phone" value={formData.phone} onChange={handleChange} style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />

        <label>Email:</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />

        {/* ✅ Opening Balance Section */}
        <label>Opening Balance:</label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <input
            type="number"
            name="opening_balance"
            value={formData.opening_balance}
            onChange={handleChange}
            placeholder="Amount"
            style={{ padding: '8px', width: '150px' }}
          />
          <select
            name="balance_type"
            value={formData.balance_type}
            onChange={handleChange}
            style={{ padding: '8px' }}
          >
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', marginRight: '10px' }}>
            Save
          </button>
          <button type="button" onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;
