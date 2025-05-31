// src/CompanyContext.js
import React, { createContext, useContext, useState } from 'react';

// Create the context
const CompanyContext = createContext();

// Custom hook to use the company context
export const useCompany = () => useContext(CompanyContext);

// Provider component
export const CompanyProvider = ({ children }) => {
  const [companyId, setCompanyId] = useState(null);  // Initial value is null

  const setCompany = (id) => setCompanyId(id);

  return (
    <CompanyContext.Provider value={{ companyId, setCompany }}>
      {children}
    </CompanyContext.Provider>
  );
};
