import React, { useState, useMemo } from 'react';
import { formatCurrency, formatDate } from '../utils/validators';

export default function SimilarTransactionsModal({
  isOpen,
  onClose,
  sourceTransaction,
  similarTransactions,
  categories,
  onCategorize
}) {
  const [selectedTransactionIds, setSelectedTransactionIds] = useState(new Set());
  const [selectedCategory, setSelectedCategory] = useState('');

  if (!isOpen || !sourceTransaction) return null;

  // Filter categories based on source transaction type
  const isIncome = sourceTransaction.amount > 0;
  const availableCategories = categories.filter(cat => {
    if (cat === 'Unassigned') return true;
    if (isIncome) {
      return cat.endsWith(' (Income)');
    } else {
      return !cat.endsWith(' (Income)');
    }
  });

  const handleSelectAll = () => {
    if (selectedTransactionIds.size === similarTransactions.length) {
      setSelectedTransactionIds(new Set());
    } else {
      setSelectedTransactionIds(new Set(similarTransactions.map(t => t.id)));
    }
  };

  const handleSelectTransaction = (id) => {
    const newSelected = new Set(selectedTransactionIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactionIds(newSelected);
  };

  const handleCategorize = () => {
    if (!selectedCategory) {
      alert('Please select a category');
      return;
    }

    if (selectedTransactionIds.size === 0) {
      alert('Please select at least one transaction');
      return;
    }

    onCategorize(Array.from(selectedTransactionIds), selectedCategory);
    setSelectedTransactionIds(new Set());
    setSelectedCategory('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-5xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-textDark">Similar Transactions Found</h2>
            <p className="text-sm text-gray-600 mt-1">
              Found {similarTransactions.length} similar transaction{similarTransactions.length !== 1 ? 's' : ''} to "{sourceTransaction.originalDescription || sourceTransaction.description}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-textDark text-2xl"
          >
            ×
          </button>
        </div>

        {/* Source Transaction */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-2">Selected Transaction:</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-textDark">{sourceTransaction.originalDescription || sourceTransaction.description}</p>
              <p className="text-sm text-gray-600">{formatDate(sourceTransaction.date)}</p>
            </div>
            <p className={`font-semibold ${sourceTransaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(sourceTransaction.amount)}
            </p>
          </div>
        </div>

        {/* Category Selection */}
        <div className="mb-4 p-4 bg-background rounded-lg">
          <label className="block text-sm font-medium text-textDark mb-2">
            Select Category for Selected Transactions
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field"
          >
            <option value="">Choose a category...</option>
            {availableCategories.map(cat => {
              const displayName = cat.replace(' (Income)', '');
              return <option key={cat} value={cat}>{displayName}</option>;
            })}
          </select>
        </div>

        {/* Similar Transactions Table */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-textDark">
              Select transactions to categorize ({selectedTransactionIds.size} selected)
            </h3>
            <button
              onClick={handleSelectAll}
              className="text-sm text-primary hover:underline"
            >
              {selectedTransactionIds.size === similarTransactions.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedTransactionIds.size === similarTransactions.length && similarTransactions.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-left p-3">Current Category</th>
                  <th className="text-left p-3">Account Type</th>
                </tr>
              </thead>
              <tbody>
                {similarTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      selectedTransactionIds.has(transaction.id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleSelectTransaction(transaction.id)}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedTransactionIds.has(transaction.id)}
                        onChange={() => handleSelectTransaction(transaction.id)}
                        className="w-4 h-4"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="p-3 text-sm">{formatDate(transaction.date)}</td>
                    <td className="p-3 text-sm">{transaction.originalDescription || transaction.description}</td>
                    <td className={`p-3 text-sm text-right font-semibold ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="p-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        transaction.category === 'Unassigned'
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {transaction.category || 'Unassigned'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {transaction.accountTypeName || transaction.source || transaction.bank || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleCategorize}
            className="btn-primary"
            disabled={selectedTransactionIds.size === 0 || !selectedCategory}
          >
            Categorize {selectedTransactionIds.size > 0 ? `${selectedTransactionIds.size} Transaction${selectedTransactionIds.size !== 1 ? 's' : ''}` : 'Selected'}
          </button>
        </div>
      </div>
    </div>
  );
}
