// ✅ All original logic preserved and console logs retained
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf';
import axios from "axios";


const LedgerPage = () => {
  const [company, setCompany] = useState(null);
  const [groups, setGroups] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showLedgerPopup, setShowLedgerPopup] = useState(false);
  const [newLedger, setNewLedger] = useState({
    name: '',
    opening_balance: '',
    opening_balance_type: 'Dr',
    created_at: new Date().toISOString().split('T')[0]
  });
  const [hoveredLedger, setHoveredLedger] = useState(null);
  const [viewPopup, setViewPopup] = useState(false);
  const [editPopup, setEditPopup] = useState(false);
  const [activeLedger, setActiveLedger] = useState(null);
  const [editLedger, setEditLedger] = useState({ name: '', opening_balance: '', created_at: '' });
  const [viewRange, setViewRange] = useState({ from: '', to: '' });

  const token = localStorage.getItem("accessToken");
  const [selectedCompany, setSelectedCompany] = useState(() =>
    JSON.parse(localStorage.getItem("selectedCompany"))
  );
  

  useEffect(() => {
    const storedCompany = JSON.parse(localStorage.getItem('selectedCompany'));
    console.log("📦 Raw selectedCompany:", storedCompany);
    if (storedCompany) {
      setCompany(storedCompany);
      fetchGroups(storedCompany.id);
      fetchLedgers(storedCompany.id);
    } else {
      toast.error("No company selected");
    }
  }, []);

  const fetchGroups = async (companyId) => {
    try {
      const res = await fetch(`https://virtual-finance-backend.onrender.com/api/accounting/account-groups/${companyId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
      console.log("✅ Groups:", data);
    } catch (err) {
      toast.error("Failed to load account groups");
    }
  };

  const fetchLedgers = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await axios.get(
        `https://virtual-finance-backend.onrender.com/api/accounting/ledger/list/${selectedCompany.id}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      const data = res.data;
      setLedgers(Array.isArray(data) ? data : []);
      console.log("📥 Ledgers fetched:", data);
  
      data.forEach((ledger) => {
        console.log(
          `📊 ${ledger.name} | Balance: ₹${ledger.net_balance} ${ledger.balance_type}`
        );
      });
    } catch (err) {
      console.error("❌ Ledger fetch error:", err);
      toast.error("❌ Failed to load ledgers");
    }
  };
  
  const groupByNature = () => {
    const grouped = {};
    groups.forEach(group => {
      if (!grouped[group.nature]) grouped[group.nature] = [];
      grouped[group.nature].push({
        ...group,
        children: groups.filter(g => g.parent === group.id),
        ledgers: ledgers.filter(l => l.group_id === group.id)
      });
    });
    return grouped;
  };

  const handleLedgerCreate = async () => {
    const payload = {
      company_id: company.id,
      group_name: selectedGroup.group_name,
      name: newLedger.name,
      opening_balance: parseFloat(newLedger.opening_balance || 0),
      opening_balance_type: newLedger.opening_balance_type,
      created_at: newLedger.created_at
    };
    console.log("📤 Creating Ledger:", payload);
    try {
      const res = await fetch(`https://virtual-finance-backend.onrender.com/api/accounting/ledger/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Ledger created successfully");
        setShowLedgerPopup(false);
        fetchLedgers(company.id);
      } else {
        toast.error(data.error || "Ledger creation failed");
      }
    } catch (err) {
      toast.error("Something went wrong");
    }
  };

  const handleEditSave = async () => {
    const payload = {
      name: editLedger.name,
      opening_balance: parseFloat(editLedger.opening_balance || 0),
      created_at: editLedger.created_at
    };
    console.log("✏️ Updating Ledger:", payload);
    try {
      const res = await fetch(`https://virtual-finance-backend.onrender.com/api/accounting/ledger/update/${activeLedger.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success("Ledger updated");
        setEditPopup(false);
        fetchLedgers(company.id);
      } else {
        toast.error("Update failed");
      }
    } catch (err) {
      toast.error("Something went wrong");
    }
  };

  const handleDeleteLedger = async () => {
    if (!activeLedger) return;
    console.log("🗑️ Deleting ledger:", activeLedger);
    try {
      const res = await fetch(`https://virtual-finance-backend.onrender.com/api/accounting/ledger/delete/${activeLedger.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Ledger deleted");
        setViewPopup(false);
        fetchLedgers(company.id);
      } else {
        toast.error("Failed to delete ledger");
      }
    } catch (err) {
      toast.error("Error deleting ledger");
    }
  };

  // 📄 Function to generate and download a simple PDF of ledger info
  const handleDownloadPDF = () => {
    if (!activeLedger) return;
    const doc = new jsPDF();
    doc.text(`Ledger: ${activeLedger.name}`, 10, 10);
    doc.text(`Opening Balance: ₹${activeLedger.opening_balance}`, 10, 20);
    doc.text(`Created At: ${activeLedger.created_at}`, 10, 30);
    doc.save(`${activeLedger.name}_ledger.pdf`);
    console.log("📄 Downloading PDF for ledger:", activeLedger);
  };

  const renderGroupSection = (title, groups) => (
    <div style={{ marginBottom: '32px' }}>
      <h3 style={{ background: '#003366', color: 'white', padding: '10px 16px', borderRadius: '6px' }}>
        {title.toUpperCase()}
      </h3>
      <table style={{ width: '100%', marginTop: '8px', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
            <th style={{ padding: '8px' }}>Account Group / Ledger</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Balance (₹)</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(group => (
            <React.Fragment key={group.id}>
              <tr
                style={{ background: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={() => {
                  setSelectedGroup(group);
                  setShowLedgerPopup(true);
                }}
              >
                <td style={{ padding: '8px' }}>{group.group_name}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>--</td>
              </tr>
              {group.ledgers.map(ledger => {
                const balance = ledger.net_balance;
                const type = ledger.balance_type;
  
                console.log(`📊 ${ledger.name} | Balance: ₹${balance} ${type}`);
  
                return (
                  <tr
                    key={ledger.id}
                    style={{ background: '#fcfcfc' }}
                    onMouseEnter={() => setHoveredLedger(ledger)}
                    onMouseLeave={() => setHoveredLedger(null)}
                  >
                    <td style={{ padding: '8px 8px 8px 24px', position: 'relative' }}>
                      • {ledger.name.replace(' Ledger', '')}
                      {hoveredLedger?.id === ledger.id && (
                        <span
                          style={{
                            position: 'absolute',
                            right: 5,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            gap: '6px',
                          }}
                        >
                          <button
                            onClick={() => {
                              setActiveLedger(ledger);
                              setViewPopup(true);
                            }}
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => {
                              setActiveLedger(ledger);
                              setEditLedger({
                                name: ledger.name,
                                opening_balance: ledger.opening_balance,
                                created_at: ledger.created_at.split('T')[0],
                              });
                              setEditPopup(true);
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              setActiveLedger(ledger);
                              handleDeleteLedger();
                            }}
                          >
                            🗑️
                          </button>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      ₹{balance !== undefined ? balance.toFixed(2) : '--'} {type || ''}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
  

  const natureGroups = groupByNature();
  const orderedNature = ['Asset', 'Liability', 'Income', 'Expense', 'Equity'];

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ color: '#003366', marginBottom: '16px' }}>📘 Ledger Chart of Accounts</h2>
      {orderedNature.map(nature => (
        natureGroups[nature] ? renderGroupSection(nature, natureGroups[nature]) : null
      ))}

      {/* View popup */}
      {viewPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', width: '400px' }}>
            <h3>Ledger View: {activeLedger?.name}</h3>
            <label>From</label>
            <input type="date" value={viewRange.from} onChange={(e) => setViewRange({ ...viewRange, from: e.target.value })} style={{ width: '100%', marginBottom: '10px' }} />
            <label>To</label>
            <input type="date" value={viewRange.to} onChange={(e) => setViewRange({ ...viewRange, to: e.target.value })} style={{ width: '100%', marginBottom: '10px' }} />
            <button onClick={handleDownloadPDF}>Download PDF</button>
            <button onClick={handleDeleteLedger} style={{ marginLeft: '10px' }}>Delete</button>
            <button onClick={() => setViewPopup(false)} style={{ marginLeft: '10px' }}>Close</button>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default LedgerPage;
