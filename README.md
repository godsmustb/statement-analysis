# Bank Statement Analyzer 📊

A modern, AI-powered web application for analyzing bank statements with intelligent expense categorization using OpenAI's GPT-4o-mini. Built with React, Vite, and Tailwind CSS with a beautiful vibrant pastel color scheme.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 🏦 Bank Template Management
- Pre-configured templates for **TD Bank** and **RBC**
- Smart template detection and auto-saving
- Custom template creation for any bank
- Template management interface (add, edit, delete)

### 📄 PDF Processing
- Drag-and-drop PDF upload
- Multiple file support with batch processing
- Text extraction using PDF.js (browser-compatible)
- AI-powered transaction parsing when templates aren't available
- Progress indicators and status tracking

### 🤖 AI-Powered Categorization
- Automatic transaction categorization using OpenAI GPT-4o-mini
- Confidence scoring for suggestions
- Vendor learning and fuzzy matching
- Recurring transaction detection
- Manual override and bulk categorization

### 📊 Analytics & Visualization
- **Dashboard** with comprehensive financial overview
- **Pie charts** for expense distribution
- **Bar charts** for category breakdown
- **Line charts** for income/expense trends
- **Category tables** with monthly breakdowns
- Month selector and year-to-date views

### 💳 Transaction Management
- Sortable and filterable transaction table
- Drag-and-drop categorization
- Bulk selection and operations
- Manual transaction entry
- Edit descriptions (separate from original transaction text)
- Delete with custom modal (keyboard shortcuts: Enter/Esc)
- Undo delete with CTRL+Z
- Account Type assignment per transaction

### 🎨 Category Management
- Default categories with flexible customization
- Add, rename, and delete categories
- Color-coded category badges
- Transaction count and total tracking
- Auto-reassignment on category deletion

### 🔍 Duplicate Detection
- Intelligent duplicate identification
- Side-by-side comparison
- Keep/remove options
- Multi-statement merge support

### 💾 Data Persistence
- **Supabase Cloud Storage** - Multi-device sync with user authentication
- **localStorage Fallback** - Works offline without account
- **Auto-Migration** - Seamless migration from localStorage to Supabase on first login
- Export/import functionality
- Data stays secure with Row-Level Security

### 🔐 User Authentication
- Email/password authentication via Supabase
- Automatic session management with token refresh
- Secure data isolation per user (Row-Level Security)
- Optional - use app without account (localStorage only)
- One-time migration from localStorage to cloud on first login

### 🏦 Account Type Management
- Create and manage multiple account types (Checking, Savings, Credit, Loan)
- Support for duplicate account names with different types (e.g., "TD Bank" Checking and "TD Bank" Credit)
- Statement and transaction count tracking per account type
- Edit account associations for uploaded statements
- Color-coded account type indicators

### 🔍 Similar Transactions Detection
- Automatic detection of similar uncategorized transactions
- Fuzzy matching algorithm (90% similarity threshold)
- Bulk categorization modal for similar transactions
- Smart suggestions to speed up categorization workflow

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm ([Download](https://nodejs.org/))
- **Python 3.8+** ([Download](https://www.python.org/downloads/))
- **Ghostscript** (Required for PDF table extraction)
  - Windows: [Download Ghostscript](https://ghostscript.com/releases/gsdnld.html)
  - macOS: `brew install ghostscript`
  - Linux: `sudo apt-get install ghostscript`

### Installation

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/statement-analysis.git
cd statement-analysis
```

#### 2. Setup Python Backend (Camelot PDF Parser)

**Windows:**
```bash
cd backend
setup.bat
```

**macOS/Linux:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Start Python backend:**
```bash
python app.py
```

The Python API will run at: `http://localhost:5000`

#### 3. Setup Frontend (React App)

In a **new terminal**, navigate to the project root:

```bash
# Install frontend dependencies
npm install

# Setup environment variables
cp .env.example .env
```

Edit `.env` and configure:
```env
# Python Backend
VITE_PYTHON_API_URL=http://localhost:5000
VITE_APP_NAME=Bank Statement Analyzer
VITE_MAX_FILE_SIZE_MB=10

# Supabase (Optional - for cloud sync and multi-device access)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note**: Supabase credentials are optional. App works with localStorage only if not provided.

**Start frontend development server:**
```bash
npm run dev
```

#### 4. Open your browser
```
http://localhost:3003
```

### Running the App

You need **both servers running**:

1. **Terminal 1** - Python Backend:
   ```bash
   cd backend
   venv\Scripts\activate  # On macOS/Linux: source venv/bin/activate
   python app.py
   ```

2. **Terminal 2** - Frontend:
   ```bash
   npm run dev
   ```

## 📖 Usage Guide

### 1. Select Your Bank
Choose your bank from the dropdown or select "New/Unknown Bank" for first-time uploads.

### 2. Upload Statement(s)
- Drag and drop PDF files or click to browse
- Multiple files are supported
- Files must be text-based PDFs (not scanned images)
- Maximum file size: 10MB per file

### 3. Review Categorizations
- AI will automatically categorize transactions
- Review high-confidence assignments
- Manually adjust medium-confidence suggestions
- Categorize unassigned transactions

### 4. Manage Duplicates
If duplicate transactions are detected:
- Review side-by-side comparisons
- Choose which transaction to keep
- Or keep both if they're not actually duplicates

### 5. Analyze Your Finances
- Switch to Dashboard tab for visual analytics
- Filter by month or view year-to-date
- Click on chart elements for detailed views
- Export data for external analysis

### 6. Add Manual Transactions
- Click "+ Add Transaction" button
- Fill in transaction details
- Use AI suggestion for category
- Transaction is automatically saved

## 🛠️ Tech Stack

### Frontend
- **React 18+** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization
- **Fuse.js** - Fuzzy search/matching

### Backend (NEW!)
- **Python 3.8+** - Backend runtime
- **Flask** - Lightweight web framework
- **Camelot** - PDF table extraction (superior accuracy)
- **Pandas** - Data manipulation
- **OpenCV** - Image processing for PDFs
- **React Dropzone** - File upload
- **Zustand** - State management
- **Axios** - HTTP client

### AI & Services
- **OpenAI GPT-4o-mini** - Transaction categorization and parsing
- **Supabase** - Authentication and PostgreSQL database (optional)
- **localStorage** - Client-side fallback data persistence

### Development
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 🎨 Color Scheme

The app uses a vibrant pastel color palette:
- **Primary**: #FFB3E6 (Pastel Pink)
- **Secondary**: #B3E5FC (Pastel Blue)
- **Accent**: #C5E1A5 (Pastel Green)
- **Warning**: #FFE082 (Pastel Yellow)
- **Success**: #AED581 (Pastel Lime)
- **Background**: #F8F9FA (Light Gray)
- **Text**: #2C3E50 (Dark Gray)

## 📁 Project Structure

```
statement-analysis/
├── backend/             # Python Flask API
│   ├── app.py          # Flask server
│   ├── requirements.txt
│   └── venv/           # Python virtual environment
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── Charts/      # Chart components
│   │   ├── AccountTypePanel.jsx
│   │   ├── AuthModal.jsx
│   │   ├── CategoryPanel.jsx
│   │   ├── Dashboard.jsx
│   │   ├── DeleteConfirmationModal.jsx
│   │   ├── FileUpload.jsx
│   │   ├── SimilarTransactionsModal.jsx
│   │   ├── TemplateManager.jsx
│   │   ├── TransactionTable.jsx
│   │   └── ...
│   ├── context/         # React Context (state management)
│   │   └── AppContext.jsx
│   ├── lib/             # Third-party integrations
│   │   └── supabaseClient.js
│   ├── services/        # Business logic
│   │   ├── authService.js
│   │   ├── openaiService.js
│   │   ├── pdfParser.js
│   │   ├── storageService.js
│   │   ├── supabaseStorageService.js
│   │   └── templateService.js
│   ├── utils/           # Utility functions
│   │   ├── duplicateDetector.js
│   │   ├── fuzzyMatch.js
│   │   ├── similarityMatcher.js
│   │   └── validators.js
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── .env.example         # Environment template
├── .gitignore           # Git ignore rules
├── package.json         # Dependencies
├── supabase-schema.sql  # Database schema
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── README.md            # This file
```

## 💰 API Cost Estimates

Using OpenAI GPT-4o-mini (as of January 2025):
- **Input**: $0.150 / 1M tokens
- **Output**: $0.600 / 1M tokens

**Estimated costs per statement:**
- Small statement (20-50 transactions): ~$0.001 - $0.003
- Medium statement (50-100 transactions): ~$0.003 - $0.006
- Large statement (100-200 transactions): ~$0.006 - $0.012

**Monthly usage (processing 3 statements/month):**
- Approximately $0.01 - $0.04 per month

## 🔒 Privacy & Security

- ✅ **Row-Level Security** - Users can only access their own data in Supabase
- ✅ **Optional Cloud Storage** - Works entirely offline with localStorage if preferred
- ✅ **Secure Authentication** - Email/password with JWT tokens
- ✅ **Automatic Token Refresh** - Session management handled automatically
- ✅ **Data Encryption** - HTTPS for all API calls (Supabase + OpenAI)
- ✅ **No Tracking** - Zero analytics or user tracking
- ✅ **Export/Import** - Full data portability
- ✅ **localStorage Fallback** - Works without account (data stays in browser)
- ⚠️ **Backup Recommended** - Export data regularly or use Supabase for automatic sync

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

The build output will be in the `dist/` folder.

### Deploy to Hostinger (via FTP)

1. **Set up GitHub Secrets:**
   - `OPENAI_API_KEY`
   - `FTP_HOST`
   - `FTP_USERNAME`
   - `FTP_PASSWORD`
   - `FTP_PATH`

2. **Push to main branch:**
```bash
git push origin main
```

GitHub Actions will automatically build and deploy via FTP.

### Manual Deployment

Upload the contents of `dist/` folder to your web server:
```bash
npm run build
# Upload dist/* to your hosting provider
```

## 🧪 Testing Scenarios

### Positive Tests
✅ Upload single TD/RBC PDF → Parse → Categorize
✅ Upload multiple PDFs for different months
✅ Upload 2 statements for same month → Merge
✅ Drag transaction to category
✅ Add manual transaction
✅ Delete category → Move to Unassigned
✅ Filter transactions by month/category

### Error Handling
❌ Corrupted PDF → Display error, allow retry
❌ Invalid API key → Clear error message
❌ Network failure → Graceful degradation
❌ Missing transaction data → Prompt for manual entry

## 🐛 Troubleshooting

### PDF Not Parsing
**Issue**: "Failed to parse PDF" error
**Solutions**:
- Ensure PDF is text-based (not scanned image)
- Try re-downloading the statement from your bank
- Check file size (must be under 10MB)
- Verify PDF isn't password-protected

### AI Categorization Not Working
**Issue**: All transactions go to "Unassigned"
**Solutions**:
- Check OpenAI API key in `.env`
- Verify API key has credits
- Check browser console for errors
- Retry categorization

### Data Not Persisting
**Issue**: Data disappears after refresh
**Solutions**:
- Check localStorage is enabled
- Don't use private/incognito mode
- Export data regularly as backup
- Check for localStorage quota errors

### Template Not Saving
**Issue**: Template doesn't appear in dropdown
**Solutions**:
- Upload a statement with valid bank name
- Check for parsing errors
- Manually select bank before upload

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT-4o-mini API
- **PDF.js** by Mozilla for PDF parsing
- **Recharts** for beautiful charts
- **Tailwind CSS** for styling framework

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues first
- Provide detailed error messages and steps to reproduce

## 🗺️ Roadmap

### Completed Features ✅
- [x] Supabase cloud sync (optional)
- [x] User authentication
- [x] Account Type management
- [x] Similar transactions detection
- [x] Custom delete confirmation modals
- [x] Duplicate account names with different types

### Planned Features
- [ ] Multi-bank comparison view
- [ ] Budget setting and tracking
- [ ] Recurring expense alerts
- [ ] Export to CSV/Excel
- [ ] Dark mode toggle
- [ ] Mobile app (React Native)
- [ ] Split transactions
- [ ] Custom recurring rules
- [ ] Bill reminders

### Under Consideration
- [ ] Multi-currency support
- [ ] Investment tracking
- [ ] Tax category mapping
- [ ] Receipt attachment
- [ ] Financial goals tracking

---

**Made with ❤️ using React + OpenAI**

*Your finances, your data, your control.*
