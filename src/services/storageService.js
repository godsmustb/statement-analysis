const STORAGE_KEYS = {
  TRANSACTIONS: 'bank_analyzer_transactions',
  CATEGORIES: 'bank_analyzer_categories',
  TEMPLATES: 'bank_analyzer_templates',
  VENDOR_MAPPINGS: 'bank_analyzer_vendor_mappings',
  SETTINGS: 'bank_analyzer_settings'
};

const DEFAULT_CATEGORIES = [
  'Housing',
  'Transportation',
  'Food',
  'Shopping',
  'Entertainment',
  'Healthcare',
  'Bills & Services',
  'Personal Care',
  'Travel',
  'Income',
  'Other',
  'Unassigned'
];

class StorageService {
  constructor() {
    this.initializeDefaults();
  }

  initializeDefaults() {
    if (!this.getCategories().length) {
      this.saveCategories(DEFAULT_CATEGORIES);
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

      return this.saveCategories(categories);
    }
    return false;
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
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

export default new StorageService();
