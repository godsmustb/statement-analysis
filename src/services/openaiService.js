import axios from 'axios';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini-2024-07-18';
const API_URL = 'https://api.openai.com/v1/chat/completions';

class OpenAIService {
  constructor() {
    this.apiKey = API_KEY;
  }

  async categorizeTransactions(transactions, categories) {
    if (!this.apiKey || this.apiKey === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
    }

    try {
      const transactionsData = transactions.map((t, index) => ({
        id: t.tempId !== undefined ? t.tempId : (t.id || index),
        description: t.description,
        amount: t.amount,
        date: t.date
      }));

      const systemPrompt = `You are a financial transaction categorizer. Analyze transactions and assign them to appropriate spending categories.
Return JSON only in this exact format:
{
  "categorizations": [
    {
      "id": "transaction_id",
      "category": "category_name",
      "confidence": 0.95,
      "reasoning": "brief explanation"
    }
  ]
}

Rules:
1. Only assign category if confidence > 0.7
2. If confidence <= 0.7, use "Unassigned"
3. Use exact category names from the provided list
4. Identify income transactions (deposits, salary, transfers in) and categorize as "Income"
5. Be conservative with confidence scores`;

      const userPrompt = `Categorize these ${transactions.length} bank transactions.

Available categories: ${categories.join(', ')}

Transactions:
${JSON.stringify(transactionsData, null, 2)}

Return categorizations for ALL transactions in the exact JSON format specified.`;

      const response = await axios.post(
        API_URL,
        {
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 4000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      const content = response.data.choices[0].message.content;
      const result = JSON.parse(content);

      return result.categorizations || [];
    } catch (error) {
      console.error('OpenAI API Error:', error);

      if (error.response) {
        const status = error.response.status;
        if (status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your configuration.');
        } else if (status === 429) {
          throw new Error('OpenAI API rate limit exceeded. Please try again later.');
        } else if (status === 500) {
          throw new Error('OpenAI API server error. Please try again later.');
        }
      }

      throw new Error(`Failed to categorize transactions: ${error.message}`);
    }
  }

  async parsePDFContent(pdfText, bankName = 'Unknown') {
    if (!this.apiKey || this.apiKey === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
    }

    try {
      const systemPrompt = `You are a bank statement parser specialized in Canadian bank statements, especially TD Bank, RBC, Scotiabank, BMO, and CIBC.
Extract transaction data from bank statement text with high accuracy.

Return JSON only in this exact format:
{
  "bankName": "detected_bank_name",
  "statementMonth": "YYYY-MM",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "EXACT transaction description from PDF",
      "amount": -123.45,
      "isIncome": false
    }
  ],
  "parsingRules": {
    "dateColumn": 0,
    "descriptionColumn": 1,
    "amountColumn": 2,
    "headerRow": 0
  }
}

CRITICAL RULES - FOLLOW EXACTLY:

1. **Amounts - SIGN CONVENTION**:
   TD Bank statements have TWO separate columns: "Withdrawals" and "Deposits"

   RULE:
   - If amount is in the "Withdrawals" column → amount MUST be NEGATIVE (e.g., -50.00)
   - If amount is in the "Deposits" column → amount MUST be POSITIVE (e.g., +100.00)

   EXAMPLES:
   - Purchase of $25.00 in Withdrawals column → "amount": -25.00, "isIncome": false
   - Refund of $15.00 in Deposits column → "amount": 15.00, "isIncome": true
   - Monthly fee $4.95 in Withdrawals column → "amount": -4.95, "isIncome": false
   - Direct deposit $1500.00 in Deposits column → "amount": 1500.00, "isIncome": true

   NEVER make deposits negative or withdrawals positive!

2. **Dates - ACCURATE PARSING**:
   - TD Bank uses MM/DD/YYYY format (e.g., 10/31/2024)
   - Convert to YYYY-MM-DD (e.g., 2024-10-31)
   - PAY ATTENTION:
     * 10/31/2024 → 2024-10-31 (October 31st)
     * 11/04/2024 → 2024-11-04 (November 4th)
   - DO NOT confuse months and days
   - Preserve exact dates from the statement

3. **Descriptions**:
   - Copy EXACTLY as shown in PDF
   - Do NOT summarize, clean, or modify
   - Include ALL merchant names, reference numbers, locations
   - Preserve everything between date and amount

4. **Statement Month**:
   - Look for "Statement Period: Oct 31, 2024 to Nov 28, 2024"
   - Extract ending month as YYYY-MM (e.g., "2024-11")

5. **Bank Detection**:
   - Check for "TD Canada Trust", "TD Bank", "RBC", etc.

6. **Quality Check**:
   - Count transactions carefully - return ALL transactions
   - Verify column alignment (Date | Description | Withdrawals | Deposits)
   - Double-check signs match the column

IMPORTANT: Return ALL transactions, not a sample. Be precise with dates and amounts.`;

      const userPrompt = `Parse this bank statement (${bankName}):

${pdfText.substring(0, 8000)}

Extract all transactions and return in the exact JSON format specified.`;

      const response = await axios.post(
        API_URL,
        {
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          max_tokens: 4000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      const content = response.data.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('PDF Parsing Error:', error);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  async suggestCategoryForDescription(description, categories) {
    if (!this.apiKey || this.apiKey === 'your_openai_api_key_here') {
      return { category: 'Unassigned', confidence: 0 };
    }

    try {
      const response = await axios.post(
        API_URL,
        {
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are a financial categorizer. Return only a JSON object with "category" and "confidence" fields.'
            },
            {
              role: 'user',
              content: `Categorize this transaction: "${description}"\nCategories: ${categories.join(', ')}\nReturn JSON: {"category": "...", "confidence": 0.0-1.0}`
            }
          ],
          temperature: 0.3,
          max_tokens: 100,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      const content = response.data.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('Category suggestion error:', error);
      return { category: 'Unassigned', confidence: 0 };
    }
  }
}

export default new OpenAIService();
