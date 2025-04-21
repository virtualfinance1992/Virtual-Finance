import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ChartOfAccounts.css';

const ChartOfAccounts = () => {
  const token = localStorage.getItem('accessToken');
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [groups, setGroups] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [customFormVisible, setCustomFormVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    group_name: '',
    nature: '',
    description: '',
    is_contra: false,
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchGroups();
      fetchLedgers();
    }
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/admin/company/list/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(res.data);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const fetchGroups = async () => {
    if (!selectedCompanyId) return;
    try {
      setLoading(true);
      const res = await axios.get(
        `http://127.0.0.1:8000/api/accounting/list/${selectedCompanyId}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGroups(res.data);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedgers = async () => {
    if (!selectedCompanyId) return;
    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/accounting/ledger/list/${selectedCompanyId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLedgers(res.data);
    } catch (err) {
      console.error('Failed to fetch ledgers:', err);
    }
  };

  const handleDefaultChart = async () => {
    if (!selectedCompanyId) return alert('❌ No company selected!');
    if (!window.confirm('Are you sure you want to create the Default Chart of Accounts?')) return;

    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/api/accounting/create-default/${selectedCompanyId}/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 201) {
        fetchGroups();
        fetchLedgers();
        localStorage.setItem('chartType', 'default');
        toast.success("✅ Default Chart of Accounts and Ledgers created!");
        setTimeout(() => navigate(`/dashboard/${selectedCompanyId}`), 1500);
      } else {
        toast.error('❌ Failed to create Chart of Accounts.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('❌ Error occurred while creating Chart of Accounts.');
    }
  };

  const handleCreateCustomGroup = async (e) => {
    e.preventDefault();
    if (!selectedCompanyId) return alert('❌ No company selected!');

    try {
      await axios.post(
        `http://127.0.0.1:8000/api/accounting/create-group/${selectedCompanyId}/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      toast.success('✅ Custom Group Created!');
      setFormData({ group_name: '', nature: '', description: '', is_contra: false });
      setCustomFormVisible(false);
      fetchGroups();
    } catch (err) {
      console.error('Error creating group:', err);
      toast.error('❌ Failed to create group.');
    }
  };

  const handleDashboardRedirect = () => {
    if (!selectedCompanyId) {
      alert("❌ Please select a company first.");
      return;
    }
    navigate(`/dashboard/${selectedCompanyId}`);
  };

  return (
    <div className="coa-dashboard">
      <div className="coa-header">
        <h2>Chart of Accounts</h2>
        <div className="company-select">
          <label>Company:</label>
          <select value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)}>
            <option value="">-- Select Company --</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="coa-actions">
        <button className="custom-btn" onClick={() => setCustomFormVisible(!customFormVisible)}>
          ➕ Custom Group
        </button>
        <button className="default-btn" onClick={handleDefaultChart}>
          🧩 Default Chart
        </button>
        <button className="dashboard-btn" onClick={handleDashboardRedirect}>
          📊 Go to Dashboard
        </button>
      </div>

      {customFormVisible && (
        <form className="coa-form" onSubmit={handleCreateCustomGroup}>
          <input
            type="text"
            placeholder="Group Name"
            value={formData.group_name}
            onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
            required
          />
          <select
            value={formData.nature}
            onChange={(e) => setFormData({ ...formData, nature: e.target.value })}
            required
          >
            <option value="">-- Nature --</option>
            <option value="Asset">Asset</option>
            <option value="Liability">Liability</option>
            <option value="Equity">Equity</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
          </select>
          <input
            type="text"
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <label>
            <input
              type="checkbox"
              checked={formData.is_contra}
              onChange={(e) => setFormData({ ...formData, is_contra: e.target.checked })}
            /> Contra
          </label>
          <button type="submit">Save Group</button>
        </form>
      )}

      <div className="group-cards">
        {loading ? (
          <p>Loading groups...</p>
        ) : (
          groups.length === 0 ? (
            <p className="no-data">No account groups found.</p>
          ) : (
            groups.map(group => (
              <div key={group.id} className="group-card">
                <h4>{group.group_name}</h4>
                <p><strong>Nature:</strong> {group.nature}</p>
                {group.description && <p><strong>Note:</strong> {group.description}</p>}
                {group.is_contra && <span className="badge">Contra</span>}

                <div className="ledgers">
                  <strong>Ledgers:</strong>
                  <ul>
                    {ledgers.filter(l => l.account_group === group.id).length > 0 ? (
                      ledgers
                        .filter(l => l.account_group === group.id)
                        .map(ledger => (
                          <li key={ledger.id}>{ledger.name} (Balance: {ledger.opening_balance})</li>
                        ))
                    ) : (
                      <li>No ledgers found for this group.</li>
                    )}
                  </ul>
                </div>
              </div>
            ))
          )
        )}
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default ChartOfAccounts;
