import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/validators';
import { findSimilarTransactions } from '../utils/similarityMatcher';
import SimilarTransactionsModal from './SimilarTransactionsModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

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
  const [editingDescriptionId, setEditingDescriptionId] = useState(null);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const [selectedSourceTransaction, setSelectedSourceTransaction] = useState(null);
  const [similarTransactionsList, setSimilarTransactionsList] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

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
      <div className="overflow-x-auto max-h-[1500px] overflow-y-auto">
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
              <th
                className="text-left p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('description')}
              >
                Transaction / Description {getSortIcon('description')}
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
              <th className="text-left p-3">Account Type</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center p-8 text-gray-500">
                  No transactions found. Upload a bank statement to get started!
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => {
                // Filter categories based on transaction type
                const isIncome = transaction.amount > 0;
                const availableCategories = categories.filter(cat => {
                  if (cat === 'Unassigned') return true; // Always show Unassigned
                  if (isIncome) {
                    return cat.endsWith(' (Income)'); // Income transactions show only income categories
                  } else {
                    return !cat.endsWith(' (Income)'); // Expense transactions show only expense categories
                  }
                });

                return (<tr
                  key={transaction.id}
                  className="border-b border-gray-100 hover:bg-background transition-colors"
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
                  <td className="p-3 relative group">
                    {editingDescriptionId === transaction.id ? (
                      <input
                        type="text"
                        value={transaction.description || ''}
                        onChange={(e) => updateTransaction(transaction.id, { description: e.target.value })}
                        onBlur={() => setEditingDescriptionId(null)}
                        onKeyPress={(e) => e.key === 'Enter' && setEditingDescriptionId(null)}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                        placeholder="Enter custom description..."
                        autoFocus
                      />
                    ) : (
                      <div
                        className="text-sm max-w-xs truncate cursor-pointer"
                        onClick={() => setEditingDescriptionId(transaction.id)}
                      >
                        {transaction.description && transaction.description !== transaction.originalDescription
                          ? transaction.description
                          : (transaction.originalDescription || transaction.description)}

                        {/* Tooltip on hover */}
                        <div className="hidden group-hover:block absolute z-10 bg-gray-800 text-white text-xs rounded px-2 py-1 mt-1 whitespace-normal max-w-sm">
                          {transaction.description && transaction.description !== transaction.originalDescription
                            ? `Original: ${transaction.originalDescription || transaction.description}`
                            : 'Click to add custom description'}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className={`p-3 text-sm font-semibold ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="p-3">
                    <select
                      value={transaction.category || 'Unassigned'}
                      onChange={(e) => {
                        const category = e.target.value;

                        // Only check for similar transactions if user is actively categorizing (not Unassigned)
                        if (category && category !== 'Unassigned') {
                          const similar = findSimilarTransactions(transaction, transactions);

                          if (similar.length > 0) {
                            // Found similar transactions - show modal
                            setSelectedSourceTransaction(transaction);
                            setSimilarTransactionsList(similar);
                            setShowSimilarModal(true);
                            // Don't categorize yet - wait for user to select in modal
                          } else {
                            // No similar transactions - just categorize this one
                            categorizeTransaction(transaction.id, category);
                          }
                        } else {
                          // User selected "Unassigned" - just categorize normally
                          categorizeTransaction(transaction.id, category);
                        }
                      }}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {availableCategories.map(cat => {
                        // Display name without (Income) suffix
                        const displayName = cat.replace(' (Income)', '');
                        return <option key={cat} value={cat}>{displayName}</option>;
                      })}
                    </select>
                  </td>
                  <td className="p-3 text-sm">{transaction.accountTypeName || transaction.source || transaction.bank}</td>
                  <td className="p-3">
                    <button
                      onClick={() => {
                        setTransactionToDelete(transaction.id);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Similar Transactions Modal */}
      <SimilarTransactionsModal
        isOpen={showSimilarModal}
        onClose={() => {
          setShowSimilarModal(false);
          setSelectedSourceTransaction(null);
          setSimilarTransactionsList([]);
        }}
        sourceTransaction={selectedSourceTransaction}
        similarTransactions={similarTransactionsList}
        categories={categories}
        onCategorize={(transactionIds, category) => {
          // Include the source transaction ID in the bulk categorization
          const allTransactionIds = selectedSourceTransaction
            ? [...transactionIds, selectedSourceTransaction.id]
            : transactionIds;

          // Categorize all transactions (similar + source) in one call
          categorizeMultipleTransactions(allTransactionIds, category);

          // Close modal
          setShowSimilarModal(false);
          setSelectedSourceTransaction(null);
          setSimilarTransactionsList([]);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setTransactionToDelete(null);
        }}
        onConfirm={() => {
          if (transactionToDelete) {
            deleteTransaction(transactionToDelete);
          }
          setShowDeleteModal(false);
          setTransactionToDelete(null);
        }}
        message="Are you sure you want to delete this transaction?"
      />
    </div>
  );
}
