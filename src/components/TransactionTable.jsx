import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/validators';

export default function TransactionTable() {
  const {
    transactions,
    categories,
    deleteTransaction,
    updateTransaction,
    categorizeTransaction,
    categorizeMultipleTransactions,
    clearAllTransactions,
    undoDelete,
    deletedTransactions
  } = useApp();

  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [draggedCategory, setDraggedCategory] = useState(null);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Note: Removed selectedMonth and selectedBank filters to show all transactions

    // Filter by category
    if (filterCategory) {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    // Filter by status
    if (filterStatus === 'categorized') {
      filtered = filtered.filter(t => t.category && t.category !== 'Unassigned');
    } else if (filterStatus === 'unassigned') {
      filtered = filtered.filter(t => !t.category || t.category === 'Unassigned');
    }

    // Sort
    filtered.sort((a, b) => {
      let compareA, compareB;

      switch (sortBy) {
        case 'date':
          compareA = new Date(a.date);
          compareB = new Date(b.date);
          break;
        case 'amount':
          compareA = Math.abs(a.amount);
          compareB = Math.abs(b.amount);
          break;
        case 'description':
          compareA = a.description.toLowerCase();
          compareB = b.description.toLowerCase();
          break;
        case 'category':
          compareA = a.category || 'zzz';
          compareB = b.category || 'zzz';
          break;
        default:
          return 0;
      }

      if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [transactions, filterCategory, filterStatus, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleSelectTransaction = (id) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleBulkCategorize = (category) => {
    if (selectedTransactions.size > 0) {
      categorizeMultipleTransactions(Array.from(selectedTransactions), category);
      setSelectedTransactions(new Set());
    }
  };

  const handleDragStart = (e, transactionId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('transactionId', transactionId);
  };

  const handleDrop = (e, category) => {
    e.preventDefault();
    const transactionId = e.dataTransfer.getData('transactionId');
    if (transactionId) {
      categorizeTransaction(transactionId, category);
    }
    setDraggedCategory(null);
  };

  const handleDragOver = (e, category) => {
    e.preventDefault();
    setDraggedCategory(category);
  };

  const handleDragLeave = () => {
    setDraggedCategory(null);
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-textDark">
          Transactions ({filteredTransactions.length})
        </h2>

        <div className="flex items-center gap-3">
          {selectedTransactions.size > 0 && (
            <>
              <span className="text-sm text-gray-600">
                {selectedTransactions.size} selected
              </span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkCategorize(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="text-sm border-2 border-primary rounded-lg px-3 py-1"
              >
                <option value="">Bulk Categorize...</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </>
          )}
          {deletedTransactions.length > 0 && (
            <button
              onClick={() => undoDelete()}
              className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Undo Delete ({deletedTransactions.length})
            </button>
          )}
          {transactions.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all transactions? This cannot be undone.')) {
                  clearAllTransactions();
                }
              }}
              className="text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-textDark mb-1">
            Filter by Category
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-field"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-textDark mb-1">
            Filter by Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field"
          >
            <option value="">All Transactions</option>
            <option value="categorized">Categorized</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left p-3">
                <input
                  type="checkbox"
                  checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4"
                />
              </th>
              <th
                className="text-left p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('date')}
              >
                Date {getSortIcon('date')}
              </th>
              <th className="text-left p-3">
                Transaction
              </th>
              <th
                className="text-left p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('description')}
              >
                Description {getSortIcon('description')}
              </th>
              <th
                className="text-left p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('amount')}
              >
                Amount {getSortIcon('amount')}
              </th>
              <th
                className="text-left p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('category')}
              >
                Category {getSortIcon('category')}
              </th>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Account Number</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center p-8 text-gray-500">
                  No transactions found. Upload a bank statement to get started!
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, transaction.id)}
                  className="border-b border-gray-100 hover:bg-background transition-colors cursor-move"
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={() => handleSelectTransaction(transaction.id)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="p-3 text-sm">{formatDate(transaction.date)}</td>
                  <td className="p-3 text-sm max-w-xs truncate" title={transaction.originalDescription || transaction.description}>
                    {transaction.originalDescription || transaction.description}
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={transaction.description || ''}
                      onChange={(e) => updateTransaction(transaction.id, { description: e.target.value })}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                      placeholder="Enter custom name..."
                      title={transaction.description}
                    />
                  </td>
                  <td className={`p-3 text-sm font-semibold ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="p-3">
                    <select
                      value={transaction.category || 'Unassigned'}
                      onChange={(e) => categorizeTransaction(transaction.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-sm">{transaction.source || transaction.bank}</td>
                  <td className="p-3 text-sm">{transaction.accountNumber || '-'}</td>
                  <td className="p-3">
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this transaction?')) {
                          deleteTransaction(transaction.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Category Drop Zones */}
      {filteredTransactions.length > 0 && (
        <div className="mt-6 p-4 bg-background rounded-lg">
          <p className="text-sm font-semibold text-textDark mb-3">
            Drag transactions to categories:
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <div
                key={category}
                onDrop={(e) => handleDrop(e, category)}
                onDragOver={(e) => handleDragOver(e, category)}
                onDragLeave={handleDragLeave}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  draggedCategory === category
                    ? 'border-primary bg-primary bg-opacity-20 scale-105'
                    : 'border-gray-300 bg-white hover:border-secondary'
                }`}
              >
                <span className="text-sm font-medium">{category}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
