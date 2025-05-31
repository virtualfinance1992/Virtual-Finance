import React from 'react';
import './ReportsModal.css';

const reportCategories = {
  'Financial Statements': [
    { key: 'balance-sheet', label: 'Balance Sheet' },
    { key: 'profit-and-loss', label: 'Profit & Loss Account' }
  ],
  'GST Reports': [
    { key: 'gstr-3b', label: 'GSTR-3B' },
    { key: 'gstr-1', label: 'GSTR-1 (JSON / e-Return)' },
    { key: 'gstr-2', label: 'GSTR-2 (e-Return)' },
    { key: 'gstr-4', label: 'GSTR-4' },
    { key: 'gstr-9', label: 'GSTR-9' }
  ],
  'Accounting Reports': [
    { key: 'ledger', label: 'Ledger (Account Statement)' },
    { key: 'aged-payable', label: 'Aged Payable' },
    { key: 'aged-receivable', label: 'Aged Receivable' },
    { key: 'customer-supplier-list', label: 'Customer Supplier List' },
    { key: 'outstanding-payable', label: 'Outstanding Payable' },
    { key: 'outstanding-receivable', label: 'Outstanding Receivable' }
  ],
  'Inventory Reports': [
    { key: 'inventory-item-details', label: 'Inventory Item Details' },
    { key: 'service-details', label: 'Service Details' },
    { key: 'inventory-summary', label: 'Inventory Summary' }
  ],
  'Summary Reports': [
    { key: 'day-book', label: 'Day Book (incl. Post-Dated)' },
    { key: 'cash-flow', label: 'Cash Flow Statement' },
    { key: 'purchase-register', label: 'Purchase Register' },
    { key: 'sales-register', label: 'Sales Register' },
    { key: 'monthly-breakdown', label: 'Monthly Breakdown' },
    { key: 'best-customer', label: 'Best Customer' },
    { key: 'top-supplier', label: 'Top Supplier' }
  ]
};

export default function ReportsModal({ isOpen, onClose, onSelectReport }) {
  if (!isOpen) return null;

  return (
    <div className="reports-modal-backdrop">
      <div className="reports-modal-container">
        <header className="reports-modal-header">
          <h1>Reports</h1>
          <p className="reports-modal-subheading">
            Choose a report below to view or export
          </p>
          <button className="reports-modal-close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="reports-modal-body">
          {Object.entries(reportCategories).map(([category, items]) => (
            <section key={category} className="reports-category-section">
              <h2 className="reports-category-title">{category}</h2>
              <div className="reports-button-grid">
                {items.map(r => (
                  <button
                    key={r.key}
                    className="reports-button"
                    onClick={() => onSelectReport(r.key)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
