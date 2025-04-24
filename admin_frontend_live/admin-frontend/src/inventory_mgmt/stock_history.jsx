import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StockHistoryPage = ({ companyId, companyName }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`http://localhost:8000/api/inventory/history/${companyId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) throw new Error('Failed to fetch history');
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) fetchHistory();
  }, [companyId]);

  const filteredLogs = logs.filter(log => {
    const matchesItem = log.item_name.toLowerCase().includes(filterText.toLowerCase());
    const inDateRange = (!startDate || new Date(log.date) >= new Date(startDate)) &&
                        (!endDate || new Date(log.date) <= new Date(endDate));
    return matchesItem && inDateRange;
  });

  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const exportCSV = () => {
    const headers = ['Date', 'Item', 'Type', 'Change', 'Remaining', 'Reference'];
    const rows = filteredLogs.map(log => [
      log.date, log.item_name, log.change_type, log.quantity_changed, log.resulting_quantity, log.reference || '-'
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const fileName = `${companyName || 'company'}_stock_history.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`${companyName || 'Company'} - Stock History Report`, 14, 16);
    autoTable(doc, {
      startY: 20,
      head: [['Date', 'Item', 'Type', 'Change', 'Remaining', 'Reference']],
      body: filteredLogs.map(log => [
        log.date, log.item_name, log.change_type, log.quantity_changed, log.resulting_quantity, log.reference || '-'
      ])
    });
    const fileName = `${companyName || 'company'}_stock_history.pdf`;
    doc.save(fileName);
  };

  const handleRowClick = (itemName) => {
    setSelectedItem(itemName);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Stock History ({companyName})</h2>
      <div className="flex flex-col md:flex-row gap-4 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Filter by item name"
          className="p-2 border rounded w-full md:w-1/3"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
        <input
          type="date"
          className="p-2 border rounded"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
        />
        <input
          type="date"
          className="p-2 border rounded"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
        />
        <button onClick={exportCSV} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Export CSV</button>
        <button onClick={exportPDF} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Export PDF</button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2">Date</th>
                <th className="border px-4 py-2">Item</th>
                <th className="border px-4 py-2">Type</th>
                <th className="border px-4 py-2">Change</th>
                <th className="border px-4 py-2">Remaining</th>
                <th className="border px-4 py-2">Reference</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log, index) => (
                <tr key={index} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(log.item_name)}>
                  <td className="border px-4 py-2">{log.date}</td>
                  <td className="border px-4 py-2">{log.item_name}</td>
                  <td className="border px-4 py-2">{log.change_type}</td>
                  <td className="border px-4 py-2">{log.quantity_changed}</td>
                  <td className="border px-4 py-2">{log.resulting_quantity}</td>
                  <td className="border px-4 py-2">{log.reference || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-between items-center">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >Prev</button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockHistoryPage;