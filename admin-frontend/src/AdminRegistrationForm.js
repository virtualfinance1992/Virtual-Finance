import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AdminRegistrationForm.css';
import logo from './lOGO.png';

function AdminRegistrationForm() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: '',
    email: '',
    panCard: '',
    companyName: '',
  });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setMessage("❌ Passwords do not match.");
      return;
    }

    const registrationData = {
      username: formData.username,
      password: formData.password,
      confirm_password: formData.confirmPassword,
      full_name: formData.fullName,
      phone_number: formData.phoneNumber,
      email: formData.email,
      pan_card: formData.panCard,
      company_name: formData.companyName,
    };

    // 🔍 debug payload
    console.log('Registration Data:', registrationData);

    try {
      await axios.post(
        'http://127.0.0.1:8000/api/admin/register/',
        registrationData,
        { headers: { 'Content-Type': 'application/json' } }
      );
      setMessage("✅ Registration successful!");
      navigate('/company');
    } catch (err) {
      console.error('Registration failed:', err);
      const errData = err.response?.data;
      if (errData) {
        const errs = Object.entries(errData)
          .map(([f, msgs]) => `${f}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ');
        setMessage(`❌ Registration failed: ${errs}`);
      } else {
        setMessage("❌ Registration failed: Unknown error");
      }
    }
  };

  return (
    <div className="admin-form-container">
      {/* small corner logo */}
      <img src={logo} alt="Logo" className="admin-page-logo" />

      <form className="admin-form-box" onSubmit={handleSubmit}>
        {/* circular logo inside the card */}
        <img src={logo} alt="Logo" className="center-logo" />

        <h2 className="admin-title">Admin Registration</h2>

        {[
          ['Username', 'username', 'text'],
          ['Password', 'password', 'password'],
          ['Confirm Password', 'confirmPassword', 'password'],
          ['Full Name', 'fullName', 'text'],
          ['Phone Number', 'phoneNumber', 'text'],
          ['Email', 'email', 'email'],
          ['PAN Card Number', 'panCard', 'text'],
          ['Company Name', 'companyName', 'text'],
        ].map(([label, name, type]) => (
          <div key={name} className="form-group">
            <label htmlFor={name}>{label}</label>
            <input
              id={name}
              name={name}
              type={type}
              value={formData[name]}
              onChange={handleChange}
              placeholder={label}
              required
            />
          </div>
        ))}

        <button type="submit" className="submit-button">
          Register
        </button>
        {message && <div className="form-message">{message}</div>}
      </form>
    </div>
  );
}

export default AdminRegistrationForm;
