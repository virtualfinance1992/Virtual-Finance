import React, { useState } from 'react';

const SupplierForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    pan_number: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const companyId = localStorage.getItem('selectedCompanyId');
    const token = localStorage.getItem('accessToken');

    if (!companyId || !token) {
      alert("⚠️ Company ID or token missing.");
      return;
    }

    try {
      const res = await fetch(`http://localhost:8000/api/suppliers/create/${companyId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to save supplier');

      alert('✅ Supplier saved successfully');
      onClose();
    } catch (error) {
      console.error('❌ Error saving supplier:', error);
      alert('❌ Failed to save supplier.');
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        padding: '24px',
        borderRadius: '12px',
        width: '600px',
        boxShadow: '0 16px 32px rgba(0, 0, 0, 0.25)',
        fontFamily: 'Arial, sans-serif',
      }}
      onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
    >
      <h2 style={{ marginBottom: '20px', color: '#003366', textAlign: 'center' }}>Add New Supplier</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontWeight: 'bold' }}>Supplier Name:</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontWeight: 'bold' }}>Phone:</label>
          <input type="text" name="phone" value={formData.phone} onChange={handleChange}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontWeight: 'bold' }}>Email:</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontWeight: 'bold' }}>Address:</label>
          <textarea name="address" value={formData.address} onChange={handleChange} rows="2"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontWeight: 'bold' }}>GST Number:</label>
          <input type="text" name="gst_number" value={formData.gst_number} onChange={handleChange}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: 'bold' }}>PAN Number:</label>
          <input type="text" name="pan_number" value={formData.pan_number} onChange={handleChange}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px' }}>
            Save
          </button>
          <button type="button" onClick={onClose} style={{ padding: '12px 24px', backgroundColor: '#ccc', border: 'none', borderRadius: '6px' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupplierForm;
