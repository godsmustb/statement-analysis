# Bank Statement Analyzer - Quick Context

## Project Overview
AI-powered bank statement analyzer built with React + Vite. Parses PDFs, categorizes expenses using OpenAI GPT-4o-mini, and provides visual analytics.

## Tech Stack at a Glance
- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS (vibrant pastel theme)
- **Charts**: Recharts
- **PDF**: PDF.js (pdfjs-dist)
- **AI**: OpenAI GPT-4o-mini-2024-07-18
- **Storage**: localStorage
- **State**: React Context API
- **Utilities**: Fuse.js (fuzzy matching), UUID, Axios

## Key Architecture Decisions

### 1. Client-Side Only (No Backend)
- All data stored in browser localStorage
- Only external calls: OpenAI API
- Reduces complexity and hosting costs
- User data privacy (stays on device)

### 2. PDF Parsing Strategy
- **Primary**: Template-based parsing (fast, accurate for known banks)
- **Fallback**: AI parsing with OpenAI (flexible for unknown formats)
- Templates auto-saved after first successful parse

### 3. AI Categorization Workflow
1. Check vendor mappings (fuzzy match)
2. If no match, query OpenAI API
3. Apply only if confidence > 0.7
4. Otherwise mark as "Unassigned"

### 4. State Management
- Context API for global state
- localStorage service for persistence
- Auto-save on every modification
- Export/import for backup

## File Structure Quick Reference
```
src/
├── components/          # React UI components
│   ├── Charts/         # Recharts visualization
│   ├── Dashboard.jsx   # Main analytics view
│   ├── FileUpload.jsx  # PDF upload & processing
│   ├── TransactionTable.jsx  # Table with filters/sort
│   └── CategoryPanel.jsx     # Category management
├── context/
│   └── AppContext.jsx  # Global state & actions
├── services/
│   ├── openaiService.js      # AI integration
│   ├── pdfParser.js          # PDF extraction
│   ├── storageService.js     # localStorage wrapper
│   └── templateService.js    # Bank templates (not yet created)
└── utils/
    ├── fuzzyMatch.js         # Vendor matching
    ├── duplicateDetector.js  # Find duplicates
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
- `VITE_OPENAI_API_KEY` - OpenAI API key (required)
- `VITE_OPENAI_MODEL` - Model name (optional, defaults to gpt-4o-mini-2024-07-18)
- `VITE_MAX_FILE_SIZE_MB` - Max PDF size (optional, defaults to 10)

## Known Limitations

### Current MVP Constraints
1. **No multi-user support** - Single user per browser
2. **No cloud sync** - Data tied to browser localStorage
3. **PDF must be text-based** - Scanned/image PDFs won't work
4. **Template parsing basic** - Complex layouts may fail
5. **No data encryption** - localStorage is plain text
6. **No offline AI** - Requires internet for categorization

### Browser Compatibility
- **Requires**: localStorage, ES6+, Fetch API
- **Tested**: Chrome, Firefox, Safari (latest)
- **Not supported**: IE11, very old browsers

### localStorage Limits
- **Typical quota**: 5-10MB per domain
- **Est. capacity**: ~5,000-10,000 transactions
- **Overflow handling**: Graceful error, prompt to export/clear

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

## Quick Start for Claude
When working on this project:
1. Run `npm install` if first time
2. Copy `.env.example` to `.env` and add OpenAI key
3. Run `npm run dev`
4. Check browser console for errors
5. Test with sample PDF from TD or RBC

## Contact
This is a personal finance tool. For questions about implementation, check:
- README.md (user guide)
- Inline code comments
- Git history for context
