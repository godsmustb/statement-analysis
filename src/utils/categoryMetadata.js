// Category metadata with cost type information
// Cost Type: 'Fixed' or 'Variable'

export const COST_TYPE_FIXED = 'Fixed';
export const COST_TYPE_VARIABLE = 'Variable';

// Default category metadata
export const DEFAULT_CATEGORY_METADATA = {
  // Expense categories
  'Housing': { isIncome: false, costType: COST_TYPE_FIXED },
  'Transportation': { isIncome: false, costType: COST_TYPE_FIXED },
  'Grocery': { isIncome: false, costType: COST_TYPE_VARIABLE },
  'Shopping': { isIncome: false, costType: COST_TYPE_VARIABLE },
  'Restaurants': { isIncome: false, costType: COST_TYPE_VARIABLE },
  'Subscriptions': { isIncome: false, costType: COST_TYPE_VARIABLE },
  'Other': { isIncome: false, costType: COST_TYPE_VARIABLE },
  'Unassigned': { isIncome: false, costType: null },

  // Income categories
  'Main Job (Income)': { isIncome: true, costType: COST_TYPE_FIXED },
  'Side Hustle (Income)': { isIncome: true, costType: COST_TYPE_VARIABLE },
  'Investments (Income)': { isIncome: true, costType: COST_TYPE_VARIABLE }
};

/**
 * Get cost type for a category
 * @param {string} categoryName - Category name
 * @param {object} metadata - Category metadata object
 * @returns {string|null} - 'Fixed', 'Variable', or null
 */
export function getCategoryCostType(categoryName, metadata = {}) {
  const combined = { ...DEFAULT_CATEGORY_METADATA, ...metadata };
  return combined[categoryName]?.costType || null;
}

/**
 * Check if a category is an income category
 * @param {string} categoryName - Category name
 * @param {object} metadata - Category metadata object
 * @returns {boolean}
 */
export function isCategoryIncome(categoryName, metadata = {}) {
  const combined = { ...DEFAULT_CATEGORY_METADATA, ...metadata };
  return combined[categoryName]?.isIncome || false;
}

/**
 * Update cost type for a category
 * @param {object} metadata - Current metadata object
 * @param {string} categoryName - Category name
 * @param {string} costType - 'Fixed' or 'Variable'
 * @returns {object} - Updated metadata
 */
export function updateCategoryCostType(metadata, categoryName, costType) {
  return {
    ...metadata,
    [categoryName]: {
      ...metadata[categoryName],
      costType
    }
  };
}

/**
 * Get cost type badge style (for UI display)
 * @param {string} costType - 'Fixed' or 'Variable'
 * @returns {object} - Style object
 */
export function getCostTypeBadgeStyle(costType) {
  if (costType === COST_TYPE_FIXED) {
    return {
      backgroundColor: '#FF6B35', // Orange
      color: '#FFFFFF',
      label: 'FIXED'
    };
  } else if (costType === COST_TYPE_VARIABLE) {
    return {
      backgroundColor: '#4ECDC4', // Blue
      color: '#FFFFFF',
      label: 'VARIABLE'
    };
  }
  return null;
}
