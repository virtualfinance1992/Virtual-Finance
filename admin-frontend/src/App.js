import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WelcomePage from './WelcomePage';
import LoginPage from './LoginPage';
import AdminRegistrationForm from './AdminRegistrationForm';
import CompanyPage from './create_company/company';
import ManageCompanyPage from './create_company/ManageCompanyPage';
import ChartOfAccounts from './ChartOfAccounts/ChartOfAccounts';  // ✅ Import ChartOfAccounts
import LedgerPage from './ledger/LedgerPage';
import DashboardPage from './DashboardPage';
import SalesVoucherForm from './vouchers/SalesVoucherForm';
import { CompanyProvider } from './CompanyContext';
import LedgerDetailPage from './ledger/LedgerDetailPage';



// Function to check if the user is authenticated
const isAuthenticated = () => {
  return !!localStorage.getItem('accessToken');
};

function App() {
  return (
    
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} /> 
        <Route path="/register-admin" element={<AdminRegistrationForm />} />
        <Route path="/company" element={<CompanyPage />} />

        {/* Protected Routes */}
        <Route 
          path="/create-company" 
          element={isAuthenticated() ? <CompanyPage /> : <Navigate to="/" />} 
        />
        <Route 
          path="/manage-company/:companyId" 
          element={isAuthenticated() ? <ManageCompanyPage /> : <Navigate to="/" />} 
        />
        <Route 
          path="/chart-of-accounts/:companyId" 
          element={isAuthenticated() ? <ChartOfAccounts /> : <Navigate to="/" />}  // ✅ Protected Chart of Accounts Route
        />
        
        {/* Route for LedgerPage, ensuring the companyId is passed as query parameter */}
        <Route 
          path="/ledger" 
          element={isAuthenticated() ? <LedgerPage /> : <Navigate to="/" />}  // ✅ Ensure it's protected
        />

        <Route 
          path="/dashboard/:companyId" 
          element={isAuthenticated() ? <DashboardPage /> : <Navigate to="/" />} 
        />

            

            <Route path="/sales-voucher" element={<SalesVoucherForm />} />
            <Route path="/ledger-info/:ledgerId" element={<LedgerDetailPage />} />

      </Routes>

        {/* Add route for customers page */}
        

    </Router>
  );
}

export default App;
