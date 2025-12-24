export function findDuplicates(transactions) {
  const duplicates = [];
  const processed = new Set();

  for (let i = 0; i < transactions.length; i++) {
    if (processed.has(i)) continue;

    const t1 = transactions[i];
    const potentialDuplicates = [];

    for (let j = i + 1; j < transactions.length; j++) {
      if (processed.has(j)) continue;

      const t2 = transactions[j];

      if (isDuplicate(t1, t2)) {
        potentialDuplicates.push({
          index: j,
          transaction: t2,
          reason: getDuplicateReason(t1, t2)
        });
        processed.add(j);
      }
    }

    if (potentialDuplicates.length > 0) {
      duplicates.push({
        original: { index: i, transaction: t1 },
        duplicates: potentialDuplicates
      });
      processed.add(i);
    }
  }

  return duplicates;
}

export function isDuplicate(t1, t2) {
  // Same amount (within $0.01)
  const amountMatch = Math.abs(t1.amount - t2.amount) <= 0.01;

  // Same or adjacent dates (within 1 day)
  const date1 = new Date(t1.date);
  const date2 = new Date(t2.date);
  const daysDiff = Math.abs((date1 - date2) / (1000 * 60 * 60 * 24));
  const dateMatch = daysDiff <= 1;

  // Similar description (90% similarity)
  const descMatch = calculateDescriptionSimilarity(t1.description, t2.description) >= 0.9;

  return amountMatch && dateMatch && descMatch;
}

export function calculateDescriptionSimilarity(desc1, desc2) {
  if (!desc1 || !desc2) return 0;

  const s1 = desc1.toLowerCase().trim();
  const s2 = desc2.toLowerCase().trim();

  if (s1 === s2) return 1;

  // Levenshtein distance
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

export function getDuplicateReason(t1, t2) {
  const reasons = [];

  if (Math.abs(t1.amount - t2.amount) <= 0.01) {
    reasons.push('Same amount');
  }

  const date1 = new Date(t1.date);
  const date2 = new Date(t2.date);
  const daysDiff = Math.abs((date1 - date2) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    reasons.push('Same date');
  } else if (daysDiff <= 1) {
    reasons.push('Adjacent dates');
  }

  const similarity = calculateDescriptionSimilarity(t1.description, t2.description);
  if (similarity >= 0.95) {
    reasons.push('Identical description');
  } else if (similarity >= 0.9) {
    reasons.push('Very similar description');
  }

  return reasons.join(', ');
}

export function findRecurringTransactions(transactions) {
  const recurring = [];
  const grouped = groupByDescription(transactions);

  for (const [description, group] of Object.entries(grouped)) {
    if (group.length < 2) continue;

    // Check if amounts are similar (within 5%)
    const avgAmount = group.reduce((sum, t) => sum + Math.abs(t.amount), 0) / group.length;
    const similarAmounts = group.every(t => {
      const diff = Math.abs(Math.abs(t.amount) - avgAmount);
      return diff <= avgAmount * 0.05;
    });

    if (similarAmounts) {
      // Check if dates are roughly monthly
      const sortedDates = group
        .map(t => new Date(t.date))
        .sort((a, b) => a - b);

      const intervals = [];
      for (let i = 1; i < sortedDates.length; i++) {
        const days = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
        intervals.push(days);
      }

      const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

      // Consider recurring if average interval is between 25-35 days (monthly)
      // or 7-10 days (weekly) or 12-16 days (bi-weekly)
      const isMonthly = avgInterval >= 25 && avgInterval <= 35;
      const isWeekly = avgInterval >= 6 && avgInterval <= 9;
      const isBiWeekly = avgInterval >= 12 && avgInterval <= 16;

      if (isMonthly || isWeekly || isBiWeekly) {
        recurring.push({
          description,
          transactions: group,
          frequency: isMonthly ? 'Monthly' : isWeekly ? 'Weekly' : 'Bi-weekly',
          avgAmount: Math.round(avgAmount * 100) / 100,
          count: group.length
        });
      }
    }
  }

  return recurring.sort((a, b) => b.count - a.count);
}

function groupByDescription(transactions) {
  const groups = {};

  for (const transaction of transactions) {
    const normalizedDesc = transaction.description.toLowerCase().trim();
    if (!groups[normalizedDesc]) {
      groups[normalizedDesc] = [];
    }
    groups[normalizedDesc].push(transaction);
  }

  return groups;
}

export function mergeDuplicateTransactions(transactions, duplicateIndexes) {
  return transactions.filter((_, index) => !duplicateIndexes.includes(index));
}

export function detectMultipleSameMonth(statementResults) {
  const byMonth = {};

  for (const result of statementResults) {
    const month = result.statementMonth;
    if (!byMonth[month]) {
      byMonth[month] = [];
    }
    byMonth[month].push(result);
  }

  const duplicateMonths = Object.entries(byMonth)
    .filter(([, results]) => results.length > 1)
    .map(([month, results]) => ({
      month,
      count: results.length,
      statements: results
    }));

  return duplicateMonths;
}
