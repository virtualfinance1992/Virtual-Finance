import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Line, Pie } from "react-chartjs-2";
import './DashboardPage.scss';
import SalesVoucherForm from './vouchers/SalesVoucherForm'; // Sales Form
import PurchaseVoucherForm from './vouchers/PurchaseVoucherForm'; // Purchase Form
import ExpenseVoucherForm from './vouchers/ExpenseVoucherForm'; // Expense Form
import IncomeVoucherForm from './vouchers/IncomeVoucherForm';// Income Form
import PaymentVoucherForm from './vouchers/PaymentVoucherForm'; // Payment Form
import ReceiptVoucherForm from './vouchers/ReceiptVoucherForm'; // Recipt voucher Form
import QuotationForm from './vouchers/QuotationForm'; // Quotation Form
import PurchaseOrderForm from './vouchers/PurchaseOrderForm';// Purchase Form
import JournalEntryForm from './vouchers/JournalEntryForm'; // Journal Form





import StockHistoryPage from './inventory_mgmt/stock_history'; // ✅ NEW
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const { companyId } = useParams();
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [showInventoryHistory, setShowInventoryHistory] = useState(false); // Sales  Form
  const [showPurchaseForm, setShowPurchaseForm] = useState(false); // Purchase Form
  const [showExpenseForm, setShowExpenseForm] = useState(false);// Expense Form
  const [showIncomeForm, setShowIncomeForm] = useState(false);// Income Form
  const [showPaymentForm, setShowPaymentForm] = useState(false);// Payment Form
  const [showReceiptForm, setShowReceiptForm] = useState(false); // Recipt Vouche Form
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [showJournalForm, setShowJournalForm] = useState(false);



  
  const [selectedCompanyId, setSelectedCompanyId] = useState(localStorage.getItem("selectedCompanyId"));




  useEffect(() => {
    console.log("📦 Company ID in dashboard:", companyId);
    if (companyId) {
      localStorage.setItem('activeCompanyId', companyId);
      console.log("💾 Saved companyId to localStorage");
    }
  }, [companyId]);

  useEffect(() => {
    console.log("📌 showSalesForm changed:", showSalesForm);
  }, [showSalesForm]);

  const inventoryData = {
    labels: ["Item A", "Item B", "Item C", "Item D", "Item E"],
    datasets: [{
      data: [25, 15, 30, 10, 20],
      backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"],
    }],
  };

  const revenueData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    datasets: [
      {
        label: "Revenue",
        data: [12000, 15000, 17000, 20000, 22000, 25000, 27000],
        backgroundColor: "#36A2EB",
        borderColor: "#36A2EB",
        fill: false,
      },
      {
        label: "Purchases",
        data: [8000, 12000, 10000, 16000, 18000, 21000, 24000],
        backgroundColor: "#4BC0C0",
        borderColor: "#4BC0C0",
        fill: false,
      },
    ],
  };

  const handleLedgerClick = () => {
    navigate(`/ledger?company=${companyId}`);
  };

  return (
    <div className="dashboard-page">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="sidebar">
        <h3>COMPANY DASHBOARD</h3>
        <nav>
          <ul>
            <li>COMPANY DASHBOARD</li>
            <li>ACCOUNTS</li>
            <ul>
              <li>CUSTOMERS/DEBTORS</li>
              <li>SUPPLIERS/CREDITORS</li>
              <li>ALL ACCOUNTS</li>
              <li
                onClick={handleLedgerClick}
                style={{ cursor: 'pointer', color: '#007BFF' }}
              >
                LEDGERS
              </li>
            </ul>
            <li>TRANSACTIONS</li>
            <li>INVENTORY</li>
            <ul>
              <li
                onClick={() => setShowInventoryHistory(true)}
                style={{ cursor: 'pointer', color: '#007BFF' }}
              >
                INVENTORY ITEM
              </li>
              <li>UNIT OF MEASUREMENT</li>
              <li>SERVICES</li>
            </ul>
            <li>REPORTS</li>
            <ul>
              <li>BALANCE SHEET</li>
              <li>PROFIT AND LOSS</li>
              <li>ACCOUNT STATEMENT LEDGER</li>
              <li>DAY BOOK</li>
              <li>SALES REGISTER</li>
              <li>INVENTORY ITEM DETAILS</li>
              <li>INVENTORY SUMMARY</li>
              <li>TAX REGISTER</li>
              <li>ALL REPORTS</li>
            </ul>
          </ul>
        </nav>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>COMPANY DASHBOARD</h1>
          <div className="huge-buttons">
            <div className="huge-button">
              <h3>TOTAL REVENUE</h3>
              <p>$50,000</p>
            </div>
            <div className="huge-button">
              <h3>TOTAL PURCHASE</h3>
              <p>$12,500</p>
            </div>
            <div className="huge-button">
              <h3>EXPENSE</h3>
              <p>$5,000</p>
            </div>
            <div className="huge-button">
              <h3>TOTAL OUTSTANDING</h3>
              <p>5</p>
            </div>
          </div>
        </div>

        <div className="charts">
          <div className="chart-container">
            <h3>INVENTORY BY ITEM</h3>
            <Pie data={inventoryData} />
          </div>
          <div className="chart-container">
            <h3>REVENUE VS. PURCHASES</h3>
            <Line data={revenueData} />
          </div>
        </div>
      </div>

      <div className="actions">
        <div className="action-buttons-grid">
          <button
            className="action-button"
            onClick={() => {
              console.log("🟢 SALES button clicked");
              setShowSalesForm(true);
            }}
          >
            SALES
          </button>
          <button 
            className="action-button"
            onClick={() => {
              console.log("🟢 PURCHASE button clicked");
              setShowPurchaseForm(true);
            }}
          >
            PURCHASE
          </button>

          <button
            className="action-button"
            onClick={() => {
              console.log("🟠 EXPENSE button clicked");
              setShowExpenseForm(true);
              
            }}
          >
            EXPENSE
          </button>
    
          <button 
          className="action-button"
            onClick={() => {
              console.log("🟢 INCOME button clicked");
              setShowIncomeForm(true);
            }}
          >
            INCOME
          </button>
          
          <button 
          className="action-button"
            onClick={() => {
              console.log("💸 PAYMENT button clicked");
              setShowPaymentForm(true);
            }}
        >
          PAYMENT
        </button>

        <button 
        className="action-button"
          onClick={() => {
            console.log("🟢 RECEIPT button clicked");
            setShowReceiptForm(true);
          }}
        >
          RECEIPT FROM CUSTOMER
        </button>

        
        <button 
        className="action-button"
          onClick={() => {
            console.log("🧾 QUOTATION button clicked");
            setShowQuotationForm(true);
          }}
      >
          QUOTATION
        </button>
        <button 
        className="action-button"
        onClick={() => {
          console.log("📦 PURCHASE ORDER button clicked");
          setShowPurchaseOrderForm(true);
        }}
      >
        PURCHASE ORDER
      </button>

          
      <button
      className="action-button"
      onClick={() => {
        console.log("🟣 JOURNAL button clicked");
        setShowJournalForm(true);
      }}
    >
      JOURNAL
    </button>
          <button className="action-button">DEBIT NOTE</button>
          <button className="action-button">CREDIT NOTE</button>
          
        </div>
      </div>

      {showSalesForm && (
        <>
          {console.log("🧾 Rendering SalesVoucherForm popup...")}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 999,
              backdropFilter: 'blur(4px)',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '0',
                borderRadius: '16px',
                width: '95%',
                maxWidth: '1400px',
                maxHeight: '95vh',
                overflowY: 'auto',
                position: 'relative',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25)',
                animation: 'fadeIn 0.3s ease-in-out',
              }}
            >
              <SalesVoucherForm
                onClose={() => {
                  console.log("🔴 Closing SalesVoucherForm");
                  setShowSalesForm(false);
                }}
                companyId={companyId}
              />
            </div>
          </div>
        </>
      )}

      {showPurchaseForm && (
        <>
          {console.log("🧾 Rendering PurchaseVoucherForm popup...")}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 999,
              backdropFilter: 'blur(4px)',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '0',
                borderRadius: '16px',
                width: '95%',
                maxWidth: '1400px',
                maxHeight: '95vh',
                overflowY: 'auto',
                position: 'relative',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25)',
                animation: 'fadeIn 0.3s ease-in-out',
              }}
            >
              <PurchaseVoucherForm
                onClose={() => {
                  console.log("🔴 Closing PurchaseVoucherForm");
                  setShowPurchaseForm(false);
                }}
                companyId={companyId}
              />
            </div>
          </div>
        </>
      )}


{showExpenseForm && (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}
    onClick={() => setShowExpenseForm(false)}
  >
    <div onClick={(e) => e.stopPropagation()}>
      <ExpenseVoucherForm
        onClose={() => {
          console.log('✅ Expense form closed');
          setShowExpenseForm(false);
        }}
        companyId={selectedCompanyId} // ✅ Correct and simplified
      />
    </div>
  </div>
)}


      {showIncomeForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowIncomeForm(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <IncomeVoucherForm
              onClose={() => setShowIncomeForm(false)}
              companyId={selectedCompanyId}
            />
          </div>
        </div>
      )}


      {showPaymentForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowPaymentForm(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <PaymentVoucherForm
              onClose={() => setShowPaymentForm(false)}
              companyId={selectedCompanyId}
            />
          </div>
        </div>
      )}

      {showReceiptForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowReceiptForm(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ReceiptVoucherForm
              onClose={() => setShowReceiptForm(false)}
              companyId={selectedCompanyId}
            />
          </div>
        </div>
      )}

      {showPurchaseOrderForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowPurchaseOrderForm(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <PurchaseOrderForm
              onClose={() => setShowPurchaseOrderForm(false)}
              companyId={localStorage.getItem('selectedCompanyId')}
            />
          </div>
        </div>
      )}


      {showQuotationForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowQuotationForm(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <QuotationForm
              onClose={() => setShowQuotationForm(false)}
              companyId={localStorage.getItem('selectedCompanyId')}
            />
          </div>
        </div>
      )}

      {showJournalForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowJournalForm(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <JournalEntryForm
              onClose={() => {
                console.log('✅ Journal form closed');
                setShowJournalForm(false);
              }}
              companyId={selectedCompanyId}
            />
          </div>
        </div>
      )}




      {showInventoryHistory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '0',
              borderRadius: '16px',
              width: '95%',
              maxWidth: '1400px',
              maxHeight: '95vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25)',
            }}
          >
            <button
              onClick={() => setShowInventoryHistory(false)}
              style={{ position: 'absolute', top: 10, right: 20, fontSize: '1.2rem' }}
            >
              ❌
            </button>
            <StockHistoryPage companyId={companyId} companyName={'Virtual Finance'} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
