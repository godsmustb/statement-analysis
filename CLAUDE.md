# Bank Statement Analyzer - Quick Context

## Project Overview
AI-powered bank statement analyzer built with React + Vite + Python Flask + Supabase. Parses PDFs using Camelot, categorizes expenses using OpenAI GPT-4o-mini, provides visual analytics, and syncs data across devices with optional cloud storage.

## Tech Stack at a Glance
- **Frontend**: React 18 + Vite
- **Backend**: Python 3.8+ Flask + Camelot PDF parser
- **Database**: Supabase (PostgreSQL) with Row-Level Security
- **Authentication**: Supabase Auth (email/password)
- **Styling**: Tailwind CSS (vibrant pastel theme)
- **Charts**: Recharts
- **PDF**: Camelot (Python backend) for superior table extraction
- **AI**: OpenAI GPT-4o-mini-2024-07-18
- **Storage**: Supabase (cloud) + localStorage (fallback)
- **State**: React Context API
- **Utilities**: Fuse.js (fuzzy matching), UUID, Axios

## Key Architecture Decisions

### 1. Hybrid Architecture (Frontend + Backend + Cloud)
- **Python Flask Backend** for PDF parsing with Camelot (superior accuracy)
- **Supabase Cloud** for authentication and data sync (optional)
- **localStorage Fallback** for offline-first functionality
- **User Choice**: Use with or without account
- Automatic migration from localStorage to Supabase on first login

### 2. PDF Parsing Strategy
- **Primary**: Python Camelot for accurate table extraction from PDFs
- **Bank-Specific Rules**: TD Bank format detection and parsing
- **Account Number Extraction**: Regex patterns to extract account numbers
- **Date Parsing**: Handles NOV05 format with year inference
- **Amount Handling**: Proper negative (withdrawals) and positive (deposits) signs
- **Backend API**: Flask endpoint at http://localhost:5000/parse-pdf

### 3. AI Categorization Workflow
1. Check vendor mappings (fuzzy match)
2. If no match, query OpenAI API
3. Apply only if confidence > 0.7
4. Otherwise mark as "Unassigned"

### 4. State Management & Data Flow
- **Context API** for global state (authentication, transactions, categories, account types)
- **Dual Storage** - Supabase (authenticated) + localStorage (fallback)
- **Auto-save** on every modification
- **Migration Logic** - One-time localStorage → Supabase migration on first login
- **Authentication State** - Session management with auto-refresh tokens
- **Row-Level Security** - Users only access their own data

## File Structure Quick Reference
```
backend/                 # Python Flask API
├── app.py              # Flask server with Camelot PDF parsing
├── requirements.txt    # Python dependencies
└── venv/               # Virtual environment

src/
├── components/          # React UI components
│   ├── Charts/         # Recharts visualization
│   ├── AccountTypePanel.jsx    # Account type management
│   ├── AuthModal.jsx           # Login/signup modal
│   ├── CategoryPanel.jsx       # Category management
│   ├── Dashboard.jsx           # Main analytics view
│   ├── DeleteConfirmationModal.jsx  # Custom delete modal
│   ├── FileUpload.jsx          # PDF upload & processing
│   ├── SimilarTransactionsModal.jsx # Similar tx detection
│   ├── TemplateManager.jsx     # Manage uploaded statements
│   └── TransactionTable.jsx    # Table with filters/sort
├── context/
│   └── AppContext.jsx  # Global state, auth, dual storage
├── lib/
│   └── supabaseClient.js  # Supabase configuration
├── services/
│   ├── authService.js           # Authentication (Supabase)
│   ├── openaiService.js         # AI integration
│   ├── pdfParser.js             # Calls Python backend API
│   ├── storageService.js        # localStorage wrapper
│   ├── supabaseStorageService.js # Supabase CRUD operations
│   └── templateService.js       # Bank templates
└── utils/
    ├── duplicateDetector.js  # Find duplicates
    ├── fuzzyMatch.js         # Vendor matching
    ├── similarityMatcher.js  # Similar transaction detection
    └── validators.js         # Form validation
```

## Common Development Tasks

### Add New Bank Template
1. Create template object in `storageService.js`:
```js
{
  bankName: "BankName",
  parsingRules: {
    dateColumn: 0,
    descriptionColumn: 1,
    amountColumn: 2,
    headerRow: 0
  }
}
```
2. Add to `TemplateSelector.jsx` dropdown

### Modify Categorization Logic
Edit `src/services/openaiService.js`:
- Adjust system prompt for better accuracy
- Change confidence threshold (currently 0.7)
- Modify JSON response format

### Add New Chart
1. Create component in `src/components/Charts/`
2. Import into `Dashboard.jsx`
3. Calculate data in Dashboard's `useMemo` hook
4. Pass data to chart component

### Customize Categories
Default categories in `src/services/storageService.js`:
```js
const DEFAULT_CATEGORIES = [
  'Housing', 'Transportation', 'Food', ...
];
```

## Environment Variables
Required in `.env`:
- `VITE_PYTHON_API_URL` - Python backend URL (default: http://localhost:5000)
- `VITE_SUPABASE_URL` - Supabase project URL (optional)
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (optional)
- `VITE_OPENAI_API_KEY` - OpenAI API key (optional, for AI categorization)
- `VITE_OPENAI_MODEL` - Model name (optional, defaults to gpt-4o-mini-2024-07-18)
- `VITE_MAX_FILE_SIZE_MB` - Max PDF size (optional, defaults to 10)

**Note**: Supabase credentials are optional. App works with localStorage only if not provided.

## Known Limitations

### Current Constraints
1. **PDF must be text-based** - Scanned/image PDFs won't work (Camelot limitation)
2. **Python Backend Required** - Need to run Flask server for PDF parsing
3. **Internet Required** - For AI categorization and Supabase sync
4. **Bank-Specific Parsing** - Currently optimized for TD Bank format
5. **Ghostscript Dependency** - Required for Camelot PDF processing

### Removed Limitations
1. ✅ **Multi-user support** - Now available with Supabase authentication
2. ✅ **Cloud sync** - Optional Supabase integration
3. ✅ **Data encryption** - Supabase uses HTTPS and PostgreSQL encryption
4. ✅ **Superior PDF parsing** - Camelot provides accurate table extraction

### Browser Compatibility
- **Requires**: localStorage, ES6+, Fetch API
- **Tested**: Chrome, Firefox, Safari (latest)
- **Not supported**: IE11, very old browsers

### Data Storage Limits
**localStorage (Fallback)**:
- **Typical quota**: 5-10MB per domain
- **Est. capacity**: ~5,000-10,000 transactions
- **Overflow handling**: Graceful error, prompt to export/clear or sign up

**Supabase (Cloud)**:
- **Free tier**: 500MB database, unlimited API requests
- **Est. capacity**: Hundreds of thousands of transactions
- **Auto-scaling**: Upgrade plan as needed
- **Row-Level Security**: Users only access their own data

## Error Handling Philosophy

### User-Facing Errors
- Clear, actionable messages
- Suggest next steps
- Provide retry options
- Never crash the app

### API Failures
- OpenAI timeout/error → All transactions to "Unassigned"
- Display reason (rate limit, auth, network)
- Allow manual categorization
- Retry button available

### PDF Parsing Failures
- Show specific error (not text-based, corrupted, etc.)
- Option to try different file
- Suggest manual entry
- Preserve other uploaded files

## Performance Considerations

### Optimizations Implemented
- Lazy chart rendering (only when visible)
- Memoized calculations (useMemo)
- Debounced search/filter
- Virtualized table for 1000+ rows (not yet - TODO)

### Known Bottlenecks
- Large PDFs (>5MB) slow to parse
- 200+ transactions: AI categorization takes 5-10s
- localStorage read/write on every change

## Future Enhancement Roadmap

### Phase 1 (Current MVP)
- ✅ PDF upload and parsing
- ✅ AI categorization
- ✅ Basic analytics
- ✅ Duplicate detection

### Phase 2 (Next Release)
- [ ] CSV export
- [ ] Budget tracking
- [ ] Recurring alerts
- [ ] Dark mode

### Phase 3 (Future)
- [ ] Mobile app
- [ ] Cloud sync (optional)
- [ ] Multi-currency
- [ ] Investment tracking

## Debugging Tips

### Check localStorage Data
```js
// In browser console:
localStorage.getItem('bank_analyzer_transactions')
localStorage.getItem('bank_analyzer_categories')
```

### Test AI Categorization
```js
// In openaiService.js, add console.log:
console.log('AI Request:', JSON.stringify(transactions));
console.log('AI Response:', result);
```

### Verify PDF Text Extraction
```js
// In pdfParser.js, log fullText:
console.log('Extracted text:', fullText.substring(0, 500));
```

### Force Re-categorization
Clear vendor mappings and re-upload:
```js
localStorage.removeItem('bank_analyzer_vendor_mappings');
```

## Development Workflow

### Start Dev Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Test Build Locally
```bash
npm run preview
```

### Lint Code
```bash
npm run lint
```

## Critical Dependencies

### Cannot Remove Without Major Refactor
- React (UI framework)
- Tailwind (entire styling)
- Recharts (all charts)
- pdfjs-dist (PDF parsing)
- axios (API calls)

### Can Be Replaced
- Fuse.js → Custom fuzzy match
- Zustand → Redux/MobX (not heavily used)
- React Dropzone → Custom file input

## API Integration Details

### OpenAI Request Format
```js
{
  model: "gpt-4o-mini-2024-07-18",
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "..." }
  ],
  temperature: 0.3,
  max_tokens: 4000,
  response_format: { type: "json_object" }
}
```

### Expected Response
```json
{
  "categorizations": [
    {
      "id": "uuid",
      "category": "Food",
      "confidence": 0.92,
      "reasoning": "Transaction at restaurant"
    }
  ]
}
```

## Security Notes
- No authentication (client-only app)
- API key exposed in frontend (acceptable for personal use)
- For production: Move API calls to backend proxy
- No XSS protection needed (no user-generated HTML)
- CORS not an issue (direct API calls)

## New Features (Latest Release)

### 🔐 Supabase Integration
**What**: Optional cloud storage and authentication for multi-device sync

**Key Files**:
- `src/lib/supabaseClient.js` - Supabase client configuration
- `src/services/authService.js` - Authentication (signUp, signIn, signOut, getSession)
- `src/services/supabaseStorageService.js` - CRUD operations for all entities
- `supabase-schema.sql` - Database schema with RLS policies

**How It Works**:
1. User can use app without account (localStorage only)
2. User signs up/logs in → Automatic migration from localStorage to Supabase
3. All data operations check if user is authenticated
4. If authenticated → Save to Supabase, else → Save to localStorage
5. Row-Level Security ensures users only see their own data
6. Session tokens auto-refresh

**AppContext Changes**:
- Added `user`, `session`, `authLoading` state
- Added `checkAuth()` to verify session on mount
- Added `loadSupabaseData()` to fetch from cloud
- Added `migrateLocalStorageToSupabase()` for one-time migration
- Modified all CRUD operations to support dual storage

### 🏦 Account Type Management
**What**: Create and manage account types (Checking, Savings, Credit, Loan)

**Key Features**:
- Duplicate account names allowed with different types (e.g., "TD Bank" Checking + "TD Bank" Credit)
- Statement and transaction count tracking
- Edit account associations for uploaded statements
- Color-coded indicators

**Key Files**:
- `src/components/AccountTypePanel.jsx` - UI for managing account types
- `src/context/AppContext.jsx` - CRUD operations (addAccountType, updateAccountType, deleteAccountType)

**Validation Logic**:
```javascript
// Allow duplicate names as long as typeFlag is different
if (accountTypes.some(at => at.name === accountType.name && at.typeFlag === accountType.typeFlag)) {
  setError(`Account type "${accountType.name}" with type "${accountType.typeFlag}" already exists`);
  return false;
}
```

**Stats Calculation**:
```javascript
// Count unique statements (accountNumber + month combinations)
const uniqueStatements = new Set(
  accountTypeTransactions.map(t => `${t.accountNumber || 'N/A'}-${t.month || t.date.substring(0, 7)}`)
);
const statementCount = uniqueStatements.size;
```

### 🔍 Similar Transactions Detection
**What**: Automatically find and bulk categorize similar uncategorized transactions

**Key Files**:
- `src/utils/similarityMatcher.js` - Fuzzy matching algorithm (90% threshold)
- `src/components/SimilarTransactionsModal.jsx` - UI for bulk categorization

**How It Works**:
1. User categorizes a transaction
2. System searches for similar uncategorized transactions (Levenshtein distance)
3. If found → Show modal with similar transactions
4. User selects which ones to categorize together
5. Bulk categorization applied

**Similarity Algorithm**:
```javascript
function calculateSimilarity(str1, str2) {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - (distance / maxLength); // Returns 0-1 (1 = identical)
}
// Match if similarity >= 0.9
```

### 🗑️ Custom Delete Confirmation Modal
**What**: Themed modal with keyboard shortcuts instead of browser's confirm()

**Key Features**:
- Keyboard shortcuts: Enter (confirm), Esc (cancel)
- Shows CTRL+Z reminder for undo
- Matches app theme
- Event listeners for keyboard input

**Key Files**:
- `src/components/DeleteConfirmationModal.jsx` - Custom modal
- `src/components/TransactionTable.jsx` - Uses modal for delete confirmation

### 📊 Enhanced Manage Uploads
**What**: View and edit all uploaded statements grouped by account type

**Key Features**:
- Shows account type, account number, month, transaction count
- Statement duration (date range)
- Edit account type and account number per statement
- Delete entire statement uploads
- Expandable transaction list per statement

**Grouping Logic**:
```javascript
const uploadKey = `${accountTypeId}-${accountNumber}-${month}`;
// Groups transactions by unique combination
```

### 💰 Cost Type Classification System
**What**: Automatic classification of transactions as Fixed or Variable costs

**Key Features**:
- Fixed costs: Predictable recurring expenses (Housing, Transportation, Main Job)
- Variable costs: Fluctuating expenses (Grocery, Restaurants, Shopping, Subscriptions)
- Auto-assignment when categorizing transactions
- Visual badges: Orange for FIXED, Blue for VARIABLE
- Category-level cost type defaults
- Transaction-level manual override

**Key Files**:
- `src/utils/categoryMetadata.js` - Cost type constants and helpers (NEW)
- `src/services/storageService.js` - Category metadata storage
- `src/services/supabaseStorageService.js` - Cloud storage for category metadata
- `src/context/AppContext.jsx` - Auto-assign cost types on categorization
- `src/components/CategoryPanel.jsx` - Cost type badge display and editor
- `src/components/TransactionTable.jsx` - Cost type badges in Description field

**Default Cost Type Mappings**:
```javascript
{
  'Housing': { isIncome: false, costType: 'Fixed' },
  'Transportation': { isIncome: false, costType: 'Fixed' },
  'Main Job (Income)': { isIncome: true, costType: 'Fixed' },
  'Grocery': { isIncome: false, costType: 'Variable' },
  'Restaurants': { isIncome: false, costType: 'Variable' },
  'Shopping': { isIncome: false, costType: 'Variable' },
  'Subscriptions': { isIncome: false, costType: 'Variable' }
}
```

**Badge Styling**:
```javascript
// Orange for Fixed
{ backgroundColor: '#FF6B35', color: '#FFFFFF', label: 'FIXED' }
// Blue for Variable
{ backgroundColor: '#4ECDC4', color: '#FFFFFF', label: 'VARIABLE' }
```

### 🗑️ Bulk Delete & Action History
**What**: Comprehensive undo system that tracks last 5 actions for reversal

**Key Features**:
- Track DELETE, CATEGORIZE, UPDATE actions
- Undo last 5 actions with Reverse button (↶)
- Bulk delete multiple selected transactions
- Dynamic confirmation messages ("Delete X transactions?")
- Replaces single-transaction undo with comprehensive history

**Key Files**:
- `src/context/AppContext.jsx` - Action history state and undo logic
- `src/components/TransactionTable.jsx` - Bulk delete UI and Reverse button

**Action History Implementation**:
```javascript
// Action types tracked
type Action = {
  type: 'DELETE' | 'CATEGORIZE' | 'UPDATE',
  timestamp: string,
  data: {
    deletedTransactions?: Transaction[],  // For DELETE
    previousState?: any[],                // For CATEGORIZE
    id?: string,                         // For UPDATE
    previousValues?: any                 // For UPDATE
  }
}

// Undo logic
function undoLastAction() {
  const lastAction = actionHistory[0];
  switch (lastAction.type) {
    case 'DELETE':
      // Restore deleted transactions
      restoreTransactions(lastAction.data.deletedTransactions);
      break;
    case 'CATEGORIZE':
      // Restore previous categories
      restoreCategories(lastAction.data.previousState);
      break;
    case 'UPDATE':
      // Restore previous values
      restoreValues(lastAction.data.id, lastAction.data.previousValues);
      break;
  }
  removeActionFromHistory();
}
```

**UI Changes**:
- Removed "Undo Delete" button
- Added "Reverse" button with ↶ icon (shows count of available undos)
- Added "Delete (X)" button when multiple transactions selected
- Bulk delete shows dynamic message in confirmation modal

### 🔧 Supabase Migration Fixes
**What**: Fixed column name transformation errors between JavaScript and PostgreSQL

**Problem**: Supabase uses snake_case (account_number) but JavaScript uses camelCase (accountNumber)

**Solution**: Added transformation helper functions in `supabaseStorageService.js`

**Key Changes**:
```javascript
// Transform account types
_transformAccountTypeFromDB(at) {
  return {
    id: at.id,
    name: at.name,
    typeFlag: at.type_flag,      // snake_case → camelCase
    createdAt: at.created_at
  };
}

_transformAccountTypeToDB(at, userId) {
  return {
    id: at.id,
    user_id: userId,
    name: at.name,
    type_flag: at.typeFlag,       // camelCase → snake_case
    created_at: at.createdAt
  };
}

// Transform transactions
_transformTransactionFromDB(t) {
  return {
    accountNumber: t.account_number,
    accountTypeId: t.account_type_id,
    accountTypeName: t.account_type_name,
    accountTypeFlag: t.account_type_flag,
    originalDescription: t.original_description,
    costType: t.cost_type,
    createdAt: t.created_at,
    // ... other fields
  };
}
```

**Fixed Errors**:
- ✅ `Could not find 'createdAt' column` → Now uses `created_at`
- ✅ `Could not find 'accountNumber' column` → Now uses `account_number`
- ✅ All CRUD operations properly transform column names

## Quick Start for Claude
When working on this project:
1. Run `npm install` if first time
2. Copy `.env.example` to `.env` and add required keys
3. **Start Python backend**: `cd backend && python app.py`
4. **Start frontend**: `npm run dev`
5. Check browser console for errors
6. Test with sample PDF from TD Bank
7. **Optional**: Set up Supabase project and add credentials to `.env`

## Contact
This is a personal finance tool. For questions about implementation, check:
- README.md (user guide)
- Inline code comments
- Git history for context
