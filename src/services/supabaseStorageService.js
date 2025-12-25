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

  async getTransactions(userId) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  async saveTransaction(userId, transaction) {
    try {
      const transactionData = {
        user_id: userId,
        ...transaction
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  }

  async saveTransactions(userId, transactions) {
    try {
      const transactionsData = transactions.map(t => ({
        user_id: userId,
        ...t
      }));

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionsData)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving transactions:', error);
      throw error;
    }
  }

  async updateTransaction(userId, id, updates) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      return data || [];
    } catch (error) {
      console.error('Error fetching account types:', error);
      return [];
    }
  }

  async saveAccountTypes(userId, accountTypes) {
    try {
      // This would typically be used for bulk updates
      // For now, we'll just ensure all account types exist
      const accountTypesData = accountTypes.map(at => ({
        user_id: userId,
        ...at
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
          ...accountType
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding account type:', error);
      throw error;
    }
  }

  async updateAccountType(userId, id, updates) {
    try {
      const { data, error } = await supabase
        .from('account_types')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
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
