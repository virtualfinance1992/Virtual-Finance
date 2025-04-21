import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

function ManageCompanyPage() {
  const { companyId } = useParams();  // Get company ID from URL
  const [companyDetails, setCompanyDetails] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError("You're not logged in.");
        return;
      }

      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/user_mgmt/company/${companyId}/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        setCompanyDetails(response.data);
      } catch (error) {
        setError(error.response?.data?.detail || 'Failed to load company details.');
      }
    };

    fetchCompanyDetails();
  }, [companyId]);

  return (
    <div>
      <h2>Company Management: {companyDetails?.company_name}</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {companyDetails ? (
        <div>
          <p>ID: {companyDetails.id}</p>
          <p>Company Name: {companyDetails.company_name}</p>
          <p>Registration Date: {companyDetails.registration_date}</p>
          {/* You can add more fields to manage */}
        </div>
      ) : (
        <p>Loading company details...</p>
      )}
    </div>
  );
}

export default ManageCompanyPage;
