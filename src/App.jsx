import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Dashboard from './components/Dashboard';
import FileUpload from './components/FileUpload';
import TemplateSelector from './components/TemplateSelector';
import TransactionTable from './components/TransactionTable';
import CategoryPanel from './components/CategoryPanel';
import AccountTypePanel from './components/AccountTypePanel';
import ManualEntryModal from './components/ManualEntryModal';

function AppContent() {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'transactions'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-pastel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-textDark">
              Bank Statement Analyzer
            </h1>

            <button
              onClick={() => setShowManualEntry(true)}
              className="btn-primary"
            >
              + Add Transaction
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="mt-6 flex gap-4 border-b-2 border-gray-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-3 px-4 font-semibold transition-colors ${
                activeTab === 'dashboard'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-textDark'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`pb-3 px-4 font-semibold transition-colors ${
                activeTab === 'transactions'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-textDark'
              }`}
            >
              Transactions
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' ? (
          <Dashboard />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column: Upload & Categories */}
            <div className="lg:col-span-1 space-y-6">
              <TemplateSelector />

              <FileUpload />

              <AccountTypePanel />

              <CategoryPanel />
            </div>

            {/* Right Column: Transactions */}
            <div className="lg:col-span-3">
              <TransactionTable />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white mt-12 shadow-pastel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p className="mb-2">
              🔒 Your data stays on your device. Nothing is stored on external servers except OpenAI API calls for categorization.
            </p>
            <p>
              Built with React + Vite • Powered by OpenAI GPT-4o-mini
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ManualEntryModal
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
      />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
