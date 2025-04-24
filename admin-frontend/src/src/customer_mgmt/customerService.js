// src/customer_mgmt/customerService.js
import axios from 'axios';

const API_URL = 'https://virtual-finance-backend.onrender.com/api/customers/';  // Change this to your backend URL

const getCustomers = () => {
  return axios.get(API_URL);
};

const getCustomer = (id) => {
  return axios.get(`${API_URL}${id}/`);
};

const createCustomer = (customerData) => {
  return axios.post(API_URL, customerData);
};

const updateCustomer = (id, customerData) => {
  return axios.put(`${API_URL}${id}/`, customerData);
};

const deleteCustomer = (id) => {
  return axios.delete(`${API_URL}${id}/`);
};

export default {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
