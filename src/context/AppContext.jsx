import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import storageService from '../services/storageService';
import supabaseStorageService from '../services/supabaseStorageService';
import authService from '../services/authService';
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
  // Authentication state
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Data state
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryMetadata, setCategoryMetadata] = useState({});
  const [templates, setTemplates] = useState([]);
  const [vendorMappings, setVendorMappings] = useState({});
  const [settings, setSettings] = useState({});
  const [accountTypes, setAccountTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  // Action history for undo (max 5 actions)
  const [actionHistory, setActionHistory] = useState([]);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const { data: authListener } = authService.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user || null);

      if (session?.user) {
        // User logged in - load Supabase data and migrate localStorage if needed
        loadSupabaseData(session.user.id);
      } else {
        // User logged out - load localStorage data
        loadData();
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Load data from localStorage on mount (fallback for non-authenticated users)
  useEffect(() => {
    if (!authLoading && !user) {
      loadData();
    }
  }, [authLoading, user]);

  // Set default month to current month
  useEffect(() => {
    if (!selectedMonth) {
      const now = new Date();
      setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }
  }, [selectedMonth]);

  async function checkAuth() {
    try {
      const { session, error } = await authService.getSession();
      if (error) {
        console.error('Auth check error:', error);
      }
      setSession(session);
      setUser(session?.user || null);

      if (session?.user) {
        await loadSupabaseData(session.user.id);
      } else {
        loadData();
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      loadData();
    } finally {
      setAuthLoading(false);
    }
  }

  function loadData() {
    try {
      setTransactions(storageService.getTransactions());
      setCategories(storageService.getCategories());
      setCategoryMetadata(storageService.getCategoryMetadata());
      setTemplates(storageService.getTemplates());
      setVendorMappings(storageService.getVendorMappings());
      setSettings(storageService.getSettings());
      setAccountTypes(storageService.getAccountTypes());
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data from storage');
    }
  }

  async function loadSupabaseData(userId) {
    try {
      setLoading(true);

      // Initialize defaults for new users
      await supabaseStorageService.initializeDefaults(userId);

      // Always check for localStorage data to merge
      const localTransactions = storageService.getTransactions();
      const localCategories = storageService.getCategories();
      const localAccountTypes = storageService.getAccountTypes();

      // Load from Supabase
      const [supabaseTransactions, supabaseCategories, supabaseAccountTypes] = await Promise.all([
        supabaseStorageService.getTransactions(userId),
        supabaseStorageService.getCategories(userId),
        supabaseStorageService.getAccountTypes(userId)
      ]);

      // If there's local data, merge it with Supabase data
      if (localTransactions.length > 0 || localCategories.length > 0 || localAccountTypes.length > 0) {
        console.log('Merging localStorage data with Supabase...');
        await mergeLocalStorageWithSupabase(userId, {
          localTransactions,
          localCategories,
          localAccountTypes,
          supabaseTransactions,
          supabaseCategories,
          supabaseAccountTypes
        });
      } else {
        // No local data, just use Supabase data
        setTransactions(supabaseTransactions);
        setCategories(supabaseCategories);
        setAccountTypes(supabaseAccountTypes);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading Supabase data:', error);
      setError('Failed to load data from Supabase');
      setLoading(false);
    }
  }

  async function mergeLocalStorageWithSupabase(userId, data) {
    try {
      const {
        localTransactions,
        localCategories,
        localAccountTypes,
        supabaseTransactions,
        supabaseCategories,
        supabaseAccountTypes
      } = data;

      // Merge categories (add only new ones)
      const newCategories = localCategories.filter(cat => !supabaseCategories.includes(cat));
      if (newCategories.length > 0) {
        await supabaseStorageService.saveCategories(userId, newCategories);
        console.log(`Merged ${newCategories.length} new categories`);
      }

      // Merge account types (check by name AND typeFlag)
      // IMPORTANT: Generate new UUIDs for account types from localStorage
      const newAccountTypes = localAccountTypes.filter(localAt =>
        !supabaseAccountTypes.some(supaAt =>
          supaAt.name === localAt.name && supaAt.typeFlag === localAt.typeFlag
        )
      );

      // Create a mapping of old IDs to new UUIDs
      const accountTypeIdMap = {};

      if (newAccountTypes.length > 0) {
        // Generate new UUIDs for account types
        const accountTypesWithUUIDs = newAccountTypes.map(at => {
          const newId = uuidv4();
          accountTypeIdMap[at.id] = newId; // Store mapping
          return {
            ...at,
            id: newId,
            createdAt: at.createdAt || new Date().toISOString()
          };
        });

        await supabaseStorageService.saveAccountTypes(userId, accountTypesWithUUIDs);
        console.log(`Merged ${accountTypesWithUUIDs.length} new account types with new UUIDs`);
      }

      // Merge transactions (check for duplicates by date, originalDescription, and amount)
      const isDuplicate = (local, supabase) => {
        const localDesc = local.originalDescription || local.description;
        const supaDesc = supabase.originalDescription || supabase.description;
        return local.date === supabase.date &&
               localDesc === supaDesc &&
               Math.abs(local.amount - supabase.amount) < 0.01;
      };

      const newTransactions = localTransactions.filter(localTx =>
        !supabaseTransactions.some(supaTx => isDuplicate(localTx, supaTx))
      );

      if (newTransactions.length > 0) {
        // Update accountTypeId references to use new UUIDs
        const transactionsWithUpdatedIds = newTransactions.map(tx => {
          if (tx.accountTypeId && accountTypeIdMap[tx.accountTypeId]) {
            return {
              ...tx,
              id: uuidv4(), // Generate new UUID for transaction
              accountTypeId: accountTypeIdMap[tx.accountTypeId]
            };
          }
          return {
            ...tx,
            id: uuidv4() // Generate new UUID for transaction
          };
        });

        await supabaseStorageService.saveTransactions(userId, transactionsWithUpdatedIds);
        console.log(`Merged ${transactionsWithUpdatedIds.length} new transactions`);
      }

      // Load all merged data from Supabase
      const [transactions, categories, accountTypes] = await Promise.all([
        supabaseStorageService.getTransactions(userId),
        supabaseStorageService.getCategories(userId),
        supabaseStorageService.getAccountTypes(userId)
      ]);

      setTransactions(transactions);
      setCategories(categories);
      setAccountTypes(accountTypes);

      // Clear localStorage after successful merge
      storageService.clearAllData();
      console.log('Merge complete! Cleared localStorage.');
    } catch (error) {
      console.error('Merge error:', error);
      throw error;
    }
  }

  async function migrateLocalStorageToSupabase(userId) {
    try {
      setLoading(true);
      console.log('Starting migration from localStorage to Supabase...');

      // Get all localStorage data
      const localTransactions = storageService.getTransactions();
      const localCategories = storageService.getCategories();
      const localAccountTypes = storageService.getAccountTypes();

      // Migrate categories
      if (localCategories.length > 0) {
        await supabaseStorageService.saveCategories(userId, localCategories);
        console.log(`Migrated ${localCategories.length} categories`);
      }

      // Migrate account types
      if (localAccountTypes.length > 0) {
        await supabaseStorageService.saveAccountTypes(userId, localAccountTypes);
        console.log(`Migrated ${localAccountTypes.length} account types`);
      }

      // Migrate transactions
      if (localTransactions.length > 0) {
        await supabaseStorageService.saveTransactions(userId, localTransactions);
        console.log(`Migrated ${localTransactions.length} transactions`);
      }

      // Reload from Supabase to get IDs
      await loadSupabaseData(userId);

      console.log('Migration complete!');
      setLoading(false);
    } catch (error) {
      console.error('Migration error:', error);
      setError('Failed to migrate data to Supabase');
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await authService.signOut();
      // Clear local state
      setUser(null);
      setSession(null);
      setTransactions([]);
      setCategories([]);
      setAccountTypes([]);
      // Load localStorage data
      loadData();
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Failed to sign out');
    }
  }

  // Action History Management (max 5 actions)
  function addToHistory(action) {
    setActionHistory(prev => {
      const newHistory = [action, ...prev].slice(0, 5); // Keep only last 5 actions
      return newHistory;
    });
  }

  function undoLastAction() {
    try {
      if (actionHistory.length === 0) {
        return false;
      }

      const lastAction = actionHistory[0];
      const remainingHistory = actionHistory.slice(1);

      switch (lastAction.type) {
        case 'DELETE':
          // Restore deleted transactions
          const restoredTransactions = [...transactions, ...lastAction.data.deletedTransactions];
          setTransactions(restoredTransactions);
          if (user) {
            supabaseStorageService.saveTransactions(user.id, restoredTransactions);
          } else {
            storageService.saveTransactions(restoredTransactions);
          }
          break;

        case 'CATEGORIZE':
          // Restore previous categories
          const categorizeRestored = transactions.map(t => {
            const oldData = lastAction.data.previousState.find(old => old.id === t.id);
            return oldData ? { ...t, category: oldData.category, costType: oldData.costType } : t;
          });
          setTransactions(categorizeRestored);
          if (user) {
            supabaseStorageService.saveTransactions(user.id, categorizeRestored);
          } else {
            storageService.saveTransactions(categorizeRestored);
          }
          break;

        case 'UPDATE':
          // Restore previous values
          const updateRestored = transactions.map(t =>
            t.id === lastAction.data.id ? { ...t, ...lastAction.data.previousValues } : t
          );
          setTransactions(updateRestored);
          if (user) {
            supabaseStorageService.saveTransactions(user.id, updateRestored);
          } else {
            storageService.saveTransactions(updateRestored);
          }
          break;

        default:
          return false;
      }

      setActionHistory(remainingHistory);
      return true;
    } catch (error) {
      console.error('Error undoing action:', error);
      setError('Failed to undo action');
      return false;
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

      if (user) {
        supabaseStorageService.saveTransaction(user.id, newTransaction);
      } else {
        storageService.saveTransactions(updated);
      }

      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      setError('Failed to add transaction');
      return null;
    }
  }

  async function addMultipleTransactions(newTransactions) {
    try {
      // Check for duplicates based on date, originalDescription, and amount
      const isDuplicate = (existing, newTxn) => {
        const existingDesc = existing.originalDescription || existing.description;
        const newDesc = newTxn.originalDescription || newTxn.description;
        return existing.date === newTxn.date &&
               existingDesc === newDesc &&
               Math.abs(existing.amount - newTxn.amount) < 0.01; // Allow for tiny float differences
      };

      // Filter out duplicates
      const uniqueNew = newTransactions.filter(newTxn => {
        return !transactions.some(existing => isDuplicate(existing, newTxn));
      });

      console.log(`Adding ${uniqueNew.length} unique transactions out of ${newTransactions.length} total (${newTransactions.length - uniqueNew.length} duplicates skipped)`);

      const withIds = uniqueNew.map(t => ({
        id: uuidv4(),
        ...t,
        month: t.date.substring(0, 7),
        category: t.category || 'Unassigned',
        createdAt: new Date().toISOString()
      }));

      const updated = [...transactions, ...withIds];
      setTransactions(updated);

      if (user) {
        await supabaseStorageService.saveTransactions(user.id, withIds);
      } else {
        storageService.saveTransactions(updated);
      }

      return withIds;
    } catch (error) {
      console.error('Error adding transactions:', error);
      setError('Failed to add transactions');
      return [];
    }
  }

  function updateTransaction(id, updates) {
    try {
      const previousTransaction = transactions.find(t => t.id === id);
      if (!previousTransaction) return false;

      // Track only the fields that are being updated
      const previousValues = {};
      Object.keys(updates).forEach(key => {
        previousValues[key] = previousTransaction[key];
      });

      // Add to action history
      addToHistory({
        type: 'UPDATE',
        timestamp: new Date().toISOString(),
        data: {
          id,
          previousValues,
          newValues: updates
        }
      });

      const updated = transactions.map(t =>
        t.id === id ? { ...t, ...updates } : t
      );
      setTransactions(updated);

      if (user) {
        supabaseStorageService.updateTransaction(user.id, id, updates);
      } else {
        storageService.saveTransactions(updated);
      }

      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      setError('Failed to update transaction');
      return false;
    }
  }

  function deleteTransaction(id) {
    try {
      const toDelete = transactions.find(t => t.id === id);
      if (!toDelete) return false;

      // Add to action history
      addToHistory({
        type: 'DELETE',
        timestamp: new Date().toISOString(),
        data: {
          deletedTransactions: [toDelete]
        }
      });

      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);

      if (user) {
        supabaseStorageService.deleteTransaction(user.id, id);
      } else {
        storageService.saveTransactions(updated);
      }

      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setError('Failed to delete transaction');
      return false;
    }
  }

  function deleteMultipleTransactions(ids) {
    try {
      const toDelete = transactions.filter(t => ids.includes(t.id));
      if (toDelete.length === 0) return false;

      // Add to action history
      addToHistory({
        type: 'DELETE',
        timestamp: new Date().toISOString(),
        data: {
          deletedTransactions: toDelete
        }
      });

      const updated = transactions.filter(t => !ids.includes(t.id));
      setTransactions(updated);

      if (user) {
        supabaseStorageService.deleteMultipleTransactions(user.id, ids);
      } else {
        storageService.saveTransactions(updated);
      }

      return true;
    } catch (error) {
      console.error('Error deleting transactions:', error);
      setError('Failed to delete transactions');
      return false;
    }
  }

  function categorizeTransaction(id, category) {
    try {
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) return false;

      // Get cost type for this category
      const costType = categoryMetadata[category]?.costType || null;

      // Add to action history
      addToHistory({
        type: 'CATEGORIZE',
        timestamp: new Date().toISOString(),
        data: {
          previousState: [{
            id: transaction.id,
            category: transaction.category,
            costType: transaction.costType
          }],
          newCategory: category,
          newCostType: costType
        }
      });

      return updateTransaction(id, { category, costType });
    } catch (error) {
      console.error('Error categorizing transaction:', error);
      return false;
    }
  }

  function categorizeMultipleTransactions(ids, category) {
    try {
      // Get cost type for this category
      const costType = categoryMetadata[category]?.costType || null;

      // Store previous state for undo
      const previousState = transactions
        .filter(t => ids.includes(t.id))
        .map(t => ({
          id: t.id,
          category: t.category,
          costType: t.costType
        }));

      // Add to action history
      addToHistory({
        type: 'CATEGORIZE',
        timestamp: new Date().toISOString(),
        data: {
          previousState,
          newCategory: category,
          newCostType: costType
        }
      });

      const updated = transactions.map(t =>
        ids.includes(t.id) ? { ...t, category, costType } : t
      );
      setTransactions(updated);

      if (user) {
        // Update each transaction in Supabase
        ids.forEach(id => {
          supabaseStorageService.updateTransaction(user.id, id, { category, costType });
        });
      } else {
        storageService.saveTransactions(updated);
      }

      return true;
    } catch (error) {
      console.error('Error categorizing transactions:', error);
      return false;
    }
  }

  // Category operations
  async function addCategory(categoryName) {
    try {
      if (categories.includes(categoryName)) {
        setError('Category already exists');
        return false;
      }

      const updated = [...categories, categoryName];
      setCategories(updated);

      if (user) {
        await supabaseStorageService.addCategory(user.id, categoryName);
      } else {
        storageService.saveCategories(updated);
      }

      return true;
    } catch (error) {
      console.error('Error adding category:', error);
      setError('Failed to add category');
      return false;
    }
  }

  async function deleteCategory(categoryName) {
    try {
      // Move all transactions with this category to Unassigned
      const updatedTransactions = transactions.map(t =>
        t.category === categoryName ? { ...t, category: 'Unassigned' } : t
      );
      setTransactions(updatedTransactions);

      if (user) {
        await supabaseStorageService.saveTransactions(user.id, updatedTransactions);
        await supabaseStorageService.deleteCategory(user.id, categoryName);
      } else {
        storageService.saveTransactions(updatedTransactions);
      }

      // Remove category
      const updatedCategories = categories.filter(c => c !== categoryName);
      setCategories(updatedCategories);

      if (!user) {
        storageService.saveCategories(updatedCategories);
      }

      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Failed to delete category');
      return false;
    }
  }

  async function renameCategory(oldName, newName) {
    try {
      // Update all transactions
      const updatedTransactions = transactions.map(t =>
        t.category === oldName ? { ...t, category: newName } : t
      );
      setTransactions(updatedTransactions);

      if (user) {
        await supabaseStorageService.saveTransactions(user.id, updatedTransactions);
        await supabaseStorageService.renameCategory(user.id, oldName, newName);
      } else {
        storageService.saveTransactions(updatedTransactions);
      }

      // Update categories
      const updatedCategories = categories.map(c => c === oldName ? newName : c);
      setCategories(updatedCategories);

      if (!user) {
        storageService.saveCategories(updatedCategories);
      }

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
      const withVendorMatch = transactionsToProcess.map((t, index) => ({
        ...t,
        tempId: t.id || index // Add temporary ID for matching
      })).map(t => {
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
        return withVendorMatch.map(t => {
          const { tempId, ...rest } = t;
          return rest;
        });
      }

      // Use AI for remaining transactions (pass transactions with tempId)
      const categorizations = await openaiService.categorizeTransactions(needsCategorization, categories);

      // Apply categorizations using tempId for matching
      const categorized = withVendorMatch.map(t => {
        if (t.category && t.category !== 'Unassigned') {
          return t; // Already categorized by vendor match
        }

        const aiCategory = categorizations.find(c => c.id === t.tempId);
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

      // Remove tempId before returning
      const cleaned = categorized.map(t => {
        const { tempId, ...rest } = t;
        return rest;
      });

      setLoading(false);
      return cleaned;
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

  // Account Type operations
  async function addAccountType(accountType) {
    try {
      // Allow duplicate names as long as the typeFlag is different
      if (accountTypes.some(at => at.name === accountType.name && at.typeFlag === accountType.typeFlag)) {
        setError(`Account type "${accountType.name}" with type "${accountType.typeFlag}" already exists`);
        return false;
      }

      const newAccountType = {
        id: uuidv4(),
        ...accountType,
        createdAt: new Date().toISOString()
      };

      const updated = [...accountTypes, newAccountType];
      setAccountTypes(updated);

      if (user) {
        await supabaseStorageService.addAccountType(user.id, newAccountType);
      } else {
        storageService.saveAccountTypes(updated);
      }

      return newAccountType;
    } catch (error) {
      console.error('Error adding account type:', error);
      setError('Failed to add account type');
      return false;
    }
  }

  async function updateAccountType(id, updates) {
    try {
      const updated = accountTypes.map(at =>
        at.id === id ? { ...at, ...updates } : at
      );
      setAccountTypes(updated);

      if (user) {
        await supabaseStorageService.updateAccountType(user.id, id, updates);
      } else {
        storageService.saveAccountTypes(updated);
      }

      return true;
    } catch (error) {
      console.error('Error updating account type:', error);
      setError('Failed to update account type');
      return false;
    }
  }

  async function deleteAccountType(id) {
    try {
      const updated = accountTypes.filter(at => at.id !== id);
      setAccountTypes(updated);

      if (user) {
        await supabaseStorageService.deleteAccountType(user.id, id);
      } else {
        storageService.saveAccountTypes(updated);
      }

      return true;
    } catch (error) {
      console.error('Error deleting account type:', error);
      setError('Failed to delete account type');
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

  async function clearAllTransactions() {
    try {
      setTransactions([]);

      if (user) {
        await supabaseStorageService.clearAllTransactions(user.id);
      } else {
        storageService.saveTransactions([]);
      }

      return true;
    } catch (error) {
      console.error('Error clearing transactions:', error);
      return false;
    }
  }

  async function clearAllData() {
    try {
      if (user) {
        // Clear Supabase data
        await supabaseStorageService.clearAllTransactions(user.id);
        // Re-initialize with defaults
        await supabaseStorageService.initializeDefaults(user.id);
        await loadSupabaseData(user.id);
      } else {
        storageService.clearAllData();
        loadData();
      }
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  function exportData() {
    // Export current state (works for both authenticated and non-authenticated)
    return {
      transactions,
      categories,
      accountTypes,
      exportDate: new Date().toISOString()
    };
  }

  async function importData(data) {
    try {
      if (user) {
        // Import to Supabase
        if (data.categories) await supabaseStorageService.saveCategories(user.id, data.categories);
        if (data.accountTypes) await supabaseStorageService.saveAccountTypes(user.id, data.accountTypes);
        if (data.transactions) await supabaseStorageService.saveTransactions(user.id, data.transactions);
        await loadSupabaseData(user.id);
      } else {
        storageService.importData(data);
        loadData();
      }
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  const value = {
    // Authentication state
    user,
    session,
    authLoading,
    isAuthenticated: !!user,

    // Data state
    transactions,
    categories,
    categoryMetadata,
    templates,
    vendorMappings,
    settings,
    accountTypes,
    loading,
    error,
    selectedMonth,
    selectedBank,
    actionHistory,

    // Setters
    setSelectedMonth,
    setSelectedBank,
    setError,

    // Authentication operations
    signOut: handleSignOut,

    // Transaction operations
    addTransaction,
    addMultipleTransactions,
    updateTransaction,
    deleteTransaction,
    deleteMultipleTransactions,
    undoLastAction,
    categorizeTransaction,
    categorizeMultipleTransactions,

    // Category operations
    addCategory,
    deleteCategory,
    renameCategory,
    updateCategoryCostType: (categoryName, costType) => {
      try {
        storageService.updateCategoryMetadata(categoryName, { costType });
        setCategoryMetadata(storageService.getCategoryMetadata());
        return true;
      } catch (error) {
        console.error('Error updating category cost type:', error);
        return false;
      }
    },

    // AI operations
    autoCategorizeTransactions,

    // Vendor operations
    addVendorMapping,

    // Template operations
    addTemplate,
    deleteTemplate,

    // Account Type operations
    addAccountType,
    updateAccountType,
    deleteAccountType,

    // Utility
    detectDuplicates,
    detectRecurring,
    clearAllTransactions,
    clearAllData,
    exportData,
    importData,
    loadData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
