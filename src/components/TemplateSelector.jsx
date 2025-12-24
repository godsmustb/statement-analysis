import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import TemplateManager from './TemplateManager';

export default function TemplateSelector({ selectedBank, onSelectBank }) {
  const { templates } = useApp();
  const [showManager, setShowManager] = useState(false);

  const bankOptions = [
    { value: 'TD Bank', label: 'TD Bank' },
    { value: 'RBC', label: 'RBC' },
    { value: 'Unknown', label: 'New/Unknown Bank' },
    ...templates
      .filter(t => !['TD Bank', 'RBC'].includes(t.bankName))
      .map(t => ({ value: t.bankName, label: t.bankName }))
  ];

  return (
    <>
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <label className="block text-sm font-semibold text-textDark mb-2">
              Select Bank
            </label>
            <select
              value={selectedBank}
              onChange={(e) => onSelectBank(e.target.value)}
              className="input-field"
            >
              <option value="">Choose a bank...</option>
              {bankOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowManager(true)}
            className="btn-secondary mt-6"
          >
            Manage Templates
          </button>
        </div>

        {selectedBank && selectedBank !== 'Unknown' && (
          <div className="mt-3 text-sm text-gray-600">
            {templates.find(t => t.bankName === selectedBank) ? (
              <span className="text-success">✓ Template found for {selectedBank}</span>
            ) : (
              <span className="text-warning">⚠ No template saved yet. PDF will be parsed using AI.</span>
            )}
          </div>
        )}
      </div>

      <TemplateManager
        isOpen={showManager}
        onClose={() => setShowManager(false)}
      />
    </>
  );
}
