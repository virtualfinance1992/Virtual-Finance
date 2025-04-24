import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './company.css';
import { useNavigate } from 'react-router-dom';

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
      const response = await axios.get('https://virtual-finance-backend.onrender.com/api/admin/company/list/', {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    try {
      const url = editingCompanyId
        ? `https://virtual-finance-backend.onrender.com/api/admin/company/update/${editingCompanyId}/`
        : 'https://virtual-finance-backend.onrender.com/api/admin/company/create/';
      const method = editingCompanyId ? 'put' : 'post';

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
      fetchCompanies();
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
      await axios.delete(`https://virtual-finance-backend.onrender.com/api/admin/company/delete/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  return (
    <div style={{ padding: '2rem' }}>
      <h2>{editingCompanyId ? 'Edit Company' : 'Create Company'}</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
        {Object.keys(formData).map((field) => (
          <div key={field} style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '.3rem' }}>
              {field.replace(/_/g, ' ').toUpperCase()}
            </label>
            <input
              type="text"
              name={field}
              value={formData[field]}
              onChange={handleChange}
              required={['company_name', 'pan_number', 'email', 'phone_number', 'address'].includes(field)}
              style={{ padding: '0.5rem', width: '100%' }}
            />
          </div>
        ))}
        <button type="submit" style={{ padding: '0.5rem 1rem' }}>
          {editingCompanyId ? 'Update Company' : 'Create Company'}
        </button>
        {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
      </form>

      <h3>Your Companies</h3>
      <ul>
        {companies.map((company) => (
          <li key={company.id} style={{ marginBottom: '1rem' }}>
            <strong
              onClick={() => navigate(`/chart-of-accounts/${company.id}`)}
              style={{ cursor: 'pointer', color: '#007bff', textDecoration: 'underline' }}
            >
              {company.company_name}
            </strong> — {company.email} <br />
            <button onClick={() => handleEdit(company)} style={{ marginRight: '1rem' }}>
              ✏️ Edit
            </button>
            <button onClick={() => handleDelete(company.id)} style={{ marginRight: '1rem' }}>
              🗑️ Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Company;
