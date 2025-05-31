import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './CompanyProfileModal.scss';

const CompanyProfileModal = ({ companyId, onClose }) => {
  const [formData, setFormData] = useState({
    company_name: '',
    pan_number: '',
    email: '',
    phone_number: '',
    address: '',
    gst_number: '',
    industry_type: '',
    website_url: '',
    account_name: '',
    account_number: '',
    bank_name: '',
    branch: '',
    ifsc_code: '',
    upi_id: '',
    logo: null,
    logo_url: '',
    qr_code: null,
    qr_code_url: '',
    signature: null,
    signature_url: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn("❌ No access token found in localStorage.");
      return;
    }

    const url = `http://localhost:8000/api/admin/company/${companyId}/`;
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        console.log("📦 Company fetched:", data);
        setFormData(prev => ({ ...prev, ...data }));
      })
      .catch(error => {
        console.error("❌ Error fetching company profile:", error);
      });
  }, [companyId]);

  const handleSubmit = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast.error("❌ Session expired. Please login again.");
      return;
    }

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if ((key === 'logo' || key === 'qr_code' || key === 'signature') && !value instanceof File) return;
      data.append(key, value);
    });

    try {
      const res = await fetch(`http://localhost:8000/api/admin/company/${companyId}/update-profile/`, {
        method: "PATCH",
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err));
      }

      toast.success("✅ Company profile updated!", { autoClose: 3000 });
      onClose();
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      console.error("❌ Failed to update profile:", err);
      toast.error("❌ Failed to update profile.");
    }
  };

  // ✅ Render image based on type (logo, qr_code, signature)
  const renderImage = (label, urlKey, fileKey) => {
    const file = formData[fileKey];
    const savedUrl = formData[urlKey];

    return (
      <>
        {typeof file === 'string' && savedUrl && (
          <div className="form-group">
            <label>Saved {label}</label>
            <img src={savedUrl} alt={label} style={{ width: '120px', border: '1px solid #ccc', marginTop: '10px' }} />
            <button
              type="button"
              className="remove-image-btn"
              onClick={() => setFormData(prev => ({ ...prev, [fileKey]: null }))}
            >
              ❌ Remove
            </button>
          </div>
        )}

        {file instanceof File && (
          <div className="form-group">
            <label>Preview (New {label})</label>
            <img src={URL.createObjectURL(file)} alt={`New ${label}`} style={{ width: '120px', border: '1px solid #ccc', marginTop: '10px' }} />
            <button
              type="button"
              className="remove-image-btn"
              onClick={() => setFormData(prev => ({ ...prev, [fileKey]: null }))}
            >
              ❌ Remove
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="company-profile-modal-overlay">
      <div className="company-profile-modal">
        <h2>Update Company Profile</h2>
        <form className="company-profile-form" onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
          {/* === Logo === */}
          <div className="form-group">
            <label>Company Logo</label>
            <input type="file" accept="image/*" onChange={(e) => setFormData({ ...formData, logo: e.target.files[0] })} />
            {renderImage("Logo", "logo", "logo")}
          </div>

          {/* === Text Fields === */}
          <div className="form-group"><label>Company Name</label><input type="text" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} /></div>
          <div className="form-group"><label>PAN Number</label><input type="text" value={formData.pan_number} onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })} /></div>
          <div className="form-group"><label>Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
          <div className="form-group"><label>Phone Number</label><input type="text" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} /></div>
          <div className="form-group"><label>Address</label><textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
          <div className="form-group"><label>GST Number</label><input type="text" value={formData.gst_number} onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })} /></div>
          <div className="form-group"><label>Industry Type</label><input type="text" value={formData.industry_type} onChange={(e) => setFormData({ ...formData, industry_type: e.target.value })} /></div>
          <div className="form-group"><label>Website URL</label><input type="text" value={formData.website_url} onChange={(e) => setFormData({ ...formData, website_url: e.target.value })} /></div>

          {/* === Bank === */}
          <hr /><h3>Bank Details</h3>
          <div className="form-group"><label>Account Name</label><input type="text" value={formData.account_name} onChange={(e) => setFormData({ ...formData, account_name: e.target.value })} /></div>
          <div className="form-group"><label>Account Number</label><input type="text" value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} /></div>
          <div className="form-group"><label>Bank Name</label><input type="text" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} /></div>
          <div className="form-group"><label>Branch</label><input type="text" value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} /></div>
          <div className="form-group"><label>IFSC Code</label><input type="text" value={formData.ifsc_code} onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })} /></div>

          {/* === UPI & QR Code === */}
          <hr /><h3>UPI / QR Code</h3>
          <div className="form-group"><label>UPI ID</label><input type="text" value={formData.upi_id} onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })} /></div>
          <div className="form-group">
            <label>Upload QR Code</label>
            <input type="file" accept="image/*" onChange={(e) => setFormData({ ...formData, qr_code: e.target.files[0] })} />
            {renderImage("QR Code", "qr_code", "qr_code")}
          </div>

          {/* === Signature === */}
          <hr /><h3>Authorized Signature</h3>
          <div className="form-group">
            <label>Upload Signature</label>
            <input type="file" accept="image/*" onChange={(e) => setFormData({ ...formData, signature: e.target.files[0] })} />
            {renderImage("Signature", "signature", "signature")}
          </div>

          <div className="profile-button-row">
            <button type="submit" className="save-btn">Save</button>
            <button type="button" className="cancel-btn" onClick={onClose}>Close</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyProfileModal;
