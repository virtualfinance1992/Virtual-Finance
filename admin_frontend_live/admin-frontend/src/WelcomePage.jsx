import React from 'react';
import { useNavigate } from 'react-router-dom';
import './WelcomePage.css'; // 👈 Linked to external CSS

const WelcomePage = () => {
  const navigate = useNavigate();

  const handleRegisterClick = () => {
    navigate('/register-admin');
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="welcome-container">
      <div className="welcome-box">
        <h1>Virtual Finance ERP</h1>
        <p className="welcome-subtitle">A Smart Platform for Financial Operations</p>
        <div className="welcome-buttons">
          <button onClick={handleLoginClick}>Registered User Login</button>
          <button onClick={handleRegisterClick}>Register New User</button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
