// ✅ InventoryForm.jsx — Fixed companyId null issue and added safe logging
import React, { useState } from 'react';

const InventoryForm = ({ onClose, onSave, companyId ,initialName = ''}) => {
  const [formData, setFormData] = useState({
    name: initialName,  // 👈 will be filled from `prefillItemName`
    name: '', unit: '', rate: '', barcode: '', hsn_code: '',
    description: '', opening_quantity: '', opening_value: '',
    gst_applicable: false, gst_rate: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async () => {
    const { name, unit, rate, opening_quantity, opening_value } = formData;

    if (!name || !unit || !rate || !opening_quantity || !opening_value) {
      alert("❗ Please fill all required fields (Name, Unit, Rate, Opening Qty & Value)");
      return;
    }

    if (!companyId) {
      console.error("❌ Missing companyId prop — inventory cannot be saved");
      alert("❌ Cannot create inventory — Company ID missing");
      return;
    }

    const newItem = {
      ...formData,
      rate: parseFloat(formData.rate),
      opening_quantity: parseFloat(formData.opening_quantity),
      opening_value: parseFloat(formData.opening_value),
      gst_rate: formData.gst_applicable ? parseFloat(formData.gst_rate || 0) : 0
    };

    const token = localStorage.getItem("accessToken");

    try {
      console.log("📡 Sending inventory to backend for company:", companyId);
      console.log("📦 Payload:", newItem);

      const res = await fetch(`http://localhost:8000/api/inventory/items/create/${companyId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newItem)
      });

      const result = await res.json();

      if (!res.ok) {
        console.error("❌ Inventory creation failed:", result);
        alert(result.error || "Failed to create inventory item");
      } else {
        console.log("✅ Inventory item created on backend:", result);
        alert("✅ Inventory item created successfully!");
        onSave(result.item);
        onClose();
      }
    } catch (err) {
      console.error("🚨 Error calling inventory API:", err);
      alert("Server error occurred while creating inventory.");
    }
  };

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '460px' }}>
      <h3>Add New Product / Service</h3>

      <input name="name" placeholder="Item Name *" value={formData.name} onChange={handleChange} style={inputStyle} />
      <input name="unit" placeholder="Unit *" value={formData.unit} onChange={handleChange} style={inputStyle} />
      <input name="rate" type="number" placeholder="Rate *" value={formData.rate} onChange={handleChange} style={inputStyle} />
      <input name="barcode" placeholder="Barcode" value={formData.barcode} onChange={handleChange} style={inputStyle} />
      <input name="hsn_code" placeholder="HSN Code" value={formData.hsn_code} onChange={handleChange} style={inputStyle} />
      <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} rows={2} style={{ ...inputStyle, height: '60px' }} />

      <input name="opening_quantity" type="number" placeholder="Opening Quantity *" value={formData.opening_quantity} onChange={handleChange} style={inputStyle} />
      <input name="opening_value" type="number" placeholder="Opening Value *" value={formData.opening_value} onChange={handleChange} style={inputStyle} />

      <label style={{ display: 'block', margin: '10px 0 5px' }}>
        <input type="checkbox" name="gst_applicable" checked={formData.gst_applicable} onChange={handleChange} />
        &nbsp;GST Applicable
      </label>

      {formData.gst_applicable && (
        <input name="gst_rate" type="number" placeholder="GST Rate (%)" value={formData.gst_rate} onChange={handleChange} style={inputStyle} />
      )}

      <button onClick={handleSubmit} style={{ ...inputStyle, backgroundColor: '#28a745', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
        Save
      </button>
    </div>
  );
};

const inputStyle = {
  width: '100%',
  padding: '8px',
  marginBottom: '10px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  boxSizing: 'border-box'
};

export default InventoryForm;