// src/reports/ReportViewerModal.jsx
import React from 'react';
import './ReportViewerModal.css';
import GenericReport from './GenericReport';

export default function ReportViewerModal({
  companyId,
  reportKey,
  isOpen,
  onClose,
  companyName,
  fromDate,
  toDate,
}) {
  if (!isOpen || !reportKey) return null;

  const commonProps = { companyId, companyName, fromDate, toDate };

  const renderBody = () => {
    switch (reportKey) {
      case 'balance-sheet':
        return <GenericReport {...commonProps} reportKey="balance-sheet" title="Balance Sheet" />;
      case 'profit-and-loss':
        return <GenericReport {...commonProps} reportKey="profit-and-loss" title="Profit & Loss Account" />;
      case 'gstr-3b':
        return <GenericReport {...commonProps} reportKey="gstr-3b" title="GSTR-3B" />;
      case 'gstr-1':
        return <GenericReport {...commonProps} reportKey="gstr-1" title="GSTR-1 (JSON / e-Return)" />;
      case 'gstr-2':
        return <GenericReport {...commonProps} reportKey="gstr-2" title="GSTR-2 (e-Return)" />;
      case 'gstr-4':
        return <GenericReport {...commonProps} reportKey="gstr-4" title="GSTR-4" />;
      case 'gstr-9':
        return <GenericReport {...commonProps} reportKey="gstr-9" title="GSTR-9" />;
      case 'ledger':
        return <GenericReport {...commonProps} reportKey="ledger" title="Ledger (Account Statement)" />;
      case 'aged-payable':
        return <GenericReport {...commonProps} reportKey="aged-payable" title="Aged Payable" />;
      case 'aged-receivable':
        return <GenericReport {...commonProps} reportKey="aged-receivable" title="Aged Receivable" />;
      case 'customer-supplier-list':
        return <GenericReport {...commonProps} reportKey="customer-supplier-list" title="Customer Supplier List" />;
      case 'outstanding-payable':
        return <GenericReport {...commonProps} reportKey="outstanding-payable" title="Outstanding Payable" />;
      case 'outstanding-receivable':
        return <GenericReport {...commonProps} reportKey="outstanding-receivable" title="Outstanding Receivable" />;
      case 'inventory-item-details':
        return <GenericReport {...commonProps} reportKey="inventory-item-details" title="Inventory Item Details" />;
      case 'service-details':
        return <GenericReport {...commonProps} reportKey="service-details" title="Service Details" />;
      case 'inventory-summary':
        return <GenericReport {...commonProps} reportKey="inventory-summary" title="Inventory Summary" />;
      case 'day-book':
        return <GenericReport {...commonProps} reportKey="day-book" title="Day Book (incl. Post-Dated)" />;
      case 'cash-flow':
        return <GenericReport {...commonProps} reportKey="cash-flow" title="Cash Flow Statement" />;
      case 'purchase-register':
        return <GenericReport {...commonProps} reportKey="purchase-register" title="Purchase Register" />;
      case 'sales-register':
        return <GenericReport {...commonProps} reportKey="sales-register" title="Sales Register" />;
      case 'monthly-breakdown':
        return <GenericReport {...commonProps} reportKey="monthly-breakdown" title="Monthly Breakdown" />;
      case 'best-customer':
        return <GenericReport {...commonProps} reportKey="best-customer" title="Best Customer" />;
      case 'top-supplier':
        return <GenericReport {...commonProps} reportKey="top-supplier" title="Top Supplier" />;
      default:
        return <p>Unknown report: {reportKey}</p>;
    }
  };

  return (
    <div className="viewer-modal-backdrop">
      <div className="viewer-modal-container">
        <button className="viewer-modal-close" onClick={onClose}>×</button>
        <div className="viewer-modal-body">
          {renderBody()}
        </div>
      </div>
    </div>
  );
}


function renderTitle(key) {
  return key
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
