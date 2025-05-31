import React from 'react';
import './OutstandingCard.css';

const OutstandingCard = ({
  title,
  totalLabel,
  totalValue    = 0,
  current       = 0,
  overdue1_15   = 0,
  overdue16_30  = 0,
  overdue30plus = 0,
}) => {
  // helper to turn a bucket value into % of totalValue
  const pct = value =>
    totalValue > 0 ? Math.round((value / totalValue) * 1000) / 10 : 0;

  return (
    <div className="outstanding-card">
      <div className="outstanding-header">
        <h3>{title}</h3>
        <button className="toggle-button" />
      </div>

      <div className="outstanding-total">
        <span>Total {totalLabel}</span>
        <span className="amount">
          ₹{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* ─── Stacked segments replace single fill ─── */}
      <div className="progress-bar">
        <div
          className="progress-segment green"
          style={{ width: `${pct(current)}%` }}
        />
        <div
          className="progress-segment yellow"
          style={{ width: `${pct(overdue1_15)}%` }}
        />
        <div
          className="progress-segment orange"
          style={{ width: `${pct(overdue16_30)}%` }}
        />
        <div
          className="progress-segment red"
          style={{ width: `${pct(overdue30plus)}%` }}
        />
      </div>

      <div className="outstanding-details">
        <div className="detail-item">
          <span className="dot green" />
          <strong>₹{current.toLocaleString()}</strong>
          <span className="label">CURRENT</span>
        </div>
        <div className="detail-item">
          <span className="dot yellow" />
          <strong>₹{overdue1_15.toLocaleString()}</strong>
          <span className="label">OVERDUE</span>
          <span className="days">1–15 Days</span>
        </div>
        <div className="detail-item">
          <span className="dot orange" />
          <strong>₹{overdue16_30.toLocaleString()}</strong>
          <span className="label">16–30 Days</span>
        </div>
        <div className="detail-item">
          <span className="dot red" />
          <strong>₹{overdue30plus.toLocaleString()}</strong>
          <span className="label">30+ Days</span>
        </div>
      </div>
    </div>
  );
};

export default OutstandingCard;
