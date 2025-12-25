import { supabase } from '../lib/supabaseClient';

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
  { name: 'TD Checking', typeFlag: 'Checking' },
  { name: 'TD Credit', typeFlag: 'Credit' },
  { name: 'RBC Checking', typeFlag: 'Checking' },
  { name: 'RBC Credit', typeFlag: 'Credit' }
];

class SupabaseStorageService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize default categories and account types for new users
   */
  async initializeDefaults(userId) {
    try {
      // Check if user already has categories
      const { data: existingCategories } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!existingCategories || existingCategories.length === 0) {
        // Insert default categories
        const categoriesToInsert = DEFAULT_CATEGORIES.map(name => ({
          user_id: userId,
          name,
          is_income: name.includes('(Income)')
        }));

        await supabase.from('categories').insert(categoriesToInsert);
      }

      // Check if user already has account types
      const { data: existingAccountTypes } = await supabase
        .from('account_types')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!existingAccountTypes || existingAccountTypes.length === 0) {
        // Insert default account types
        const accountTypesToInsert = DEFAULT_ACCOUNT_TYPES.map(at => ({
          user_id: userId,
          ...at
        }));

        await supabase.from('account_types').insert(accountTypesToInsert);
      }

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing defaults:', error);
    }
  }

  // ============================================
  // TRANSACTIONS
  // ============================================

  // Helper function to transform transaction from snake_case (DB) to camelCase (App)
  _transformTransactionFromDB(t) {
    if (!t) return null;
    return {
      id: t.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      category: t.category,
      source: t.source,
      bank: t.bank,
      month: t.month,
      accountNumber: t.account_number,
      accountTypeId: t.account_type_id,
      accountTypeName: t.account_type_name,
      accountTypeFlag: t.account_type_flag,
      originalDescription: t.original_description,
      costType: t.cost_type,
      createdAt: t.created_at
    };
  }

  // Helper function to transform transaction from camelCase (App) to snake_case (DB)
  _transformTransactionToDB(t, userId) {
    return {
      id: t.id,
      user_id: userId,
      date: t.date,
      description: t.description,
      amount: t.amount,
      category: t.category,
      source: t.source,
      bank: t.bank,
      month: t.month,
      account_number: t.accountNumber,
      account_type_id: t.accountTypeId,
      account_type_name: t.accountTypeName,
      account_type_flag: t.accountTypeFlag,
      original_description: t.originalDescription,
      cost_type: t.costType,
      created_at: t.createdAt || new Date().toISOString()
    };
  }

  async getTransactions(userId) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;

      // Transform all transactions from snake_case to camelCase
      return (data || []).map(t => this._transformTransactionFromDB(t));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  async saveTransaction(userId, transaction) {
    try {
      // Transform from camelCase to snake_case
      const transactionData = this._transformTransactionToDB(transaction, userId);

      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) throw error;

      // Transform response back to camelCase
      return this._transformTransactionFromDB(data);
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  }

  async saveTransactions(userId, transactions) {
    try {
      // Transform all transactions from camelCase to snake_case
      const transactionsData = transactions.map(t => this._transformTransactionToDB(t, userId));

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionsData)
        .select();

      if (error) throw error;

      // Transform all responses back to camelCase
      return (data || []).map(t => this._transformTransactionFromDB(t));
    } catch (error) {
      console.error('Error saving transactions:', error);
      throw error;
    }
  }

  async updateTransaction(userId, id, updates) {
    try {
      // Transform updates from camelCase to snake_case
      const supabaseUpdates = {};
      if (updates.date !== undefined) supabaseUpdates.date = updates.date;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.amount !== undefined) supabaseUpdates.amount = updates.amount;
      if (updates.category !== undefined) supabaseUpdates.category = updates.category;
      if (updates.source !== undefined) supabaseUpdates.source = updates.source;
      if (updates.bank !== undefined) supabaseUpdates.bank = updates.bank;
      if (updates.month !== undefined) supabaseUpdates.month = updates.month;
      if (updates.accountNumber !== undefined) supabaseUpdates.account_number = updates.accountNumber;
      if (updates.accountTypeId !== undefined) supabaseUpdates.account_type_id = updates.accountTypeId;
      if (updates.accountTypeName !== undefined) supabaseUpdates.account_type_name = updates.accountTypeName;
      if (updates.accountTypeFlag !== undefined) supabaseUpdates.account_type_flag = updates.accountTypeFlag;
      if (updates.originalDescription !== undefined) supabaseUpdates.original_description = updates.originalDescription;
      if (updates.costType !== undefined) supabaseUpdates.cost_type = updates.costType;

      const { data, error } = await supabase
        .from('transactions')
        .update(supabaseUpdates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Transform response back to camelCase
      return this._transformTransactionFromDB(data);
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  async deleteTransaction(userId, id) {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  async deleteMultipleTransactions(userId, ids) {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', ids)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting transactions:', error);
      throw error;
    }
  }

  async clearAllTransactions(userId) {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing transactions:', error);
      throw error;
    }
  }

  // ============================================
  // CATEGORIES
  // ============================================

  async getCategories(userId) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;

      // Return just the category names as an array (to match existing interface)
      return data ? data.map(c => c.name) : [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  async saveCategories(userId, categories) {
    try {
      // First, get existing categories
      const { data: existing } = await supabase
        .from('categories')
        .select('name')
        .eq('user_id', userId);

      const existingNames = new Set(existing?.map(c => c.name) || []);

      // Only insert new categories that don't exist
      const newCategories = categories
        .filter(name => !existingNames.has(name))
        .map(name => ({
          user_id: userId,
          name,
          is_income: name.includes('(Income)')
        }));

      if (newCategories.length > 0) {
        const { error } = await supabase
          .from('categories')
          .insert(newCategories);

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error saving categories:', error);
      throw error;
    }
  }

  async addCategory(userId, name) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          user_id: userId,
          name,
          is_income: name.includes('(Income)')
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }

  async deleteCategory(userId, name) {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('user_id', userId)
        .eq('name', name);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  async renameCategory(userId, oldName, newName) {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: newName, is_income: newName.includes('(Income)') })
        .eq('user_id', userId)
        .eq('name', oldName);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error renaming category:', error);
      throw error;
    }
  }

  // ============================================
  // ACCOUNT TYPES
  // ============================================

  async getAccountTypes(userId) {
    try {
      const { data, error } = await supabase
        .from('account_types')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;

      // Transform snake_case to camelCase for the app
      return (data || []).map(at => ({
        id: at.id,
        name: at.name,
        typeFlag: at.type_flag,
        createdAt: at.created_at
      }));
    } catch (error) {
      console.error('Error fetching account types:', error);
      return [];
    }
  }

  async saveAccountTypes(userId, accountTypes) {
    try {
      // Transform camelCase to snake_case for Supabase
      const accountTypesData = accountTypes.map(at => ({
        id: at.id,
        user_id: userId,
        name: at.name,
        type_flag: at.typeFlag,
        created_at: at.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('account_types')
        .upsert(accountTypesData, { onConflict: 'id' });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving account types:', error);
      throw error;
    }
  }

  async addAccountType(userId, accountType) {
    try {
      const { data, error } = await supabase
        .from('account_types')
        .insert([{
          user_id: userId,
          name: accountType.name,
          type_flag: accountType.typeFlag,
          created_at: accountType.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Transform snake_case back to camelCase for the app
      return {
        id: data.id,
        name: data.name,
        typeFlag: data.type_flag,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error adding account type:', error);
      throw error;
    }
  }

  async updateAccountType(userId, id, updates) {
    try {
      // Transform camelCase to snake_case for Supabase
      const supabaseUpdates = {};
      if (updates.name !== undefined) supabaseUpdates.name = updates.name;
      if (updates.typeFlag !== undefined) supabaseUpdates.type_flag = updates.typeFlag;
      supabaseUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('account_types')
        .update(supabaseUpdates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Transform snake_case back to camelCase for the app
      return {
        id: data.id,
        name: data.name,
        typeFlag: data.type_flag,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error updating account type:', error);
      throw error;
    }
  }

  async deleteAccountType(userId, id) {
    try {
      const { error } = await supabase
        .from('account_types')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting account type:', error);
      throw error;
    }
  }
}

export default new SupabaseStorageService();
