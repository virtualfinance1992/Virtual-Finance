import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Line, Pie } from "react-chartjs-2";
import './DashboardPage.scss';
import DashboardSummary from './reports/DashboardSummary';

import axios from 'axios';

import SalesVoucherForm from './vouchers/SalesVoucherForm'; // Sales Form
import PurchaseVoucherForm from './vouchers/PurchaseVoucherForm'; // Purchase Form
import ExpenseVoucherForm from './vouchers/ExpenseVoucherForm'; // Expense Form
import IncomeVoucherForm from './vouchers/IncomeVoucherForm';// Income Form
import PaymentVoucherForm from './vouchers/PaymentVoucherForm'; // Payment Form
import ReceiptVoucherForm from './vouchers/ReceiptVoucherForm'; // Recipt voucher Form
import QuotationForm from './vouchers/QuotationForm'; // Quotation Form
import PurchaseOrderForm from './vouchers/PurchaseOrderForm';// Purchase Form
import JournalEntryForm from './vouchers/JournalEntryForm'; // Journal Form
import ReportsModal from './reports/ReportsModal'; // Report
import ReportViewerModal from './reports/ReportViewerModal'; // Report
import KpiDashboardWidget from './KpiDashboardWidget'; // Analytics
import RevenueVsPurchaseChart from './RevenueVsPurchaseChart';
import OutstandingCard from './OutstandingCard';
import './OutstandingCard.css';
import './DashboardPage.CSS';
import DebitNoteForm  from './vouchers/DebitNoteForm'
import CreditNoteForm from './vouchers/CreditNoteForm'
import Modal from './Modal' 
import CompanyProfileModal from "./CompanyProfileModal"; // Adjust path as needed
import { useRef } from 'react';









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
  const companyName = localStorage.getItem("activeCompanyName") || "My Company";
  const [showReportsModal, setShowReportsModal] = useState(false); // Reports
  const [viewerKey, setViewerKey]         = useState(null); // Reports
  const [showViewerModal, setShowViewerModal] = useState(false); // Reports
  const [showDebitNote,  setShowDebitNote]  = useState(false)
  const [showCreditNote, setShowCreditNote] = useState(false)
  const backdropStyle = {
  position: 'fixed',
  top: 0, left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
}
  // Update Profile Button
  const [showProfileModal, setShowProfileModal] = useState(false);

  const hasShownProfileToast = useRef(false);


  
  const [inventoryPie, setInventoryPie] = useState({ labels: [], data: [] });
  const [summary, setSummary] = useState({});
  //
  
  const [loading, setLoading] = useState(true);

  const inventoryData = {
  labels: inventoryPie.labels,
  datasets: [{
    data: inventoryPie.data,
    backgroundColor: [
      "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
      "#FF9F40", "#00B894", "#D63031", "#6C5CE7", "#FDCB6E"
    ],
  }],
};

console.log("📊 Chart Labels:", inventoryPie.labels);
console.log("📊 Chart Data:", inventoryPie.data);

  

  // date range for reports (you can replace with your own date pickers)
  const [dateRange] = useState({
    from: new Date(),
    to:   new Date(),
  });

  // handle clicking the “REPORTS” header
  const openReportsList = () => {
    setShowReportsModal(true);
    setViewerKey(null);
    setShowViewerModal(false);
  };

  // when a report is chosen in the list
  const handleSelectReport = (key) => {
    setViewerKey(key);
    setShowViewerModal(true);
    setShowReportsModal(false);
  };

  // close the viewer, go back to the list
  const closeViewer = () => {
    setShowViewerModal(false);
    setViewerKey(null);
    setShowReportsModal(true);
  };

  // your existing effects and handlers...
  useEffect(() => {
    if (companyId) {
      localStorage.setItem('activeCompanyId', companyId);
      localStorage.setItem('activeCompanyName', companyName);
    }
  }, [companyId, companyName]);


  // For purchase order and Quotation
  const [openForm, setOpenForm] = useState(null)  // 'quotation' | 'po' | null
  




  
const [selectedCompanyId, setSelectedCompanyId] = useState(
  localStorage.getItem('selectedCompanyId') || companyId,
);
const selectedCompanyName = localStorage.getItem('selectedCompanyName') || companyName;

console.log("📦 Company from localStorage:", selectedCompanyName);

 


useEffect(() => {
  if (companyId) {
    localStorage.setItem('selectedCompanyId', companyId);
    console.log("💾 Saved companyId to localStorage");
  }
  if (companyName) {
    localStorage.setItem('selectedCompanyName', companyName);
    console.log("💾 Saved companyName to localStorage");
  }
}, [companyId, companyName]);


  /* 🔔 Check profile completeness */
useEffect(() => {
  const dontAsk = localStorage.getItem(`skipProfilePrompt_${companyId}`);
  const token = localStorage.getItem("accessToken");
  const url = `http://localhost:8000/api/admin/company/${companyId}/`;

  // ✅ Log the token like we did for inventory
  console.log("🔐 Access Token for profile check:", token);

  if (hasShownProfileToast.current || dontAsk) return;

  if (!token || token === 'null') {
    console.warn("❌ No access token found. Skipping profile check.");
    return;
  }

  const fetchProfileStatus = async () => {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('🔄 HTTP response status:', res.status, res.statusText);

      const text = await res.text();
      console.log('📥 Raw response text:', text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.warn('⚠️ Response was not valid JSON:', err);
        data = null;
      }

      console.log('📊 Parsed JSON data:', data);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      if (data && !data.profile_completed) {
        toast.info(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 500 }}>
              📋 Please complete your company profile.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="dont-ask-again-btn"
                onClick={() => {
                  localStorage.setItem(`skipProfilePrompt_${companyId}`, 'true');
                  toast.dismiss();
                }}
              >
                Don't ask again
              </button>
            </div>
          </div>,
          {
            autoClose: false,
            closeOnClick: false,
            draggable: false,
            position: "top-center",
            toastId: 'company-profile-toast',
            style: {
              borderRadius: '8px',
              padding: '15px',
              boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            }
          }
        );

        hasShownProfileToast.current = true;
      }
    } catch (err) {
      console.error('❌ Error fetching company profile:', err);
    }
  };

  fetchProfileStatus();
}, [companyId]);



  useEffect(() => {
    console.log("📌 showSalesForm changed:", showSalesForm);
  }, [showSalesForm]);

  

 // Inventory Pie Chart
 useEffect(() => {
  if (!companyId) return;

  const token = localStorage.getItem('accessToken');
  const url = `http://localhost:8000/api/inventory/items/${companyId}/`;
  console.log("📡 Fetching inventory data from:", url);

  fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("📦 Raw Inventory Response:", data);

      data.forEach((item, index) => {
        console.log(`🔍 Item #${index + 1}`);
        console.log(`🧾 Name: ${item.name}`);
        console.log(`📦 Quantity: ${item.quantity}`);
        console.log(`💰 Rate: ${item.rate}`);
        console.log(`🧮 Total Value: ${item.total_value}`);
      });

      const labels = data.map(item => item.name);
      const values = data.map(item => {
        console.log(`✅ Computing total value for ${item.name}:`, item.total_value);
        return item.total_value;
      });

      console.log("📊 Chart Labels:", labels);
      console.log("💰 Chart Data (Inventory Value):", values);

      setInventoryPie({
        labels,
        data: values,
      });
    })
    .catch((err) => {
      console.error("❌ Error fetching inventory data:", err);
    });
}, [companyId]);

// outstanding sales and outstanding purchase

useEffect(() => {
  const fetchSummary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      console.log("🔐 Access Token:", token); // ✅ Console log for token
      const url = `http://localhost:8000/api/metrics/analytics/summary/${companyId}/`;
      console.log('📡 Fetching dashboard summary from:', url);
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('🔄 HTTP response status:', res.status, res.statusText);
      
      const text = await res.text();
      console.log('📥 Raw response text:', text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.warn('⚠️ Response was not valid JSON:', err);
        data = null;
      }
      console.log('📊 Parsed JSON data:', data);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setSummary(data || {});
    } catch (err) {
      console.error('❌ Error fetching summary:', err);
      setSummary({});
    } finally {
      setLoading(false);
    }
  };

  if (companyId) fetchSummary();
}, [companyId]);


 




  // Navigate to ledger

  const handleLedgerClick = () => {
    navigate(`/ledger?company=${companyId}`);
  };

  return (
    
    <div className="dashboard-page">
      
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="sidebar">
          <button
    className="sidebar-link profile-btn"
    onClick={() => setShowProfileModal(true)}
  >
    🏢 Company Profile
  </button>

        <h3>{selectedCompanyName || "Company Dashboard"}</h3>
       
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
            
            <ul>
              {/* You can keep static list or remove these,
                  since the modal will list all available reports */}
              <li onClick={openReportsList}
              style={{ cursor: 'pointer', color: '#007BFF' }}>ALL REPORTS…</li>
            </ul>
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

       <div className="action-buttons-grid"></div>
       <div className="dashboard-header">
 
  

  <div className="dashboard-header-action-grid">
   


    <button className="action-button" onClick={() => setShowSalesForm(true)}>SALES</button>
    <button className="action-button" onClick={() => setShowPurchaseForm(true)}>PURCHASE</button>
    <button className="action-button" onClick={() => setShowExpenseForm(true)}>EXPENSE</button>
    <button className="action-button" onClick={() => setShowIncomeForm(true)}>INCOME</button>
    <button className="action-button" onClick={() => setShowPaymentForm(true)}>PAYMENT</button>
    <button className="action-button" onClick={() => setShowReceiptForm(true)}>RECEIPT FROM CUSTOMER</button>
    <button className="action-button" onClick={() => setShowQuotationForm(true)}>QUOTATION</button>
    <button className="action-button" onClick={() => setShowPurchaseOrderForm(true)}>PURCHASE ORDER</button>
    <button className="action-button" onClick={() => setShowJournalForm(true)}>JOURNAL</button>
    <button className="action-button" onClick={() => setShowDebitNote(true)}>New Debit Note</button>
    <button className="action-button" onClick={() => setShowDebitNote(true)}>New Credit Note</button>
  </div>
</div>



 {openForm === 'quotation' && (
        <QuotationForm
          companyId={companyId.id}
          onClose={() => setOpenForm(null)}
        />
      )}

      {openForm === 'po' && (
        <PurchaseOrderForm
          companyId={companyId.id}
          onClose={() => setOpenForm(null)}
        />
      )}

 {showDebitNote && (
        <div style={backdropStyle}>
          <DebitNoteForm
            companyId={companyId}
            onClose={() => setShowDebitNote(false)}
          />
        </div>
      )}

      {showCreditNote && (
        <div style={backdropStyle}>
          <CreditNoteForm
            companyId={companyId}
            onClose={() => setShowCreditNote(false)}
          />
        </div>
      )}

          {localStorage.getItem('accessToken') && showProfileModal && (
  <CompanyProfileModal companyId={companyId} onClose={() => setShowProfileModal(false)} />
)}
          



        {/* --- Reports List Modal --- */}
      <ReportsModal
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        onSelectReport={handleSelectReport}
      />

      {/* --- Individual Report Viewer Modal --- */}
      <ReportViewerModal
        reportKey={viewerKey}
        companyId={selectedCompanyId}         // ← pass the numeric/string ID
        companyName={selectedCompanyName}     // ← pass the name
        isOpen={showViewerModal}
        onClose={closeViewer}
        companyName={companyName}
        fromDate={dateRange.from}
        toDate={dateRange.to}
      />
        <div className="dashboard-header">
          <h1>{selectedCompanyName || "Company Dashboard"}</h1>
             <div className="outstanding-row">
        {loading ? (
          <p>Loading outstanding data...</p>
        ) : (
          <>  
            <OutstandingCard
              title="Sales Outstanding"
              totalLabel="Receivables"
              totalValue={summary.salesTotal}
              current={summary.salesCurrent}
              overdue1_15={summary.sales1_15}
              overdue16_30={summary.sales16_30}
              overdue30plus={summary.sales30_plus}
              fillPercent={
                summary.salesTotal
                  ? (summary.salesCurrent / summary.salesTotal) * 100
                  : 0
              }
              fillPercent={ summary.salesTotal > 0 ? 100 : 0 }
            />
            <OutstandingCard
              title="Purchase Outstanding"
              totalLabel="Payables"
              totalValue={summary.purchaseTotal}
              current={summary.purchaseCurrent}
              overdue1_15={summary.purchase1_15}
              overdue16_30={summary.purchase16_30}
              overdue30plus={summary.purchase30_plus}
              fillPercent={
                summary.purchaseTotal
                  ? (summary.purchaseCurrent / summary.purchaseTotal) * 100
                  : 0
              }
              fillPercent={ summary.purchaseTotal > 0 ? 100 : 0 }
            />
            
          </>
        )}
      </div>
        
          <DashboardSummary companyId={selectedCompanyId} companyName={selectedCompanyName} />
          <div className="huge-buttons">
            <div className="huge-button">
              <h3>RevenueVsPurchaseChart</h3>
              <RevenueVsPurchaseChart companyId={selectedCompanyId} />
              <p></p>
            </div>
            <div className="huge-button">
              <h3>INVENTORY DATA</h3>
              <Pie data={inventoryData} />
              <p></p>
            </div>
            
            <div className="huge-button">
              <h3>KEY PERFOMANCE INDICATOR</h3>
               <KpiDashboardWidget companyId={selectedCompanyId} />
              <p></p>
            </div>
          </div>
        </div>

        
            
           
       
          
        
        </div>
{showSalesForm && (
  <Modal title="Sales Voucher" onClose={() => setShowSalesForm(false)}>
    <SalesVoucherForm
      onClose={() => setShowSalesForm(false)}
      companyId={selectedCompanyId}
    />
  </Modal>
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
