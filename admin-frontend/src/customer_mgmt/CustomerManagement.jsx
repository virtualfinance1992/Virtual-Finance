// src/customer_mgmt/CustomerManagement.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import customerService from './customerService';  // Import customer service for API calls

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const navigate = useNavigate();

  // Fetch customers from the API
  const fetchCustomers = async () => {
    try {
      const response = await customerService.getCustomers();
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDelete = async (id) => {
    try {
      await customerService.deleteCustomer(id);
      setCustomers(customers.filter(customer => customer.id !== id));  // Remove deleted customer from list
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  return (
    <div>
      <h2>Customer Management</h2>
      <Link to="/customer/create">Add New Customer</Link>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>{customer.name}</td>
              <td>{customer.email}</td>
              <td>{customer.phone}</td>
              <td>
                <Link to={`/customer/edit/${customer.id}`}>Edit</Link> | 
                <button onClick={() => handleDelete(customer.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomerManagement;
