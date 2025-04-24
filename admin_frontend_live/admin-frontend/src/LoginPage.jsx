import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/token/', {
        username,
        password,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      const token = response.data.access;

      // ✅ Save token and confirm it's saved
      localStorage.setItem('accessToken', token);
      const savedToken = localStorage.getItem('accessToken');
      console.log("✅ Access token saved:", savedToken);

      if (savedToken) {
        navigate('/company');
      } else {
        setError('Token could not be saved. Please check browser storage settings.');
      }

    } catch (error) {
      console.error("❌ Login failed:", error);
      setError('Invalid username or password');
    }
  };

  return (
    <div className="login-page">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div className="form-field">
          <label>Username</label>
          <input
            type="text"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default LoginPage;
