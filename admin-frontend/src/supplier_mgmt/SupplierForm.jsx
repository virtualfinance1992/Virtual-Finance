import React, { useState, useEffect } from 'react';

const SupplierForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    pan_number: '',
  });

  const [companyId, setCompanyId] = useState(null);

  useEffect(() => {
    localStorage.getItem('selectedCompanyId');

    const storedCompanyId = localStorage.getItem('selectedCompanyId');
    const token = localStorage.getItem('accessToken');
    console.log("🏢 selectedCompanyId:", storedCompanyId);
    console.log("🔐 accessToken present:", !!token);
    setCompanyId(storedCompanyId);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`✏️ Input changed - ${name}:`, value);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('accessToken');

    if (!companyId || !token) {
      alert("⚠️ Company ID or token missing.");
      console.error("🚫 Submission blocked due to missing companyId/token");
      return;
    }

    try {
      console.log("📤 Submitting supplier data:", formData);
      const res = await fetch(`http://localhost:8000/api/suppliers/create/${companyId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("❌ API error:", data);
        alert(`❌ Failed to save supplier: ${data.error || 'Unknown error'}`);
        return;
      }

      console.log("✅ Supplier created successfully:", data);
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
      onClick={(e) => e.stopPropagation()}
    >
      <h2 style={{ marginBottom: '20px', color: '#003366', textAlign: 'center' }}>Add New Supplier</h2>

      <form onSubmit={handleSubmit}>
        {[
          { label: 'Supplier Name', name: 'name', type: 'text' },
          { label: 'Phone', name: 'phone', type: 'text' },
          { label: 'Email', name: 'email', type: 'email' },
          { label: 'GST Number', name: 'gst_number', type: 'text' },
          { label: 'PAN Number', name: 'pan_number', type: 'text' },
        ].map(({ label, name, type }) => (
          <div style={{ marginBottom: '14px' }} key={name}>
            <label style={{ fontWeight: 'bold' }}>{label}:</label>
            <input
              type={type}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              required={name === 'name'}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ccc',
              }}
            />
          </div>
        ))}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: 'bold' }}>Address:</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="2"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ccc',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <button
            type="submit"
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ccc',
              border: 'none',
              borderRadius: '6px',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupplierForm;
