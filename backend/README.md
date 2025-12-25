# PDF Parser Backend (Python + Camelot)

This Python backend uses Camelot to accurately parse bank statement PDFs and extract tabular data.

## Prerequisites

1. **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
2. **Ghostscript** - Required by Camelot for PDF processing

### Installing Ghostscript

#### Windows:
1. Download Ghostscript from: https://ghostscript.com/releases/gsdnld.html
2. Install the 64-bit version
3. Add to PATH: `C:\Program Files\gs\gs10.02.1\bin` (version may vary)

#### macOS:
```bash
brew install ghostscript
```

#### Linux:
```bash
sudo apt-get install ghostscript
```

## Setup

1. **Create Virtual Environment** (recommended):
```bash
cd backend
python -m venv venv
```

2. **Activate Virtual Environment**:

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

3. **Install Dependencies**:
```bash
pip install -r requirements.txt
```

## Running the Server

```bash
python app.py
```

The API will be available at: `http://localhost:5000`

## API Endpoints

### POST /api/parse-pdf
Upload and parse a PDF bank statement

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: `file` (PDF file)

**Response:**
```json
{
  "bankName": "TD Canada Trust",
  "statementMonth": "2024-11",
  "transactions": [
    {
      "date": "2024-10-31",
      "description": "Purchase at Merchant Name",
      "amount": -50.00,
      "isIncome": false
    },
    {
      "date": "2024-11-01",
      "description": "Direct Deposit",
      "amount": 1500.00,
      "isIncome": true
    }
  ],
  "parsingRules": {
    "method": "camelot",
    "tablesFound": 2
  }
}
```

### GET /api/health
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "message": "PDF Parser API is running"
}
```

## How It Works

1. **Camelot Table Extraction**:
   - Tries "lattice" method first (for tables with borders)
   - Falls back to "stream" method (for tables without borders)
   - Extracts all tables from all pages

2. **Bank Detection**:
   - Analyzes PDF text to identify the bank (TD, RBC, BMO, etc.)
   - Extracts statement period from headers

3. **TD Bank Specific Parsing**:
   - Identifies columns: Date | Description | Withdrawals | Deposits
   - Withdrawals → negative amounts
   - Deposits → positive amounts
   - Normalizes dates to YYYY-MM-DD format

4. **Deduplication**:
   - Removes duplicate transactions based on date + description + amount

## Supported Banks

Currently optimized for:
- TD Canada Trust
- RBC Royal Bank
- Scotiabank
- BMO
- CIBC

The parser auto-detects the bank and applies appropriate rules.

## Troubleshooting

### "No tables found in PDF"
- Ensure PDF is text-based (not scanned image)
- Try a different bank statement format
- Check if PDF has actual table structures

### "ghostscript not found"
- Verify Ghostscript is installed
- Ensure Ghostscript bin folder is in PATH
- Restart terminal/IDE after installation

### Import errors
- Make sure virtual environment is activated
- Run `pip install -r requirements.txt` again
- Check Python version is 3.8+

## Development

To add support for new banks, modify `parse_td_bank_table()` function in `app.py` to handle different column structures.
