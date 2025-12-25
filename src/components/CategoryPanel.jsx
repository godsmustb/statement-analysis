import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { validateCategoryName } from '../utils/validators';
import ConfirmationModal from './ConfirmationModal';

const CATEGORY_COLORS = [
  '#FFB3E6', '#B3E5FC', '#C5E1A5', '#FFE082', '#AED581',
  '#F8BBD0', '#B2DFDB', '#FFCCBC', '#E1BEE7', '#C5CAE9'
];

// Default expense and income categories
const DEFAULT_EXPENSE_CATEGORIES = [
  'Housing', 'Transportation', 'Food', 'Utilities', 'Healthcare',
  'Entertainment', 'Shopping', 'Personal Care', 'Education', 'Other Expenses'
];

const DEFAULT_INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Investment', 'Gift', 'Refund', 'Other Income'
];

export default function CategoryPanel({ onCategorySelect }) {
  const { transactions, categories, addCategory, deleteCategory, renameCategory } = useApp();
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState('');

  // Split categories into expense and income based on naming convention
  // Categories ending with " (Income)" are income categories
  const expenseCategories = categories.filter(c => !c.endsWith(' (Income)') && c !== 'Unassigned');
  const incomeCategories = categories.filter(c => c.endsWith(' (Income)'));

  const getCategoryColor = (index) => {
    return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  };

  const getCategoryStats = (category) => {
    const categoryTransactions = transactions.filter(t => t.category === category);
    const total = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { count: categoryTransactions.length, total };
  };

  const handleAddCategory = (isIncome) => {
    const categoryName = isIncome ? `${newCategoryName} (Income)` : newCategoryName;
    const validation = validateCategoryName(categoryName, categories);

    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    if (addCategory(categoryName)) {
      setNewCategoryName('');
      setIsAddingExpense(false);
      setIsAddingIncome(false);
      setError('');
    }
  };

  const handleRenameCategory = (oldName) => {
    const validation = validateCategoryName(editName, categories.filter(c => c !== oldName));

    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    if (renameCategory(oldName, editName)) {
      setEditingCategory(null);
      setEditName('');
      setError('');
    }
  };

  const handleDeleteCategory = (categoryName) => {
    setDeleteConfirm(categoryName);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteCategory(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const renderCategoryList = (categoryList, title, isIncome) => {
    const isAdding = isIncome ? isAddingIncome : isAddingExpense;
    const setIsAdding = isIncome ? setIsAddingIncome : setIsAddingExpense;

    return (
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-textDark">{title}</h2>
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
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name..."
              className="input-field mb-2"
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory(isIncome)}
              autoFocus
            />
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => handleAddCategory(isIncome)} className="btn-success text-sm">
                Save
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewCategoryName('');
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
          {categoryList.map((category, index) => {
            const stats = getCategoryStats(category);
            const isEditing = editingCategory === category;
            const displayName = category.replace(' (Income)', ''); // Remove (Income) suffix for display

            return (
              <div
                key={category}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-background transition-colors"
                style={{ backgroundColor: isEditing ? '#f0f0f0' : 'transparent' }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getCategoryColor(index) }}
                  />

                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input-field text-sm py-1 flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && handleRenameCategory(category)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <div className="flex-1">
                      <span className="font-medium text-textDark">{displayName}</span>
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
                        onClick={() => handleRenameCategory(category)}
                        className="text-success hover:underline text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingCategory(null);
                          setEditName('');
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
                          setEditingCategory(category);
                          setEditName(category);
                        }}
                        className="text-secondary hover:underline text-sm"
                        title="Rename"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category)}
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
    );
  };

  return (
    <>
      {renderCategoryList(expenseCategories, 'Categories for Expenses', false)}
      {renderCategoryList(incomeCategories, 'Categories for Income', true)}

      <ConfirmationModal
        isOpen={deleteConfirm !== null}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteConfirm}"? ${getCategoryStats(deleteConfirm || '').count} transactions will be moved to "Unassigned".`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  );
}
