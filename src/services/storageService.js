import { DEFAULT_CATEGORY_METADATA } from '../utils/categoryMetadata';

const STORAGE_KEYS = {
  TRANSACTIONS: 'bank_analyzer_transactions',
  CATEGORIES: 'bank_analyzer_categories',
  CATEGORY_METADATA: 'bank_analyzer_category_metadata',
  TEMPLATES: 'bank_analyzer_templates',
  VENDOR_MAPPINGS: 'bank_analyzer_vendor_mappings',
  SETTINGS: 'bank_analyzer_settings',
  ACCOUNT_TYPES: 'bank_analyzer_account_types'
};

// Default categories (names only)
const DEFAULT_CATEGORIES = [
  'Housing',
  'Transportation',
  'Grocery',
  'Shopping',
  'Restaurants',
  'Subscriptions',
  'Other',
  'Unassigned',
  'Main Job (Income)',
  'Side Hustle (Income)',
  'Investments (Income)'
];

const DEFAULT_ACCOUNT_TYPES = [
  { id: '1', name: 'Checking Account', typeFlag: 'Checking', createdAt: new Date().toISOString() },
  { id: '2', name: 'Savings Account', typeFlag: 'Savings', createdAt: new Date().toISOString() },
  { id: '3', name: 'Credit Card', typeFlag: 'Credit', createdAt: new Date().toISOString() }
];

class StorageService {
  constructor() {
    this.initializeDefaults();
  }

  initializeDefaults() {
    if (!this.getCategories().length) {
      this.saveCategories(DEFAULT_CATEGORIES);
    }
    if (!this.getCategoryMetadata() || Object.keys(this.getCategoryMetadata()).length === 0) {
      this.saveCategoryMetadata(DEFAULT_CATEGORY_METADATA);
    }
    if (!this.getAccountTypes().length) {
      this.saveAccountTypes(DEFAULT_ACCOUNT_TYPES);
    }
  }

  // Transactions
  getTransactions() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading transactions:', error);
      return [];
    }
  }

  saveTransactions(transactions) {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
      return true;
    } catch (error) {
      console.error('Error saving transactions:', error);
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please clear some data.');
      }
      return false;
    }
  }

  addTransaction(transaction) {
    const transactions = this.getTransactions();
    transactions.push(transaction);
    return this.saveTransactions(transactions);
  }

  updateTransaction(id, updates) {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...updates };
      return this.saveTransactions(transactions);
    }
    return false;
  }

  deleteTransaction(id) {
    const transactions = this.getTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    return this.saveTransactions(filtered);
  }

  // Categories
  getCategories() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading categories:', error);
      return [];
    }
  }

  saveCategories(categories) {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      return true;
    } catch (error) {
      console.error('Error saving categories:', error);
      return false;
    }
  }

  addCategory(categoryName) {
    const categories = this.getCategories();
    if (!categories.includes(categoryName)) {
      categories.push(categoryName);
      return this.saveCategories(categories);
    }
    return false;
  }

  deleteCategory(categoryName) {
    const categories = this.getCategories();
    const filtered = categories.filter(c => c !== categoryName);

    // Move all transactions with this category to "Unassigned"
    const transactions = this.getTransactions();
    const updated = transactions.map(t =>
      t.category === categoryName ? { ...t, category: 'Unassigned' } : t
    );
    this.saveTransactions(updated);

    return this.saveCategories(filtered);
  }

  renameCategory(oldName, newName) {
    const categories = this.getCategories();
    const index = categories.indexOf(oldName);
    if (index !== -1) {
      categories[index] = newName;

      // Update all transactions with this category
      const transactions = this.getTransactions();
      const updated = transactions.map(t =>
        t.category === oldName ? { ...t, category: newName } : t
      );
      this.saveTransactions(updated);

      // Update category metadata
      const metadata = this.getCategoryMetadata();
      if (metadata[oldName]) {
        metadata[newName] = metadata[oldName];
        delete metadata[oldName];
        this.saveCategoryMetadata(metadata);
      }

      return this.saveCategories(categories);
    }
    return false;
  }

  // Category Metadata
  getCategoryMetadata() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORY_METADATA);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error reading category metadata:', error);
      return {};
    }
  }

  saveCategoryMetadata(metadata) {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORY_METADATA, JSON.stringify(metadata));
      return true;
    } catch (error) {
      console.error('Error saving category metadata:', error);
      return false;
    }
  }

  updateCategoryMetadata(categoryName, updates) {
    const metadata = this.getCategoryMetadata();
    metadata[categoryName] = { ...metadata[categoryName], ...updates };
    return this.saveCategoryMetadata(metadata);
  }

  // Templates
  getTemplates() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading templates:', error);
      return [];
    }
  }

  saveTemplates(templates) {
    try {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
      return true;
    } catch (error) {
      console.error('Error saving templates:', error);
      return false;
    }
  }

  addTemplate(template) {
    const templates = this.getTemplates();
    const existing = templates.findIndex(t => t.bankName === template.bankName);

    if (existing !== -1) {
      templates[existing] = { ...template, lastUpdated: Date.now() };
    } else {
      templates.push({ ...template, lastUpdated: Date.now() });
    }

    return this.saveTemplates(templates);
  }

  deleteTemplate(bankName) {
    const templates = this.getTemplates();
    const filtered = templates.filter(t => t.bankName !== bankName);
    return this.saveTemplates(filtered);
  }

  getTemplateByBank(bankName) {
    const templates = this.getTemplates();
    return templates.find(t => t.bankName === bankName);
  }

  // Vendor Mappings
  getVendorMappings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VENDOR_MAPPINGS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error reading vendor mappings:', error);
      return {};
    }
  }

  saveVendorMappings(mappings) {
    try {
      localStorage.setItem(STORAGE_KEYS.VENDOR_MAPPINGS, JSON.stringify(mappings));
      return true;
    } catch (error) {
      console.error('Error saving vendor mappings:', error);
      return false;
    }
  }

  addVendorMapping(vendor, category) {
    const mappings = this.getVendorMappings();
    mappings[vendor.toUpperCase()] = category;
    return this.saveVendorMappings(mappings);
  }

  getVendorCategory(vendor) {
    const mappings = this.getVendorMappings();
    return mappings[vendor.toUpperCase()];
  }

  // Settings
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : {
        defaultBank: '',
        autoConfirmRecurring: false
      };
    } catch (error) {
      console.error('Error reading settings:', error);
      return {
        defaultBank: '',
        autoConfirmRecurring: false
      };
    }
  }

  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  // Account Types
  getAccountTypes() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACCOUNT_TYPES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading account types:', error);
      return [];
    }
  }

  saveAccountTypes(accountTypes) {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCOUNT_TYPES, JSON.stringify(accountTypes));
      return true;
    } catch (error) {
      console.error('Error saving account types:', error);
      return false;
    }
  }

  addAccountType(accountType) {
    const accountTypes = this.getAccountTypes();
    // Check if account type with same name already exists
    if (accountTypes.some(at => at.name === accountType.name)) {
      return false;
    }
    accountTypes.push(accountType);
    return this.saveAccountTypes(accountTypes);
  }

  updateAccountType(id, updates) {
    const accountTypes = this.getAccountTypes();
    const index = accountTypes.findIndex(at => at.id === id);
    if (index !== -1) {
      accountTypes[index] = { ...accountTypes[index], ...updates };
      return this.saveAccountTypes(accountTypes);
    }
    return false;
  }

  deleteAccountType(id) {
    const accountTypes = this.getAccountTypes();
    const filtered = accountTypes.filter(at => at.id !== id);
    return this.saveAccountTypes(filtered);
  }

  getAccountTypeById(id) {
    const accountTypes = this.getAccountTypes();
    return accountTypes.find(at => at.id === id);
  }

  // Clear all data
  clearAllData() {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      this.initializeDefaults();
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  // Export data
  exportData() {
    return {
      transactions: this.getTransactions(),
      categories: this.getCategories(),
      templates: this.getTemplates(),
      vendorMappings: this.getVendorMappings(),
      settings: this.getSettings(),
      accountTypes: this.getAccountTypes(),
      exportDate: new Date().toISOString()
    };
  }

  // Import data
  importData(data) {
    try {
      if (data.transactions) this.saveTransactions(data.transactions);
      if (data.categories) this.saveCategories(data.categories);
      if (data.templates) this.saveTemplates(data.templates);
      if (data.vendorMappings) this.saveVendorMappings(data.vendorMappings);
      if (data.settings) this.saveSettings(data.settings);
      if (data.accountTypes) this.saveAccountTypes(data.accountTypes);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

export default new StorageService();
