import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function CompanyList() {
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCompanies = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError("You're not logged in.");
        return;
      }

      try {
        const response = await axios.get(
          'http://127.0.0.1:8000/user_mgmt/company/list/',
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        setCompanies(response.data);
      } catch (error) {
        setError(error.response?.data?.detail || 'Failed to load companies.');
      }
    };

    fetchCompanies();
  }, []);

  const handleCompanySelect = (companyId) => {
    navigate(`/manage-company/${companyId}`);  // Navigate to company management page
  };

  return (
    <div>
      <h2>Your Companies</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {companies.length > 0 ? (
          companies.map((company) => (
            <li key={company.id} onClick={() => handleCompanySelect(company.id)} style={{ cursor: 'pointer', color: 'blue' }}>
              {company.company_name} (ID: {company.id})
            </li>
          ))
        ) : (
          <p>No companies found. Please create one.</p>
        )}
      </ul>
    </div>
  );
}

export default CompanyList;
