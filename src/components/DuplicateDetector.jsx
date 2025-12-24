import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/validators';

export default function DuplicateDetector() {
  const { transactions, deleteTransaction, detectDuplicates } = useApp();
  const [duplicates, setDuplicates] = useState([]);
  const [resolved, setResolved] = useState(new Set());

  useEffect(() => {
    if (transactions.length > 0) {
      const found = detectDuplicates();
      setDuplicates(found);
    }
  }, [transactions.length]);

  if (duplicates.length === 0) {
    return null;
  }

  const handleKeep = (groupIndex, transactionId, toDelete) => {
    // Delete the other transaction(s)
    toDelete.forEach(id => {
      if (id !== transactionId) {
        deleteTransaction(id);
      }
    });

    // Mark as resolved
    setResolved(prev => new Set([...prev, groupIndex]));
  };

  const handleKeepBoth = (groupIndex) => {
    setResolved(prev => new Set([...prev, groupIndex]));
  };

  const visibleDuplicates = duplicates.filter((_, index) => !resolved.has(index));

  if (visibleDuplicates.length === 0) {
    return null;
  }

  return (
    <div className="card mb-6 border-2 border-warning">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">⚠️</span>
        <h2 className="text-xl font-bold text-textDark">
          Potential Duplicates Found ({visibleDuplicates.length})
        </h2>
      </div>

      <div className="space-y-4">
        {visibleDuplicates.map((group, groupIndex) => {
          const originalIndex = duplicates.indexOf(group);
          const allTransactions = [
            group.original.transaction,
            ...group.duplicates.map(d => d.transaction)
          ];
          const allIds = allTransactions.map(t => t.id);

          return (
            <div key={originalIndex} className="p-4 bg-warning bg-opacity-10 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {allTransactions.map((transaction, idx) => (
                  <div
                    key={transaction.id}
                    className="p-3 bg-white rounded-lg border-2 border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-textDark">
                        Transaction {idx + 1}
                      </span>
                      <button
                        onClick={() => handleKeep(originalIndex, transaction.id, allIds)}
                        className="text-sm btn-success py-1 px-3"
                      >
                        Keep This
                      </button>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="font-medium">Date:</span> {formatDate(transaction.date)}
                      </p>
                      <p>
                        <span className="font-medium">Description:</span> {transaction.description}
                      </p>
                      <p>
                        <span className="font-medium">Amount:</span> {formatCurrency(transaction.amount)}
                      </p>
                      <p>
                        <span className="font-medium">Bank:</span> {transaction.bank}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {group.duplicates.length > 0 && (
                <div className="text-sm text-gray-600 mb-3">
                  <strong>Reason:</strong> {group.duplicates[0].reason}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleKeepBoth(originalIndex)}
                  className="btn-secondary text-sm"
                >
                  Keep Both
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
