/**
 * Calculate similarity score between two strings using Levenshtein distance
 * Returns a value between 0 and 1, where 1 is identical
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0 || len2 === 0) return 0;

  // Create distance matrix
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  // Initialize first column and row
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  // Calculate distances
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - (distance / maxLen);
}

/**
 * Extract normalized description for comparison
 * Removes common payment prefixes, numbers, dates, etc.
 */
function normalizeDescription(description) {
  if (!description) return '';

  return description
    .toLowerCase()
    .trim()
    // Remove dates
    .replace(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/g, '')
    // Remove times
    .replace(/\d{1,2}:\d{2}(:\d{2})?/g, '')
    // Remove transaction IDs and reference numbers
    .replace(/#\d+/g, '')
    .replace(/ref\s*:?\s*\d+/gi, '')
    .replace(/\bid\s*:?\s*\d+/gi, '')
    // Remove common payment prefixes
    .replace(/^(payment|purchase|transfer|deposit|withdrawal)\s+/gi, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two descriptions contain similar core words
 */
function hasSimilarWords(desc1, desc2) {
  const words1 = normalizeDescription(desc1).split(' ').filter(w => w.length > 3);
  const words2 = normalizeDescription(desc2).split(' ').filter(w => w.length > 3);

  if (words1.length === 0 || words2.length === 0) return false;

  // Check if at least 50% of words match
  let matches = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || calculateSimilarity(word1, word2) > 0.8) {
        matches++;
        break;
      }
    }
  }

  const matchRatio = matches / Math.min(words1.length, words2.length);
  return matchRatio >= 0.5;
}

/**
 * Find similar transactions to a source transaction
 * @param {Object} sourceTransaction - The transaction to find matches for
 * @param {Array} allTransactions - All transactions to search through
 * @param {number} threshold - Minimum similarity score (0-1), default 0.7
 * @returns {Array} - Array of similar transactions, sorted by similarity
 */
export function findSimilarTransactions(sourceTransaction, allTransactions, threshold = 0.7) {
  if (!sourceTransaction || !allTransactions || allTransactions.length === 0) {
    return [];
  }

  const sourceDesc = sourceTransaction.originalDescription || sourceTransaction.description;
  const normalizedSource = normalizeDescription(sourceDesc);

  const similarTransactions = [];

  for (const transaction of allTransactions) {
    // Skip the source transaction itself
    if (transaction.id === sourceTransaction.id) continue;

    // Skip if different transaction types (income vs expense)
    const sourceIsIncome = sourceTransaction.amount > 0;
    const transactionIsIncome = transaction.amount > 0;
    if (sourceIsIncome !== transactionIsIncome) continue;

    const targetDesc = transaction.originalDescription || transaction.description;
    const normalizedTarget = normalizeDescription(targetDesc);

    // Calculate similarity scores
    const exactSimilarity = calculateSimilarity(sourceDesc, targetDesc);
    const normalizedSimilarity = calculateSimilarity(normalizedSource, normalizedTarget);
    const wordSimilarity = hasSimilarWords(sourceDesc, targetDesc);

    // Use the best similarity score
    const bestSimilarity = Math.max(exactSimilarity, normalizedSimilarity);

    // Transaction is similar if:
    // 1. Similarity score is above threshold, OR
    // 2. Has similar words and reasonable similarity
    if (bestSimilarity >= threshold || (wordSimilarity && bestSimilarity >= 0.5)) {
      similarTransactions.push({
        ...transaction,
        similarityScore: bestSimilarity
      });
    }
  }

  // Sort by similarity score (highest first), then by date (newest first)
  return similarTransactions.sort((a, b) => {
    if (Math.abs(a.similarityScore - b.similarityScore) > 0.05) {
      return b.similarityScore - a.similarityScore;
    }
    return new Date(b.date) - new Date(a.date);
  });
}

/**
 * Group transactions by similarity
 * Useful for bulk categorization of recurring transactions
 */
export function groupSimilarTransactions(transactions, threshold = 0.7) {
  const groups = [];
  const processed = new Set();

  for (const transaction of transactions) {
    if (processed.has(transaction.id)) continue;

    const similar = findSimilarTransactions(
      transaction,
      transactions.filter(t => !processed.has(t.id)),
      threshold
    );

    if (similar.length > 0) {
      const group = [transaction, ...similar];
      groups.push(group);

      // Mark all transactions in this group as processed
      group.forEach(t => processed.add(t.id));
    } else {
      processed.add(transaction.id);
    }
  }

  return groups;
}
