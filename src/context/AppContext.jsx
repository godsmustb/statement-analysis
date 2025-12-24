import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import storageService from '../services/storageService';
import openaiService from '../services/openaiService';
import { findDuplicates, findRecurringTransactions } from '../utils/duplicateDetector';
import { fuzzyMatchVendor, extractVendorName } from '../utils/fuzzyMatch';

const AppContext = createContext();

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

export function AppProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [vendorMappings, setVendorMappings] = useState({});
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedBank, setSelectedBank] = useState('');

  // Load data from localStorage on mount
  useEffect(() => {
    loadData();
  }, []);

  // Set default month to current month
  useEffect(() => {
    if (!selectedMonth) {
      const now = new Date();
      setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }
  }, [selectedMonth]);

  function loadData() {
    try {
      setTransactions(storageService.getTransactions());
      setCategories(storageService.getCategories());
      setTemplates(storageService.getTemplates());
      setVendorMappings(storageService.getVendorMappings());
      setSettings(storageService.getSettings());
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data from storage');
    }
  }

  // Transaction operations
  function addTransaction(transaction) {
    try {
      const newTransaction = {
        id: uuidv4(),
        ...transaction,
        month: transaction.date.substring(0, 7), // YYYY-MM
        category: transaction.category || 'Unassigned',
        createdAt: new Date().toISOString()
      };

      const updated = [...transactions, newTransaction];
      setTransactions(updated);
      storageService.saveTransactions(updated);

      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      setError('Failed to add transaction');
      return null;
    }
  }

  function addMultipleTransactions(newTransactions) {
    try {
      const withIds = newTransactions.map(t => ({
        id: uuidv4(),
        ...t,
        month: t.date.substring(0, 7),
        category: t.category || 'Unassigned',
        createdAt: new Date().toISOString()
      }));

      const updated = [...transactions, ...withIds];
      setTransactions(updated);
      storageService.saveTransactions(updated);

      return withIds;
    } catch (error) {
      console.error('Error adding transactions:', error);
      setError('Failed to add transactions');
      return [];
    }
  }

  function updateTransaction(id, updates) {
    try {
      const updated = transactions.map(t =>
        t.id === id ? { ...t, ...updates } : t
      );
      setTransactions(updated);
      storageService.saveTransactions(updated);
      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      setError('Failed to update transaction');
      return false;
    }
  }

  function deleteTransaction(id) {
    try {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      storageService.saveTransactions(updated);
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setError('Failed to delete transaction');
      return false;
    }
  }

  function deleteMultipleTransactions(ids) {
    try {
      const updated = transactions.filter(t => !ids.includes(t.id));
      setTransactions(updated);
      storageService.saveTransactions(updated);
      return true;
    } catch (error) {
      console.error('Error deleting transactions:', error);
      setError('Failed to delete transactions');
      return false;
    }
  }

  function categorizeTransaction(id, category) {
    return updateTransaction(id, { category });
  }

  function categorizeMultipleTransactions(ids, category) {
    try {
      const updated = transactions.map(t =>
        ids.includes(t.id) ? { ...t, category } : t
      );
      setTransactions(updated);
      storageService.saveTransactions(updated);
      return true;
    } catch (error) {
      console.error('Error categorizing transactions:', error);
      return false;
    }
  }

  // Category operations
  function addCategory(categoryName) {
    try {
      if (categories.includes(categoryName)) {
        setError('Category already exists');
        return false;
      }

      const updated = [...categories, categoryName];
      setCategories(updated);
      storageService.saveCategories(updated);
      return true;
    } catch (error) {
      console.error('Error adding category:', error);
      setError('Failed to add category');
      return false;
    }
  }

  function deleteCategory(categoryName) {
    try {
      // Move all transactions with this category to Unassigned
      const updatedTransactions = transactions.map(t =>
        t.category === categoryName ? { ...t, category: 'Unassigned' } : t
      );
      setTransactions(updatedTransactions);
      storageService.saveTransactions(updatedTransactions);

      // Remove category
      const updatedCategories = categories.filter(c => c !== categoryName);
      setCategories(updatedCategories);
      storageService.saveCategories(updatedCategories);

      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Failed to delete category');
      return false;
    }
  }

  function renameCategory(oldName, newName) {
    try {
      // Update all transactions
      const updatedTransactions = transactions.map(t =>
        t.category === oldName ? { ...t, category: newName } : t
      );
      setTransactions(updatedTransactions);
      storageService.saveTransactions(updatedTransactions);

      // Update categories
      const updatedCategories = categories.map(c => c === oldName ? newName : c);
      setCategories(updatedCategories);
      storageService.saveCategories(updatedCategories);

      return true;
    } catch (error) {
      console.error('Error renaming category:', error);
      setError('Failed to rename category');
      return false;
    }
  }

  // AI Categorization
  async function autoCategorizeTransactions(transactionsToProcess) {
    setLoading(true);
    setError(null);

    try {
      // First, check vendor mappings
      const withVendorMatch = transactionsToProcess.map(t => {
        const match = fuzzyMatchVendor(t.description, vendorMappings);
        if (match && match.confidence >= 0.8) {
          return { ...t, category: match.category, confidence: match.confidence, source: 'vendor' };
        }
        return t;
      });

      // Get transactions that still need categorization
      const needsCategorization = withVendorMatch.filter(t => !t.category || t.category === 'Unassigned');

      if (needsCategorization.length === 0) {
        setLoading(false);
        return withVendorMatch;
      }

      // Use AI for remaining transactions
      const categorizations = await openaiService.categorizeTransactions(needsCategorization, categories);

      // Apply categorizations
      const categorized = withVendorMatch.map(t => {
        if (t.category && t.category !== 'Unassigned') {
          return t; // Already categorized by vendor match
        }

        const aiCategory = categorizations.find(c => c.id === t.id);
        if (aiCategory) {
          return {
            ...t,
            category: aiCategory.category,
            confidence: aiCategory.confidence,
            source: 'ai',
            reasoning: aiCategory.reasoning
          };
        }

        return { ...t, category: 'Unassigned', confidence: 0, source: 'none' };
      });

      setLoading(false);
      return categorized;
    } catch (error) {
      console.error('Auto-categorization error:', error);
      setError(error.message);
      setLoading(false);
      return transactionsToProcess.map(t => ({ ...t, category: 'Unassigned' }));
    }
  }

  // Vendor mapping operations
  function addVendorMapping(description, category) {
    try {
      const vendor = extractVendorName(description);
      const updated = { ...vendorMappings, [vendor.toUpperCase()]: category };
      setVendorMappings(updated);
      storageService.saveVendorMappings(updated);
      return true;
    } catch (error) {
      console.error('Error adding vendor mapping:', error);
      return false;
    }
  }

  // Template operations
  function addTemplate(template) {
    try {
      const existing = templates.find(t => t.bankName === template.bankName);
      let updated;

      if (existing) {
        updated = templates.map(t =>
          t.bankName === template.bankName ? { ...template, lastUpdated: Date.now() } : t
        );
      } else {
        updated = [...templates, { ...template, lastUpdated: Date.now() }];
      }

      setTemplates(updated);
      storageService.saveTemplates(updated);
      return true;
    } catch (error) {
      console.error('Error adding template:', error);
      return false;
    }
  }

  function deleteTemplate(bankName) {
    try {
      const updated = templates.filter(t => t.bankName !== bankName);
      setTemplates(updated);
      storageService.saveTemplates(updated);
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  }

  // Utility functions
  function detectDuplicates() {
    return findDuplicates(transactions);
  }

  function detectRecurring() {
    return findRecurringTransactions(transactions);
  }

  function clearAllData() {
    try {
      storageService.clearAllData();
      loadData();
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  function exportData() {
    return storageService.exportData();
  }

  function importData(data) {
    try {
      storageService.importData(data);
      loadData();
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  const value = {
    // State
    transactions,
    categories,
    templates,
    vendorMappings,
    settings,
    loading,
    error,
    selectedMonth,
    selectedBank,

    // Setters
    setSelectedMonth,
    setSelectedBank,
    setError,

    // Transaction operations
    addTransaction,
    addMultipleTransactions,
    updateTransaction,
    deleteTransaction,
    deleteMultipleTransactions,
    categorizeTransaction,
    categorizeMultipleTransactions,

    // Category operations
    addCategory,
    deleteCategory,
    renameCategory,

    // AI operations
    autoCategorizeTransactions,

    // Vendor operations
    addVendorMapping,

    // Template operations
    addTemplate,
    deleteTemplate,

    // Utility
    detectDuplicates,
    detectRecurring,
    clearAllData,
    exportData,
    importData,
    loadData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
