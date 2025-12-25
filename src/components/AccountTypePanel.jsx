import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import ConfirmationModal from './ConfirmationModal';

const ACCOUNT_TYPE_FLAGS = ['Checking', 'Savings', 'Credit', 'Loan'];

const ACCOUNT_TYPE_COLORS = [
  '#FFB3E6', '#B3E5FC', '#C5E1A5', '#FFE082', '#AED581',
  '#F8BBD0', '#B2DFDB', '#FFCCBC', '#E1BEE7', '#C5CAE9'
];

export default function AccountTypePanel() {
  const { accountTypes, addAccountType, updateAccountType, deleteAccountType, transactions } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [newAccountTypeName, setNewAccountTypeName] = useState('');
  const [newAccountTypeFlag, setNewAccountTypeFlag] = useState('Checking');
  const [editingAccountType, setEditingAccountType] = useState(null);
  const [editName, setEditName] = useState('');
  const [editTypeFlag, setEditTypeFlag] = useState('Checking');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState('');

  const getAccountTypeColor = (index) => {
    return ACCOUNT_TYPE_COLORS[index % ACCOUNT_TYPE_COLORS.length];
  };

  const getAccountTypeStats = (accountType) => {
    const accountTypeTransactions = transactions.filter(t => t.accountTypeId === accountType.id);
    const total = accountTypeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { count: accountTypeTransactions.length, total };
  };

  const handleAddAccountType = () => {
    const trimmedName = newAccountTypeName.trim();

    if (!trimmedName) {
      setError('Account type name is required');
      return;
    }

    if (accountTypes.some(at => at.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('Account type already exists');
      return;
    }

    const result = addAccountType({
      name: trimmedName,
      typeFlag: newAccountTypeFlag
    });

    if (result) {
      setNewAccountTypeName('');
      setNewAccountTypeFlag('Checking');
      setIsAdding(false);
      setError('');
    } else {
      setError('Failed to add account type');
    }
  };

  const handleUpdateAccountType = (id) => {
    const trimmedName = editName.trim();

    if (!trimmedName) {
      setError('Account type name is required');
      return;
    }

    // Check if name already exists (excluding current account type)
    if (accountTypes.some(at => at.id !== id && at.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('Account type already exists');
      return;
    }

    if (updateAccountType(id, { name: trimmedName, typeFlag: editTypeFlag })) {
      setEditingAccountType(null);
      setEditName('');
      setEditTypeFlag('Checking');
      setError('');
    } else {
      setError('Failed to update account type');
    }
  };

  const handleDeleteAccountType = (accountType) => {
    setDeleteConfirm(accountType);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteAccountType(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <>
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-textDark">Account Types</h2>
          <button
            onClick={() => setIsAdding(true)}
            className="btn-primary text-sm"
          >
            + Add
          </button>
        </div>

        {isAdding && (
          <div className="mb-4 p-3 bg-background rounded-lg">
            <input
              type="text"
              value={newAccountTypeName}
              onChange={(e) => setNewAccountTypeName(e.target.value)}
              placeholder="Account type name (e.g., TD Checking)..."
              className="input-field mb-2"
              onKeyPress={(e) => e.key === 'Enter' && handleAddAccountType()}
              autoFocus
            />
            <select
              value={newAccountTypeFlag}
              onChange={(e) => setNewAccountTypeFlag(e.target.value)}
              className="input-field mb-2"
            >
              {ACCOUNT_TYPE_FLAGS.map(flag => (
                <option key={flag} value={flag}>{flag}</option>
              ))}
            </select>
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleAddAccountType} className="btn-success text-sm">
                Save
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewAccountTypeName('');
                  setNewAccountTypeFlag('Checking');
                  setError('');
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
          {accountTypes.map((accountType, index) => {
            const stats = getAccountTypeStats(accountType);
            const isEditing = editingAccountType === accountType.id;

            return (
              <div
                key={accountType.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-background transition-colors"
                style={{ backgroundColor: isEditing ? '#f0f0f0' : 'transparent' }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getAccountTypeColor(index) }}
                  />

                  {isEditing ? (
                    <div className="flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input-field text-sm py-1 mb-2"
                        onKeyPress={(e) => e.key === 'Enter' && handleUpdateAccountType(accountType.id)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                      <select
                        value={editTypeFlag}
                        onChange={(e) => setEditTypeFlag(e.target.value)}
                        className="input-field text-sm py-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ACCOUNT_TYPE_FLAGS.map(flag => (
                          <option key={flag} value={flag}>{flag}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-textDark">{accountType.name}</span>
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">{accountType.typeFlag}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {stats.count} transactions • ${stats.total.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleUpdateAccountType(accountType.id)}
                        className="text-success hover:underline text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingAccountType(null);
                          setEditName('');
                          setEditTypeFlag('Checking');
                          setError('');
                        }}
                        className="text-gray-500 hover:underline text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingAccountType(accountType.id);
                          setEditName(accountType.name);
                          setEditTypeFlag(accountType.typeFlag);
                        }}
                        className="text-secondary hover:underline text-sm"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteAccountType(accountType)}
                        className="text-red-500 hover:underline text-sm"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteConfirm !== null}
        title="Delete Account Type"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? ${getAccountTypeStats(deleteConfirm || { id: '' }).count} transactions will be affected.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  );
}
