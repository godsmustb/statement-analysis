import * as pdfjsLib from 'pdfjs-dist';
import openaiService from './openaiService';
import storageService from './storageService';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

class PDFParser {
  async parseFile(file, selectedBank = 'Unknown') {
    try {
      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      // Extract text from all pages
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      if (!fullText.trim()) {
        throw new Error('No text found in PDF. This might be an image-based PDF.');
      }

      // Check if we have a template for this bank
      const template = storageService.getTemplateByBank(selectedBank);

      let parsedData;

      if (template && selectedBank !== 'Unknown') {
        // Try to use template-based parsing first
        parsedData = this.parseWithTemplate(fullText, template, selectedBank);
      }

      // If no template or template parsing failed, use AI
      if (!parsedData || !parsedData.transactions || parsedData.transactions.length === 0) {
        parsedData = await openaiService.parsePDFContent(fullText, selectedBank);
      }

      // Validate and clean the parsed data
      const cleanedTransactions = this.cleanTransactions(parsedData.transactions);

      return {
        bankName: parsedData.bankName || selectedBank,
        statementMonth: parsedData.statementMonth || this.detectMonth(fullText),
        transactions: cleanedTransactions,
        parsingRules: parsedData.parsingRules || null,
        rawText: fullText.substring(0, 1000) // Store sample for debugging
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

        transactions.push({
          date: this.normalizeDate(dateStr),
          description: description.trim(),
          amount: this.normalizeAmount(amountStr),
          isIncome: !amountStr.includes('-') && parseFloat(amountStr.replace(/[^0-9.-]/g, '')) > 0
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

    return transactions
      .filter(t => t.description && t.date)
      .map(t => ({
        date: this.normalizeDate(t.date),
        description: this.cleanDescription(t.description),
        amount: this.normalizeAmount(t.amount),
        isIncome: t.isIncome || t.amount > 0
      }))
      .filter(t => t.amount !== 0); // Remove zero-amount transactions
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
      // Remove currency symbols, commas, and spaces
      const cleaned = amount.replace(/[$,\s]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
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
