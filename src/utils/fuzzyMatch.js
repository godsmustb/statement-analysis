import Fuse from 'fuse.js';

export function fuzzyMatchVendor(description, vendorMappings, threshold = 0.8) {
  if (!description) return null;

  const vendors = Object.keys(vendorMappings);
  if (vendors.length === 0) return null;

  // Direct match first (case-insensitive)
  const upperDesc = description.toUpperCase();
  for (const vendor of vendors) {
    if (upperDesc.includes(vendor)) {
      return {
        vendor,
        category: vendorMappings[vendor],
        confidence: 1.0
      };
    }
  }

  // Fuzzy match using Fuse.js
  const fuse = new Fuse(vendors, {
    includeScore: true,
    threshold: 1 - threshold, // Fuse uses inverted threshold
    ignoreLocation: true,
    keys: ['vendor']
  });

  const vendorObjects = vendors.map(v => ({ vendor: v }));
  const fuseWithObjects = new Fuse(vendorObjects, {
    includeScore: true,
    threshold: 1 - threshold,
    ignoreLocation: true,
    keys: ['vendor']
  });

  const results = fuseWithObjects.search(description);

  if (results.length > 0 && results[0].score <= (1 - threshold)) {
    const vendor = results[0].item.vendor;
    return {
      vendor,
      category: vendorMappings[vendor],
      confidence: 1 - results[0].score
    };
  }

  return null;
}

export function findSimilarTransactions(transaction, allTransactions, threshold = 0.9) {
  if (!transaction.description) return [];

  const fuse = new Fuse(allTransactions, {
    includeScore: true,
    threshold: 1 - threshold,
    keys: ['description']
  });

  const results = fuse.search(transaction.description);

  return results
    .filter(result => result.item.id !== transaction.id)
    .filter(result => {
      const amountDiff = Math.abs(result.item.amount - transaction.amount);
      const amountThreshold = Math.abs(transaction.amount) * 0.05; // 5% difference
      return amountDiff <= amountThreshold;
    })
    .map(result => ({
      ...result.item,
      similarity: 1 - result.score
    }));
}

export function extractVendorName(description) {
  if (!description) return null;

  // Remove common prefixes/suffixes
  let cleaned = description
    .toUpperCase()
    .replace(/^(DEBIT|CREDIT|PURCHASE|PAYMENT|TRANSFER)\s+/i, '')
    .replace(/\s+(INC|LLC|LTD|CORP|CO)\.?$/i, '')
    .trim();

  // Extract first meaningful part (usually vendor name)
  const parts = cleaned.split(/\s+/);
  if (parts.length > 0) {
    // Common vendor patterns
    if (parts[0].match(/^(AMZN|AMAZON|WALMART|TARGET|COSTCO|NETFLIX|SPOTIFY)/)) {
      return parts[0];
    }

    // Return first 2-3 words as vendor name
    return parts.slice(0, Math.min(3, parts.length)).join(' ');
  }

  return cleaned.substring(0, 50);
}

export function groupSimilarDescriptions(transactions, threshold = 0.85) {
  const groups = [];
  const processed = new Set();

  for (const transaction of transactions) {
    if (processed.has(transaction.id)) continue;

    const similar = findSimilarTransactions(transaction, transactions, threshold);

    if (similar.length > 0) {
      const group = [transaction, ...similar.map(s => transactions.find(t => t.id === s.id))];
      group.forEach(t => processed.add(t.id));
      groups.push({
        vendor: extractVendorName(transaction.description),
        transactions: group,
        totalAmount: group.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        count: group.length
      });
    }
  }

  return groups.sort((a, b) => b.count - a.count);
}
