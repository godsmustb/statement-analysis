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
        id: t.id || index,
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
      const systemPrompt = `You are a bank statement parser. Extract transaction data from bank statement text.
Return JSON only in this exact format:
{
  "bankName": "detected_bank_name",
  "statementMonth": "YYYY-MM",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "transaction description",
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

Rules:
1. Amounts should be negative for expenses, positive for income
2. Clean up descriptions (remove extra spaces, normalize)
3. Detect the bank name from headers or footers
4. Identify the statement month/year
5. Return all transactions found`;

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
