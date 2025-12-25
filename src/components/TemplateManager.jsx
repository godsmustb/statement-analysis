import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

export default function TemplateManager({ isOpen, onClose }) {
  const { transactions, accountTypes, updateTransaction, deleteMultipleTransactions } = useApp();
  const [expandedUploads, setExpandedUploads] = useState(new Set());
  const [editingUpload, setEditingUpload] = useState(null);
  const [editAccountTypeId, setEditAccountTypeId] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');

  if (!isOpen) return null;

  // Organize transactions by unique upload (accountTypeId + accountNumber + month)
  const organizedData = useMemo(() => {
    const byUpload = {};

    transactions.forEach(transaction => {
      // Create unique upload key
      const accountTypeId = transaction.accountTypeId || 'unknown';
      const accountTypeName = transaction.accountTypeName || transaction.source || transaction.bank || 'Unknown';
      const accountNumber = transaction.accountNumber || 'N/A';
      const month = transaction.month || transaction.date.substring(0, 7); // YYYY-MM

      const uploadKey = `${accountTypeId}-${accountNumber}-${month}`;

      if (!byUpload[uploadKey]) {
        byUpload[uploadKey] = {
          accountTypeId,
          accountTypeName,
          accountNumber,
          month,
          count: 0,
          transactions: []
        };
      }

      byUpload[uploadKey].count++;
      byUpload[uploadKey].transactions.push(transaction);
    });

    return byUpload;
  }, [transactions]);

  const toggleUpload = (uploadKey) => {
    const newExpanded = new Set(expandedUploads);
    if (newExpanded.has(uploadKey)) {
      newExpanded.delete(uploadKey);
    } else {
      newExpanded.add(uploadKey);
    }
    setExpandedUploads(newExpanded);
  };

  const handleEditClick = (uploadKey, uploadData) => {
    setEditingUpload(uploadKey);
    setEditAccountTypeId(uploadData.accountTypeId);
    setEditAccountNumber(uploadData.accountNumber);
  };

  const handleSaveEdit = (uploadKey, uploadData) => {
    // Update all transactions in this upload with new account type and account number
    const selectedAccountType = accountTypes.find(at => at.id === editAccountTypeId);

    if (!selectedAccountType) {
      alert('Please select a valid account type');
      return;
    }

    uploadData.transactions.forEach(transaction => {
      updateTransaction(transaction.id, {
        accountTypeId: editAccountTypeId,
        accountTypeName: selectedAccountType.name,
        accountTypeFlag: selectedAccountType.typeFlag,
        accountNumber: editAccountNumber
      });
    });

    setEditingUpload(null);
    setEditAccountTypeId('');
    setEditAccountNumber('');
  };

  const handleCancelEdit = () => {
    setEditingUpload(null);
    setEditAccountTypeId('');
    setEditAccountNumber('');
  };

  const handleDelete = (uploadKey, uploadData) => {
    if (window.confirm(`Are you sure you want to delete this statement with ${uploadData.count} transactions?`)) {
      const transactionIds = uploadData.transactions.map(t => t.id);
      deleteMultipleTransactions(transactionIds);
    }
  };

  const uploadKeys = Object.keys(organizedData).sort((a, b) => {
    // Sort by month descending (most recent first)
    return organizedData[b].month.localeCompare(organizedData[a].month);
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-4xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-textDark">Manage Uploads</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-textDark text-2xl"
          >
            ×
          </button>
        </div>

        {uploadKeys.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No statements uploaded yet.</p>
            <p className="text-sm mt-2">Upload bank statements to manage them here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {uploadKeys.map(uploadKey => {
              const uploadData = organizedData[uploadKey];
              const isExpanded = expandedUploads.has(uploadKey);
              const isEditing = editingUpload === uploadKey;
              const monthName = new Date(uploadData.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

              // Calculate statement duration (date range)
              const dates = uploadData.transactions.map(t => new Date(t.date)).sort((a, b) => a - b);
              const startDate = dates[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const endDate = dates[dates.length - 1]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const duration = startDate && endDate ? `${startDate} - ${endDate}` : '';

              return (
                <div key={uploadKey} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Upload Header */}
                  <div className="p-4 bg-background">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-lg mt-1">📄</span>
                        <div className="flex-1">
                          {isEditing ? (
                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Account Type</label>
                                <select
                                  value={editAccountTypeId}
                                  onChange={(e) => setEditAccountTypeId(e.target.value)}
                                  className="input-field text-sm py-1 w-full"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="">Select account type...</option>
                                  {accountTypes.map(at => (
                                    <option key={at.id} value={at.id}>
                                      {at.name} ({at.typeFlag})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Account Number</label>
                                <input
                                  type="text"
                                  value={editAccountNumber}
                                  onChange={(e) => setEditAccountNumber(e.target.value)}
                                  className="input-field text-sm py-1 w-full"
                                  placeholder="e.g., ****1234"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <h3 className="font-semibold text-textDark">
                                {uploadData.accountTypeName} • {uploadData.accountNumber}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">{monthName}</p>
                              <p className="text-sm text-gray-600">{uploadData.count} transactions</p>
                              {duration && <p className="text-xs text-gray-400 mt-1">📅 {duration}</p>}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {isEditing ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveEdit(uploadKey, uploadData);
                              }}
                              className="text-success hover:underline text-sm px-2 py-1"
                            >
                              Save
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEdit();
                              }}
                              className="text-gray-500 hover:underline text-sm px-2 py-1"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(uploadKey, uploadData);
                              }}
                              className="text-secondary hover:underline text-sm px-2 py-1"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(uploadKey, uploadData);
                              }}
                              className="text-red-500 hover:underline text-sm px-2 py-1"
                              title="Delete"
                            >
                              🗑️
                            </button>
                            <button
                              onClick={() => toggleUpload(uploadKey)}
                              className="text-gray-400 hover:text-gray-600 px-2 py-1"
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Transaction List */}
                  {isExpanded && !isEditing && (
                    <div className="border-t border-gray-200 bg-white max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left p-2 text-xs font-medium text-gray-600">Date</th>
                            <th className="text-left p-2 text-xs font-medium text-gray-600">Description</th>
                            <th className="text-right p-2 text-xs font-medium text-gray-600">Amount</th>
                            <th className="text-left p-2 text-xs font-medium text-gray-600">Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadData.transactions.map(transaction => (
                            <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="p-2 text-xs">{new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                              <td className="p-2 text-xs truncate max-w-xs" title={transaction.description}>{transaction.description}</td>
                              <td className={`p-2 text-xs text-right font-medium ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ${Math.abs(transaction.amount).toFixed(2)}
                              </td>
                              <td className="p-2 text-xs">{transaction.category || 'Unassigned'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 p-4 bg-secondary bg-opacity-10 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>💡 Tip:</strong> Each upload is grouped by Account Type, Account Number, and Month. You can edit the account details or delete entire uploads.
          </p>
        </div>
      </div>
    </div>
  );
}
