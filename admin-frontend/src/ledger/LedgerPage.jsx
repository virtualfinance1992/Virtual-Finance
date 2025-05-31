// src/ledger/LedgerPage.jsx
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import './LedgerPage.css';

// Base API URL pointing at the accounting router
const API_BASE = 'http://localhost:8000/api/accounting';

const LedgerPage = () => {
  const { companyId: paramId } = useParams();
  const token = localStorage.getItem('accessToken');

  // Initialize company from params or localStorage
  const [company, setCompany] = useState(() => {
    const lsId   = localStorage.getItem('activeCompanyId');
    const lsName = localStorage.getItem('activeCompanyName') || '';
    const base   = lsId ? { id: +lsId, company_name: lsName } : {};
    if (paramId) {
      const id = +paramId;
      if (base.id && base.id !== id) {
        console.warn(`Param (${id}) vs localStorage (${base.id}) differ`);
      }
      return { id, company_name: base.company_name };
    }
    return base;
  });

  // State
  const [groups, setGroups]             = useState([]);
  const [ledgers, setLedgers]           = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchText, setSearchText]     = useState('');
  const [selectedFY, setSelectedFY]     = useState('All');
  const [showCreate, setShowCreate]     = useState(false);
  const [newLedger, setNewLedger]       = useState({
    name: '',
    opening_balance: '',
    opening_balance_type: 'Dr',
    created_at: new Date().toISOString().split('T')[0]
  });
  const [hovered, setHovered]           = useState(null);
  const [editPopup, setEditPopup]       = useState(false);
  const [editLedger, setEditLedger]     = useState({ name: '', opening_balance: '', created_at: '' });
  const [activeLedger, setActiveLedger] = useState(null);

  // FY dropdown (All + last 5 years)
  const fyOptions = ['All', ...Array.from({ length: 5 }).map((_, i) => {
    const y = new Date().getFullYear() - i;
    return `${y - 1}-${y}`;
  })];

  // Load groups & ledgers on mount / company change
  useEffect(() => {
    if (!company.id) {
      toast.error('No company selected');
      return;
    }
    console.log('🔄 Loading groups & ledgers for company', company.id);

    axios.get(`${API_BASE}/account-groups/${company.id}/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        console.log('✅ Groups loaded:', r.data);
        setGroups(r.data);
      })
      .catch(e => {
        console.error('❌ Failed to load groups:', e);
        toast.error('Failed to load groups');
      });

    axios.get(`${API_BASE}/ledger/list/${company.id}/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        console.log('✅ Ledgers loaded:', r.data);
        setLedgers(r.data);
      })
      .catch(e => {
        console.error('❌ Failed to load ledgers:', e);
        toast.error('Failed to load ledgers');
      });
  }, [company.id, token]);

  // Create new ledger
  const createLedger = () => {
  console.log('➕ Creating ledger:', newLedger);
  if (!newLedger.name || !selectedGroup) {
    toast.warn('Enter name & select group');
    return;
  }

  const payload = {
    company_id: company.id,
    group_name: selectedGroup.group_name,
    name: newLedger.name,
    opening_balance: newLedger.opening_balance || 0,
    opening_balance_type: newLedger.opening_balance_type || "Dr",
    created_at: newLedger.created_at || new Date().toISOString().slice(0, 10),
    main_party_type: newLedger.main_party_type || null
  };

  console.log("📤 Final payload to send:", payload);

  axios.post(`${API_BASE}/ledger/create/`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(() => {
      toast.success('✅ Ledger created');
      setShowCreate(false);
      return axios.get(`${API_BASE}/ledger/list/${company.id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    })
    .then(r => {
      console.log('✅ After create, ledgers:', r.data);
      setLedgers(r.data);
    })
    .catch(e => {
      console.error('❌ Ledger creation failed:', e);
      toast.error('Ledger creation failed');
    });
};


  // Save edits
  const saveEdit = () => {
    console.log('✏️ Saving edits for ledger', activeLedger?.id, editLedger);
    axios.put(`${API_BASE}/ledger/update/${activeLedger.id}/`, editLedger, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => {
        toast.info('Ledger updated');
        setEditPopup(false);
        return axios.get(`${API_BASE}/ledger/list/${company.id}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      })
      .then(r => {
        console.log('✅ After edit, ledgers:', r.data);
        setLedgers(r.data);
      })
      .catch(e => {
        console.error('❌ Update failed:', e);
        toast.error('Update failed');
      });
  };

  // Delete a ledger
  const deleteLedger = id => {
    console.log('🗑️ Deleting ledger:', id);
    axios.delete(`${API_BASE}/ledger/delete/${id}/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => {
        toast.success('Ledger deleted');
        return axios.get(`${API_BASE}/ledger/list/${company.id}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      })
      .then(r => {
        console.log('✅ After delete, ledgers:', r.data);
        setLedgers(r.data);
      })
      .catch(e => {
        console.error('❌ Delete failed:', e);
        toast.error('Delete failed');
      });
  };

  // Download PDF for activeLedger
  const downloadPDF = (ledger) => {
  if (!ledger || !token) {
    toast.warn("⚠️ Ledger not selected or session expired.");
    return;
  }

  console.log(`📥 Downloading PDF for Ledger: ${ledger.name} (ID: ${ledger.id})`);

  axios.get(`${API_BASE}/ledger/pdf/${ledger.id}/`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob'
  })
    .then(res => {
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ledger.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`✅ Downloaded: ${ledger.name}`);
    })
    .catch(e => {
      console.error('❌ PDF download failed:', e);
      toast.error('Download failed');
    });
};



  // Filtering & grouping
  const filtered = ledgers.filter(l =>
    (!selectedGroup || l.group_id === selectedGroup.id) &&
    l.name.toLowerCase().includes(searchText.toLowerCase()) &&
    (selectedFY === 'All' ||
      new Date(l.created_at).getFullYear() === +selectedFY.split('-')[1])
  );
  const grouped = filtered.reduce((acc, l) => {
    acc[l.nature] = acc[l.nature] || {};
    acc[l.nature][l.group_name] = acc[l.nature][l.group_name] || [];
    acc[l.nature][l.group_name].push(l);
    return acc;
  }, {});

  return (
    <div className="ledger-container">
      <h2>📘 Ledgers</h2>
      <div className="selection-panel">
        {/* Group Select */}
        <div>
          <label>Group</label>
          <select onChange={e => setSelectedGroup(
            groups.find(g => g.id === +e.target.value) || null
          )}>
            <option value="">All</option>
            {groups.map(g =>
              <option key={g.id} value={g.id}>{g.group_name}</option>
            )}
          </select>
        </div>

        {/* Search */}
        <div>
          <label>Search</label>
          <input
            type="text"
            placeholder="Search..."
            value={searchText}
            onChange={e => {
              console.log('🔍 Search:', e.target.value);
              setSearchText(e.target.value);
            }}
          />
        </div>

        {/* FY */}
        <div>
          <label>FY</label>
          <select
            value={selectedFY}
            onChange={e => {
              console.log('📆 FY:', e.target.value);
              setSelectedFY(e.target.value);
            }}
          >
            {fyOptions.map(fy =>
              <option key={fy}>{fy}</option>
            )}
          </select>
        </div>

        {/* Buttons */}
        <div className="toolbar-buttons">
          <button
            className="btn-new"
            onClick={() => { console.log('+ New Ledger'); setShowCreate(true); }}
          >
            + New Ledger
          </button>
          
          <button
            className="btn-download"
            onClick={downloadPDF}
          >
            Download
          </button>
        </div>
      </div>

      {/* Ledger Tiles */}
            {Object.entries(grouped).map(([nat, subs]) => (
        <div key={nat} className="main-group">
          <h3>{nat}</h3>
          {Object.entries(subs).map(([sub, items]) => (
            <div key={sub} className="sub-group">
              <h4>{sub}</h4>
              <div className="ledger-list">
                {items.map(l => {
                  const isAsset = l.nature === 'Asset';
                  const typ     = l.balance_type?.toLowerCase();
                  const incoming =
                    (isAsset && typ === 'dr') ||
                    (!isAsset && typ === 'cr');

                  return (
                    <Link
                      key={l.id}
                      to={`/ledger-info/${l.id}`}
                      className="ledger-card clickable"
                      onClick={() => {
    console.log("➡️ Navigating to ledger detail page for:");
    console.log("🆔 ID:", l.id);
    console.log("📘 Name:", l.name);
    // Optional: Save to localStorage if you want to use later
    localStorage.setItem("activeLedgerId", l.id);
    localStorage.setItem("activeLedgerName", l.name);
  }}
  onMouseEnter={() => setHovered(l.id)}
  onMouseLeave={() => setHovered(null)}
>
                      <h5>{l.name}</h5>
                      <p className={incoming ? 'balance-incoming' : 'balance-outgoing'}>
                        ₹{l.net_balance.toFixed(2)} ({l.balance_type})
                      </p>

                      {/* ℹ️ Info Button */}
                      <span
                        className="info-btn"
                        data-tooltip={
                          isAsset
                            ? 'Dr → increases balance\nCr → decreases balance'
                            : 'Dr → decreases balance\nCr → increases balance'
                        }
                      >
                        i
                      </span>

                      {/* Hover actions */}
                      {hovered === l.id && (
                        <div className="card-actions">
                          <button onClick={e => {
                            e.preventDefault();
                            console.log('✏️ Edit ledger', l.id);
                            setActiveLedger(l);
                            setEditLedger({
                              name: l.name,
                              opening_balance: l.opening_balance,
                              created_at: l.created_at.split('T')[0],
                            });
                            setEditPopup(true);
                          }}>✏️</button>
                          <button onClick={e => {
                            e.preventDefault();
                            console.log('🗑️ Delete ledger', l.id);
                            deleteLedger(l.id);
                          }}>🗑️</button>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Create Popup */}
    {showCreate && (
  <div className="modal-overlay">
    <div className="modal">
      <h3>New Ledger</h3>

      <label>
        Name
        <input
          value={newLedger.name}
          onChange={e => {
            console.log('✏️ New name:', e.target.value);
            setNewLedger({ ...newLedger, name: e.target.value });
          }}
        />
      </label>

      <label>
        Group
        <select
          onChange={e => {
            const grp = groups.find(g => g.id === +e.target.value);
            console.log('👥 New group selected:', grp);
            setSelectedGroup(grp);
            setNewLedger(prev => ({ ...prev, group_name: grp?.group_name }));
          }}
        >
          <option value="">Select</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.group_name}</option>
          ))}
        </select>
      </label>

      <label>
        Opening Balance
        <input
          type="number"
          value={newLedger.opening_balance}
          onChange={e => {
            console.log('💰 Opening balance:', e.target.value);
            setNewLedger({ ...newLedger, opening_balance: e.target.value });
          }}
        />
      </label>

      <label>
        Type
        <select
          value={newLedger.opening_balance_type}
          onChange={e => {
            console.log('📈 Balance type:', e.target.value);
            setNewLedger({ ...newLedger, opening_balance_type: e.target.value });
          }}
        >
          <option value="Dr">Dr</option>
          <option value="Cr">Cr</option>
        </select>
      </label>

      <label>
        Date
        <input
          type="date"
          value={newLedger.created_at}
          onChange={e => {
            console.log('📅 Creation date:', e.target.value);
            setNewLedger({ ...newLedger, created_at: e.target.value });
          }}
        />
      </label>

      <label>
        Main Party Type (optional)
        <select
          value={newLedger.main_party_type || ''}
          onChange={e => {
            console.log('🏷️ Main Party Type:', e.target.value);
            setNewLedger({ ...newLedger, main_party_type: e.target.value || null });
          }}
        >
          <option value="">None</option>
          <option value="Customer">Customer</option>
          <option value="Supplier">Supplier</option>
          <option value="Other">Other</option>
        </select>
      </label>

      <div className="modal-controls">
        <button onClick={createLedger}>Save</button>
        <button onClick={() => {
          console.log('❌ Cancel create');
          setShowCreate(false);
        }}>
          Cancel
        </button>
      </div>
    </div>
  </div>
)}


      {/* Edit Popup */}
      {editPopup && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Ledger</h3>
            <label>
              Name
              <input
                value={editLedger.name}
                onChange={e => {
                  console.log('✏️ Edit name:', e.target.value);
                  setEditLedger({ ...editLedger, name: e.target.value });
                }}
              />
            </label>
            <label>
              Opening Balance
              <input
                type="number"
                value={editLedger.opening_balance}
                onChange={e => {
                  console.log('💰 Edit balance:', e.target.value);
                  setEditLedger({ ...editLedger, opening_balance: e.target.value });
                }}
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={editLedger.created_at}
                onChange={e => {
                  console.log('📅 Edit date:', e.target.value);
                  setEditLedger({ ...editLedger, created_at: e.target.value });
                }}
              />
            </label>
            <div className="modal-controls">
              <button onClick={saveEdit}>Save</button>
              <button onClick={() => {
                console.log('❌ Cancel edit');
                setEditPopup(false);
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default LedgerPage;
