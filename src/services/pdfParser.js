const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:5000';

class PDFParser {
  async parseFile(file, selectedBank = 'Unknown') {
    try {
      // Create FormData to send PDF to Python backend
      const formData = new FormData();
      formData.append('file', file);

      console.log('📤 Sending PDF to Python backend for Camelot parsing...');

      // Call Python backend with Camelot
      const response = await fetch(`${PYTHON_API_URL}/api/parse-pdf`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse PDF');
      }

      const parsedData = await response.json();

      // Debug: Log Python/Camelot response
      console.log('🐍 Python Camelot Parsed Data:', {
        bankName: parsedData.bankName,
        statementMonth: parsedData.statementMonth,
        transactionCount: parsedData.transactions.length,
        method: parsedData.parsingRules?.method,
        sampleTransactions: parsedData.transactions.slice(0, 3)
      });

      console.log('[DEBUG] All transactions from backend:', parsedData.transactions);

      // Validate and clean the parsed data
      const cleanedTransactions = this.cleanTransactions(parsedData.transactions);

      // Debug: Log cleaned data
      console.log(`✨ Cleaned Transactions (${cleanedTransactions.length}):`, cleanedTransactions);

      return {
        bankName: parsedData.bankName || selectedBank,
        statementMonth: parsedData.statementMonth,
        accountNumber: parsedData.accountNumber, // Account number from PDF
        transactions: cleanedTransactions,
        parsingRules: parsedData.parsingRules || { method: 'camelot' },
        rawText: '' // Not needed anymore
      };
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  parseWithTemplate(text, template, bankName) {
    try {
      // Simple template-based parsing
      const lines = text.split('\n').filter(line => line.trim());
      const transactions = [];

      // This is a basic implementation - would need to be enhanced for real-world use
      const transactionPattern = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s+(.+?)\s+([-]?\$?\d+[,.]?\d*\.?\d+)/g;
      let match;

      while ((match = transactionPattern.exec(text)) !== null) {
        const [, dateStr, description, amountStr] = match;

        const amount = this.normalizeAmount(amountStr);
        const isWithdrawal = amountStr.includes('-');

        transactions.push({
          date: this.normalizeDate(dateStr),
          description: description.trim(),
          amount: isWithdrawal ? -Math.abs(amount) : amount,
          isIncome: !isWithdrawal && amount > 0
        });
      }

      return {
        bankName,
        transactions,
        parsingRules: template.parsingRules
      };
    } catch (error) {
      console.error('Template parsing error:', error);
      return null;
    }
  }

  cleanTransactions(transactions) {
    if (!Array.isArray(transactions)) {
      return [];
    }

    console.log(`[CLEAN] Starting with ${transactions.length} transactions`);

    const filtered = transactions.filter(t => {
      const hasDesc = !!t.description;
      const hasDate = !!t.date;
      if (!hasDesc || !hasDate) {
        console.log(`[CLEAN] Filtered out: desc=${hasDesc}, date=${hasDate}`, t);
      }
      return hasDesc && hasDate;
    });

    console.log(`[CLEAN] After description/date filter: ${filtered.length} transactions`);

    return filtered
      .map(t => {
        // Get the amount as-is from AI (it should already have correct sign)
        let amount = typeof t.amount === 'number' ? t.amount : this.normalizeAmount(t.amount);

        // AI explicitly tells us if it's income
        const isIncome = t.isIncome === true;

        // Important: DO NOT change the sign based on isIncome
        // The AI should return withdrawals as negative and deposits as positive
        // If AI says isIncome=true but amount is negative, trust the amount sign

        return {
          date: this.normalizeDate(t.date),
          originalDescription: t.description, // Store original description
          description: this.cleanDescription(t.description), // Store cleaned description
          amount: amount, // Keep amount exactly as AI returned it
          isIncome: isIncome
        };
      })
      .filter(t => {
        if (t.amount === 0) {
          console.log(`[CLEAN] Filtered out zero amount:`, t);
          return false;
        }
        return true;
      });
  }

  normalizeDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    try {
      // Handle various date formats
      let date;

      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Already in YYYY-MM-DD format
        return dateStr;
      }

      if (dateStr.match(/^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/)) {
        // MM/DD/YY or DD/MM/YY
        const parts = dateStr.split(/[-/]/);
        const currentYear = new Date().getFullYear();
        const century = Math.floor(currentYear / 100) * 100;
        date = new Date(`${century + parseInt(parts[2])}`, parts[0] - 1, parts[1]);
      } else if (dateStr.match(/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/)) {
        // MM/DD/YYYY or DD/MM/YYYY
        const parts = dateStr.split(/[-/]/);
        date = new Date(parts[2], parts[0] - 1, parts[1]);
      } else {
        date = new Date(dateStr);
      }

      if (isNaN(date.getTime())) {
        return new Date().toISOString().split('T')[0];
      }

      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Date normalization error:', error);
      return new Date().toISOString().split('T')[0];
    }
  }

  normalizeAmount(amount) {
    if (typeof amount === 'number') {
      return amount;
    }

    if (typeof amount === 'string') {
      // Check for negative sign or parentheses (accounting format)
      const isNegative = amount.includes('-') || (amount.includes('(') && amount.includes(')'));

      // Remove currency symbols, commas, spaces, and parentheses
      const cleaned = amount.replace(/[$,\s()]/g, '');
      const num = parseFloat(cleaned);

      if (isNaN(num)) {
        return 0;
      }

      // Return negative if it was marked as negative
      return isNegative ? -Math.abs(num) : num;
    }

    return 0;
  }

  cleanDescription(description) {
    if (!description) return 'Unknown';

    return description
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.-]/g, '') // Remove special characters except dash and period
      .substring(0, 100); // Limit length
  }

  detectMonth(text) {
    // Try to find statement month from common patterns
    const monthPatterns = [
      /statement\s+(?:for|period)?\s*:?\s*(\w+\s+\d{4})/i,
      /(\w+\s+\d{1,2},?\s+\d{4})\s*-\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
      /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/
    ];

    for (const pattern of monthPatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const date = new Date(match[1]);
          if (!isNaN(date.getTime())) {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          }
        } catch (error) {
          continue;
        }
      }
    }

    // Default to current month
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async parseMultipleFiles(files, selectedBank) {
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await this.parseFile(file, selectedBank);
        results.push({
          fileName: file.name,
          ...result,
          status: 'success'
        });
      } catch (error) {
        errors.push({
          fileName: file.name,
          error: error.message,
          status: 'error'
        });
      }
    }

    return { results, errors };
  }
}

export default new PDFParser();
