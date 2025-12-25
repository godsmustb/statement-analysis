from flask import Flask, request, jsonify
from flask_cors import CORS
import camelot
import pandas as pd
from datetime import datetime
import os
import tempfile
import re
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def normalize_date(date_str, statement_year=None):
    """
    Convert various date formats to YYYY-MM-DD
    TD Bank typically uses MM/DD/YYYY or MMMDD (e.g., NOV05)
    """
    if not date_str or pd.isna(date_str):
        return None

    date_str = str(date_str).strip().upper()

    # Try MM/DD/YYYY format (TD Bank standard)
    try:
        dt = datetime.strptime(date_str, '%m/%d/%Y')
        return dt.strftime('%Y-%m-%d')
    except:
        pass

    # Try MM/DD/YY format
    try:
        dt = datetime.strptime(date_str, '%m/%d/%y')
        return dt.strftime('%Y-%m-%d')
    except:
        pass

    # Try YYYY-MM-DD (already normalized)
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        return dt.strftime('%Y-%m-%d')
    except:
        pass

    # Try MMMDD format (e.g., NOV05, DEC31) - TD Bank format without year
    if statement_year:
        try:
            # Parse month abbreviation and day
            dt = datetime.strptime(f"{date_str}{statement_year}", '%b%d%Y')
            result = dt.strftime('%Y-%m-%d')
            print(f"[DATE_DEBUG] Input: '{date_str}' + Year: '{statement_year}' -> Output: '{result}'")
            return result
        except Exception as e:
            print(f"[DATE_ERROR] Failed to parse '{date_str}' with year '{statement_year}': {e}")
            pass

    return None

def clean_amount(amount_str):
    """
    Convert amount string to float, handling currency symbols and commas
    """
    if pd.isna(amount_str) or amount_str == '':
        return 0.0

    # Convert to string and clean
    amount_str = str(amount_str).strip()

    # Remove currency symbols, commas, and spaces
    amount_str = amount_str.replace('$', '').replace(',', '').replace(' ', '')

    # Handle parentheses (accounting notation for negative)
    if '(' in amount_str and ')' in amount_str:
        amount_str = '-' + amount_str.replace('(', '').replace(')', '')

    try:
        return float(amount_str)
    except:
        return 0.0

def detect_bank_name(text):
    """
    Detect bank name from PDF text
    """
    text_upper = text.upper()

    # TD Bank detection - check for various TD indicators
    if any(keyword in text_upper for keyword in ['TD CANADA', 'TD BANK', 'TD CHEQUING', 'TD UNLIMITED', 'TD ACCOUNT']):
        return 'TD Canada Trust'
    elif 'RBC' in text_upper or 'ROYAL BANK' in text_upper:
        return 'RBC Royal Bank'
    elif 'SCOTIABANK' in text_upper:
        return 'Scotiabank'
    elif 'BMO' in text_upper or 'BANK OF MONTREAL' in text_upper:
        return 'BMO'
    elif 'CIBC' in text_upper:
        return 'CIBC'

    return 'Unknown Bank'

def detect_statement_month(text):
    """
    Extract statement month from PDF text
    Looks for patterns like "Statement Period: Oct 31, 2024 to Nov 28, 2024"
    """
    # Look for date ranges
    patterns = [
        r'statement period[:\s]+([a-z]+\s+\d{1,2},?\s+\d{4})\s+to\s+([a-z]+\s+\d{1,2},?\s+\d{4})',
        r'(\d{1,2}/\d{1,2}/\d{4})\s*-\s*(\d{1,2}/\d{1,2}/\d{4})',
        r'for the period[:\s]+([a-z]+\s+\d{1,2},?\s+\d{4})\s+to\s+([a-z]+\s+\d{1,2},?\s+\d{4})'
    ]

    text_lower = text.lower()

    for pattern in patterns:
        match = re.search(pattern, text_lower)
        if match:
            # Get the end date (second group)
            end_date_str = match.group(2)
            try:
                # Try to parse the end date
                for date_format in ['%b %d, %Y', '%B %d, %Y', '%m/%d/%Y']:
                    try:
                        dt = datetime.strptime(end_date_str.strip(), date_format)
                        return dt.strftime('%Y-%m')
                    except:
                        continue
            except:
                pass

    # Default to current month if not found
    return datetime.now().strftime('%Y-%m')

def parse_td_bank_table(df, bank_name, statement_year=None):
    """
    Parse TD Bank statement table format
    TD Bank format typically: Date | Description | Withdrawals | Deposits | Balance
    Or: Description | Withdrawals | Deposits | Date | Balance
    """
    transactions = []

    # Clean column names - convert to string first to handle numeric column names
    df.columns = [str(col).strip() for col in df.columns]

    # Print columns for debugging
    print(f"[COLUMNS] Detected columns: {df.columns}")

    # Find relevant columns (case-insensitive)
    date_col = None
    desc_col = None
    withdrawal_col = None
    deposit_col = None

    for col in df.columns:
        col_lower = str(col).lower()
        if 'date' in col_lower:
            date_col = col
        elif 'description' in col_lower or 'transaction' in col_lower:
            desc_col = col
        elif 'withdrawal' in col_lower or 'debit' in col_lower:
            withdrawal_col = col
        elif 'deposit' in col_lower or 'credit' in col_lower:
            deposit_col = col

    print(f"[MAPPED] Date: {date_col}, Desc: {desc_col}, Withdrawals: {withdrawal_col}, Deposits: {deposit_col}")

    # If we can't find the standard columns, try positional TD Bank format
    # TD Bank format: [Description, Withdrawal, Deposit, Date, Balance]
    if not date_col or not desc_col:
        if len(df.columns) >= 4:
            desc_col = df.columns[0]      # Column 0: Description
            withdrawal_col = df.columns[1]  # Column 1: Withdrawals
            deposit_col = df.columns[2] if len(df.columns) > 2 else None  # Column 2: Deposits
            date_col = df.columns[3]      # Column 3: Date
            print(f"[WARNING] Using TD Bank positional format: Desc={desc_col}, Withdrawal={withdrawal_col}, Deposit={deposit_col}, Date={date_col}")

    for idx, row in df.iterrows():
        # Skip header rows and balance rows
        date_val = str(row[date_col]).strip() if date_col else ''
        desc_val = str(row[desc_col]).strip() if desc_col else ''

        # Skip empty dates, header rows, or balance rows
        if not date_val or date_val.lower() in ['date', 'transaction date', '']:
            continue
        if 'balance' in desc_val.lower() or 'total' in desc_val.lower():
            continue

        # Parse date
        date = normalize_date(date_val, statement_year)
        if not date:
            continue

        # Get description
        description = str(row[desc_col]).strip() if desc_col and not pd.isna(row[desc_col]) else 'Unknown Transaction'

        # Get amounts from withdrawal and deposit columns
        withdrawal_amount = 0.0
        deposit_amount = 0.0

        if withdrawal_col and not pd.isna(row[withdrawal_col]):
            withdrawal_amount = clean_amount(row[withdrawal_col])

        if deposit_col and not pd.isna(row[deposit_col]):
            deposit_amount = clean_amount(row[deposit_col])

        # Determine final amount and type
        # Withdrawals should be negative, deposits should be positive
        if withdrawal_amount > 0:
            amount = -abs(withdrawal_amount)
            is_income = False
        elif deposit_amount > 0:
            amount = abs(deposit_amount)
            is_income = True
        else:
            # Skip transactions with no amount
            continue

        transactions.append({
            'date': date,
            'description': description,
            'amount': amount,
            'isIncome': is_income
        })

    return transactions

@app.route('/api/parse-pdf', methods=['POST'])
def parse_pdf():
    """
    Parse PDF file and return structured transaction data
    """
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']

        # Check if file is empty
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Check file extension
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Only PDF files are allowed'}), 400

        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            file.save(tmp_file.name)
            tmp_path = tmp_file.name

        try:
            # Extract tables using Camelot
            print(f"[PARSING] PDF: {file.filename}")

            # Try lattice method first (works better for tables with lines)
            try:
                tables = camelot.read_pdf(tmp_path, pages='all', flavor='lattice')
                print(f"[SUCCESS] Lattice method found {len(tables)} tables")
            except Exception as e:
                print(f"[WARNING] Lattice method failed: {e}")
                # Fall back to stream method (works better for tables without lines)
                tables = camelot.read_pdf(tmp_path, pages='all', flavor='stream')
                print(f"[SUCCESS] Stream method found {len(tables)} tables")

            if len(tables) == 0:
                return jsonify({'error': 'No tables found in PDF. Please ensure the PDF contains text (not scanned images).'}), 400

            # Read the entire PDF text for metadata extraction
            import PyPDF2
            with open(tmp_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                full_text = ''
                for page in pdf_reader.pages:
                    full_text += page.extract_text()

            # Detect bank name and statement month
            bank_name = detect_bank_name(full_text)
            statement_month = detect_statement_month(full_text)

            # Extract year from statement_month (format: YYYY-MM)
            statement_year = statement_month.split('-')[0] if statement_month else None

            print(f"[DETECTED] {bank_name}, Statement Month: {statement_month}, Year: {statement_year}")

            # Parse all tables and combine transactions
            all_transactions = []

            for i, table in enumerate(tables):
                print(f"\n[TABLE {i+1}/{len(tables)}] Processing...")
                df = table.df

                # Debug: Print raw DataFrame info
                print(f"[DEBUG] DataFrame shape: {df.shape}")
                print(f"[DEBUG] DataFrame columns: {df.columns.tolist()}")
                print(f"[DEBUG] First 3 rows:\n{df.head(3)}")

                # Parse transactions from this table
                transactions = parse_td_bank_table(df, bank_name, statement_year)
                all_transactions.extend(transactions)
                print(f"   Found {len(transactions)} transactions in table {i+1}")

            # Remove duplicates based on date + description + amount
            seen = set()
            unique_transactions = []
            for txn in all_transactions:
                key = (txn['date'], txn['description'], txn['amount'])
                if key not in seen:
                    seen.add(key)
                    unique_transactions.append(txn)

            print(f"\n[COMPLETE] Total unique transactions: {len(unique_transactions)}")

            # Return structured response
            response = {
                'bankName': bank_name,
                'statementMonth': statement_month,
                'transactions': unique_transactions,
                'parsingRules': {
                    'method': 'camelot',
                    'tablesFound': len(tables)
                }
            }

            return jsonify(response), 200

        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except Exception as e:
        print(f"[ERROR] Error parsing PDF: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to parse PDF: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    """
    return jsonify({'status': 'ok', 'message': 'PDF Parser API is running'}), 200

if __name__ == '__main__':
    print("Starting PDF Parser API on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
