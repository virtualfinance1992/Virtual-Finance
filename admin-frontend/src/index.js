// src/index.js

// 1) All imports first
import axios from 'axios'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import reportWebVitals from './reportWebVitals'

// 2) Then configure axios
axios.defaults.withCredentials = true
axios.defaults.xsrfCookieName = 'csrftoken'
axios.defaults.xsrfHeaderName = 'X-CSRFToken'
const token = localStorage.getItem('accessToken');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}
// Log every outgoing request to verify the header
axios.interceptors.request.use(req => {
  console.log('📤 Outgoing request:', req.method.toUpperCase(), req.url);
  console.log('📤 Authorization header:', req.headers.Authorization);
  return req;
});

// 3) Now render your React app
const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// 4) (Optional) performance logging
reportWebVitals()
