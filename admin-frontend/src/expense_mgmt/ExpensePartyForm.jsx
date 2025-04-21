// ✅ ExpensePartyForm.jsx - Modal popup form to add a new Expense Party
import React, { useState } from 'react';

const ExpensePartyForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    account_name: 'Direct Expense',
    name: '',
    created_on: new Date().toISOString().split('T')[0],
    outstanding_balance: 0,
    gst_applicable: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const companyId = localStorage.getItem('selectedCompanyId');
    const token = localStorage.getItem('accessToken');

    if (!companyId || !token) {
      alert('❌ Company ID or token missing');
      return;
    }

    try {
      const res = await fetch(`http://localhost:8000/api/expenses/party/create/${companyId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error();

      alert('✅ Expense party created successfully.');
      onClose();
    } catch (err) {
      console.error('❌ Error saving expense party:', err);
      alert('❌ Failed to save expense party.');
    }
  };

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '500px', fontFamily: 'Arial, sans-serif', boxShadow: '0 16px 32px rgba(0,0,0,0.25)' }}>
      <h2 style={{ color: '#003366', marginBottom: '20px', textAlign: 'center' }}>➕ Add Expense Party</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '14px' }}>
          <label><strong>Account Name:</strong></label>
          <input type="text" name="account_name" value={formData.account_name} readOnly style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f5f5f5' }} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label><strong>Party Name:</strong></label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label><strong>Date of Creation:</strong></label>
          <input type="date" name="created_on" value={formData.created_on} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label><strong>Outstanding Balance (₹):</strong></label>
          <input type="number" name="outstanding_balance" value={formData.outstanding_balance} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label><strong>GST Applicable:</strong></label>
          <input type="checkbox" name="gst_applicable" checked={formData.gst_applicable} onChange={handleChange} style={{ marginLeft: '10px' }} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', marginRight: '10px' }}>Save</button>
          <button type="button" onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#ccc', border: 'none', borderRadius: '6px' }}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default ExpensePartyForm;
