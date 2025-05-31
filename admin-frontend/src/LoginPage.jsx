
// src/LoginPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import logo from './lOGO.png';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError('Username and password are required');
      setShowError(true);
      return;
    }

    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/token/',
        { username, password },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const token = response.data.access;
      localStorage.setItem('accessToken', token);
      navigate('/company');
    } catch (err) {
      console.error('Login failed:', err);
      setError('Invalid username or password');
      setShowError(true);
    }
  };

  return (
    <div className="login-page">
      <img src={logo} alt="Logo" className="top-left-logo" />
      <div className="login-card">
        <img src={logo} alt="Logo" className="center-logo" />
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <div className="form-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">Login</button>
        </form>
      </div>

      {showError && (
        <div className="error-overlay" onClick={() => setShowError(false)}>
          <div className="error-popup" onClick={e => e.stopPropagation()}>
            <p>{error}</p>
            <button onClick={() => setShowError(false)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;

