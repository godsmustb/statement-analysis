export function validateTransaction(transaction) {
  const errors = [];

  if (!transaction.date) {
    errors.push('Date is required');
  } else if (!isValidDate(transaction.date)) {
    errors.push('Invalid date format (use YYYY-MM-DD)');
  }

  if (!transaction.description || transaction.description.trim() === '') {
    errors.push('Description is required');
  }

  if (transaction.amount === undefined || transaction.amount === null) {
    errors.push('Amount is required');
  } else if (typeof transaction.amount !== 'number' || isNaN(transaction.amount)) {
    errors.push('Amount must be a valid number');
  }

  if (!transaction.bank || transaction.bank.trim() === '') {
    errors.push('Bank is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function isValidDate(dateString) {
  if (!dateString) return false;

  // Check format YYYY-MM-DD
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  const timestamp = date.getTime();

  if (isNaN(timestamp)) return false;

  // Check if date is reasonable (not in far future)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  return date <= maxDate;
}

export function validateAmount(amount) {
  if (amount === undefined || amount === null || amount === '') {
    return { isValid: false, error: 'Amount is required' };
  }

  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : amount;

  if (isNaN(num)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }

  if (num === 0) {
    return { isValid: false, error: 'Amount cannot be zero' };
  }

  return { isValid: true, value: num };
}

export function validateDescription(description) {
  if (!description || description.trim() === '') {
    return { isValid: false, error: 'Description is required' };
  }

  if (description.length > 200) {
    return { isValid: false, error: 'Description is too long (max 200 characters)' };
  }

  return { isValid: true };
}

export function validateCategoryName(categoryName, existingCategories = []) {
  if (!categoryName || categoryName.trim() === '') {
    return { isValid: false, error: 'Category name is required' };
  }

  if (categoryName.length > 50) {
    return { isValid: false, error: 'Category name is too long (max 50 characters)' };
  }

  if (existingCategories.includes(categoryName)) {
    return { isValid: false, error: 'Category already exists' };
  }

  return { isValid: true };
}

export function validateFile(file, maxSizeMB = 10) {
  const errors = [];

  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }

  // Check file type
  const validTypes = ['application/pdf'];
  if (!validTypes.includes(file.type)) {
    errors.push('Only PDF files are supported');
  }

  // Check file size
  const maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${maxSizeMB}MB limit`);
  }

  // Check file name
  if (!file.name || file.name.trim() === '') {
    errors.push('File must have a valid name');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateBankName(bankName) {
  if (!bankName || bankName.trim() === '') {
    return { isValid: false, error: 'Bank name is required' };
  }

  if (bankName.length > 100) {
    return { isValid: false, error: 'Bank name is too long' };
  }

  return { isValid: true };
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 500); // Limit length
}

export function formatCurrency(amount) {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount);
  }

  if (isNaN(amount)) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return '';

  try {
    // Parse date as local time to avoid timezone offset issues
    // Input format: YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Toronto' // Use a consistent timezone
    }).format(date);
  } catch (error) {
    return dateString;
  }
}

export function parseFormAmount(value) {
  if (!value) return 0;

  // Remove currency symbols and commas
  const cleaned = value.toString().replace(/[$,\s]/g, '');

  // Handle negative values
  const isNegative = cleaned.includes('-') || cleaned.startsWith('(');
  const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));

  return isNaN(num) ? 0 : (isNegative ? -Math.abs(num) : num);
}
