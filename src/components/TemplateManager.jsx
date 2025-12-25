import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

export default function TemplateManager({ isOpen, onClose }) {
  const { transactions } = useApp();
  const [expandedSources, setExpandedSources] = useState(new Set());

  if (!isOpen) return null;

  // Organize transactions by Source and Month
  const organizedData = useMemo(() => {
    const bySource = {};

    transactions.forEach(transaction => {
      const source = transaction.source || transaction.bank || 'Unknown';
      const month = transaction.month || transaction.date.substring(0, 7); // YYYY-MM

      if (!bySource[source]) {
        bySource[source] = {};
      }

      if (!bySource[source][month]) {
        bySource[source][month] = {
          count: 0,
          transactions: []
        };
      }

      bySource[source][month].count++;
      bySource[source][month].transactions.push(transaction);
    });

    return bySource;
  }, [transactions]);

  const toggleSource = (source) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(source)) {
      newExpanded.delete(source);
    } else {
      newExpanded.add(source);
    }
    setExpandedSources(newExpanded);
  };

  const sources = Object.keys(organizedData).sort();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-textDark">Statement Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-textDark text-2xl"
          >
            ×
          </button>
        </div>

        {sources.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No statements uploaded yet.</p>
            <p className="text-sm mt-2">Upload bank statements to organize them here by Source and Month.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map(source => {
              const months = Object.keys(organizedData[source]).sort().reverse(); // Most recent first
              const isExpanded = expandedSources.has(source);
              const totalTransactions = months.reduce((sum, month) => sum + organizedData[source][month].count, 0);

              return (
                <div key={source} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Source Header */}
                  <button
                    onClick={() => toggleSource(source)}
                    className="w-full flex items-center justify-between p-4 bg-background hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{isExpanded ? '📂' : '📁'}</span>
                      <div className="text-left">
                        <h3 className="font-semibold text-textDark">{source}</h3>
                        <p className="text-sm text-gray-600">
                          {months.length} month{months.length !== 1 ? 's' : ''} • {totalTransactions} transaction{totalTransactions !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                  </button>

                  {/* Month List */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-white">
                      {months.map(month => {
                        const monthData = organizedData[source][month];
                        const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                        // Calculate statement duration (date range)
                        const dates = monthData.transactions.map(t => new Date(t.date)).sort((a, b) => a - b);
                        const startDate = dates[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        const endDate = dates[dates.length - 1]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        const duration = startDate && endDate ? `${startDate} - ${endDate}` : '';

                        return (
                          <div
                            key={month}
                            className="flex items-center justify-between p-3 px-6 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-base">📄</span>
                              <div className="flex-1">
                                <p className="font-medium text-textDark">{monthName}</p>
                                <p className="text-xs text-gray-500">{monthData.count} transactions</p>
                                {duration && <p className="text-xs text-gray-400 mt-1">📅 {duration}</p>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 p-4 bg-secondary bg-opacity-10 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>💡 Tip:</strong> Statements are automatically organized by the Source (account nickname) you entered during upload and grouped by month.
          </p>
        </div>
      </div>
    </div>
  );
}
