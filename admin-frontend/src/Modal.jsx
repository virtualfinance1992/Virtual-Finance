// src/Modal.jsx
import React from 'react'
import ReactDOM from 'react-dom'
import './DashboardPage.scss'  // make sure this path is correct

export default function Modal({ title, onClose, children }) {
  return ReactDOM.createPortal(
    <div className="erp-modal-overlay" onClick={onClose}>
      <div
        className="erp-modal-container"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>✖</button>
        </div>
        {/* BODY */}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.getElementById('modal-root')
  )
}
