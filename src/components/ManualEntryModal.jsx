import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { validateTransaction, parseFormAmount } from '../utils/validators';
import openaiService from '../services/openaiService';

export default function ManualEntryModal({ isOpen, onClose }) {
  const { addTransaction, categories, templates } = useApp();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    bank: '',
    isIncome: false,
    category: 'Unassigned'
  });
  const [errors, setErrors] = useState([]);
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [suggesting, setSuggesting] = useState(false);

  if (!isOpen) return null;

  const bankOptions = [
    'TD Bank',
    'RBC',
    ...templates.map(t => t.bankName).filter(name => !['TD Bank', 'RBC'].includes(name)),
    'Other'
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  const handleSuggestCategory = async () => {
    if (!formData.description) {
      setErrors(['Please enter a description first']);
      return;
    }

    setSuggesting(true);
    try {
      const suggestion = await openaiService.suggestCategoryForDescription(
        formData.description,
        categories
      );

      if (suggestion.confidence > 0.7) {
        setSuggestedCategory(suggestion);
      } else {
        setSuggestedCategory({ category: 'Unassigned', confidence: 0 });
      }
    } catch (error) {
      console.error('Error suggesting category:', error);
    } finally {
      setSuggesting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const transaction = {
      ...formData,
      amount: formData.isIncome
        ? Math.abs(parseFormAmount(formData.amount))
        : -Math.abs(parseFormAmount(formData.amount))
    };

    const validation = validateTransaction(transaction);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    addTransaction(transaction);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      bank: '',
      isIncome: false,
      category: 'Unassigned'
    });
    setErrors([]);
    setSuggestedCategory(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-textDark">Add Transaction</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-textDark text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-textDark mb-2">
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-textDark mb-2">
              Description *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="input-field"
              placeholder="e.g., Grocery shopping at Walmart"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-textDark mb-2">
              Amount *
            </label>
            <input
              type="text"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              className="input-field"
              placeholder="e.g., 45.99"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-textDark mb-2">
              Bank *
            </label>
            <select
              value={formData.bank}
              onChange={(e) => handleChange('bank', e.target.value)}
              className="input-field"
              required
            >
              <option value="">Select a bank</option>
              {bankOptions.map(bank => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isIncome"
              checked={formData.isIncome}
              onChange={(e) => handleChange('isIncome', e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isIncome" className="text-sm font-medium text-textDark">
              This is income (not an expense)
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-textDark mb-2">
              Category
            </label>
            <div className="flex gap-2">
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="input-field flex-1"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSuggestCategory}
                disabled={suggesting || !formData.description}
                className="btn-secondary whitespace-nowrap"
              >
                {suggesting ? 'Suggesting...' : 'AI Suggest'}
              </button>
            </div>

            {suggestedCategory && suggestedCategory.confidence > 0 && (
              <div className="mt-2 p-2 bg-accent bg-opacity-20 rounded-lg">
                <p className="text-sm">
                  <strong>Suggested:</strong> {suggestedCategory.category}
                  {' '}
                  <span className="text-gray-600">
                    ({Math.round(suggestedCategory.confidence * 100)}% confident)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleChange('category', suggestedCategory.category)}
                    className="ml-2 text-primary underline"
                  >
                    Apply
                  </button>
                </p>
              </div>
            )}
          </div>

          {errors.length > 0 && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
              <ul className="list-disc list-inside text-sm text-red-700">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-textDark rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Add Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
