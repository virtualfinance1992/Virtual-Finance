import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './company.css';
import { useNavigate } from 'react-router-dom';
import logo from '../lOGO.png';

const Company = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');
  

  const [formData, setFormData] = useState({
    company_name: '',
    pan_number: '',
    email: '',
    phone_number: '',
    address: '',
    gst_number: '',
    industry_type: '',
    website_url: '',
  });

  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const handleSelect = c => navigate(`/dashboard/${c.id}`);


  useEffect(() => {
    if (!token) {
      setError('Token missing. Please login again.');
      navigate('/login');
    } else {
      fetchCompanies();
    }
  }, [token]);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get(
        'http://127.0.0.1:8000/api/admin/company/list/',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCompanies(response.data);
    } catch (err) {
      handleAuthError(err);
    }
  };

  const handleAuthError = (error) => {
    if (error.response && error.response.status === 401) {
      setError('Unauthorized. Please login again.');
      localStorage.removeItem('accessToken');
      navigate('/login');
    } else {
      setError('Something went wrong.');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const assignDefaultChartOfAccounts = async (companyId) => {
    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/api/accounting/create-default/${companyId}/`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('✅ Default Chart of Accounts created:', response.data);
    } catch (err) {
      console.error('❌ Failed to create default Chart of Accounts:', err.response?.data || err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    try {
      const url = editingCompanyId
        ? `http://127.0.0.1:8000/api/admin/company/update/${editingCompanyId}/`
        : 'http://127.0.0.1:8000/api/admin/company/create/';
      const method = editingCompanyId ? 'put' : 'post';

      console.log('Sending data to backend:', formData);

      const response = await axios({
        method,
        url,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: formData,
      });

      alert(`✅ Company ${editingCompanyId ? 'updated' : 'created'} successfully!`);

      if (!editingCompanyId) {
        const newCompanyId = response.data.id;
        const newCompanyName = response.data.company_name;
        await assignDefaultChartOfAccounts(newCompanyId);

        // 📦 Store in localStorage
        localStorage.setItem('selectedCompanyId', newCompanyId);
        localStorage.setItem('selectedCompanyName', newCompanyName);

        navigate(`/dashboard/${newCompanyId}`);
      } else {
        fetchCompanies();
      }

      setFormData({
        company_name: '',
        pan_number: '',
        email: '',
        phone_number: '',
        address: '',
        gst_number: '',
        industry_type: '',
        website_url: '',
      });
      setEditingCompanyId(null);
    } catch (error) {
      handleAuthError(error);
      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError('Failed to save company.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this company?')) return;

    try {
      await axios.delete(
        `http://127.0.0.1:8000/api/admin/company/delete/${id}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('🗑️ Company deleted.');
      fetchCompanies();
    } catch (error) {
      handleAuthError(error);
    }
  };

  const handleEdit = (company) => {
    setFormData(company);
    setEditingCompanyId(company.id);
  };

  const handleAssignRole = (companyId) => {
    navigate(`/assign-role/${companyId}`);
  };

  const handleSelectCompany = (company) => {
    const selectedCompany = {
      id: company.id,
      company_name: company.company_name,
    };
  
    // 🔐 Store company ID and name separately
    localStorage.setItem('selectedCompanyId', company.id);
    localStorage.setItem('selectedCompanyName', company.company_name);
    localStorage.setItem('activeCompanyName', company.company_name);
    localStorage.setItem('selectedCompanyLogo', `http://localhost:8000${company.logo}`);

  
    // 🧠 Also store full company object if needed later
    localStorage.setItem('selectedCompany', JSON.stringify(selectedCompany));
  
    console.log("✅ Company selected:", selectedCompany);
  
    // 🔁 Redirect to the dashboard
    navigate(`/dashboard/${company.id}`);
  };
  
  
  
  return (
    <div className="company-page-container">
      <img src={logo} alt="Logo" className="company-logo" />
      <div className="company-tiles">
        {companies.map(c => (
          <div key={c.id} className="company-tile" onClick={()=>handleSelect(c)}>
            <div className="tile-name">{c.company_name}</div>
            <div className="tile-actions" onClick={e=>e.stopPropagation()}>
              <button onClick={()=>handleEdit(c)} title="You can edit this company">✏️</button>
              <button onClick={()=>handleDelete(c.id)} title="Deleting will remove all company data">🗑️</button>
            </div>
          </div>
        ))}
        <div className="company-tile create-tile" onClick={()=>{setShowForm(true); setEditingCompanyId(null);}}>
          <div className="plus">+</div>
          <div>Create Company</div>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={()=>setShowForm(false)}>
          <div className="modal-content" onClick={e=>e.stopPropagation()}>
            <h2>{editingCompanyId ? 'Edit Company' : 'Create Company'}</h2>
            <form onSubmit={handleSubmit} className="company-form">
              {Object.entries(formData).map(([f,v])=>(
                <div key={f} className="form-group">
                  <label htmlFor={f}>{f.replace(/_/g,' ').toUpperCase()}</label>
                  <input id={f} name={f} value={v} onChange={handleChange} required />
                </div>
              ))}
              <div className="company-form-buttons">
                <button type="submit">Save</button>
                <button type="button" onClick={()=>setShowForm(false)}>Cancel</button>
              </div>
              {error && <div className="form-message">{error}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Company;