import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useApp } from '../context/AppContext';
import pdfParser from '../services/pdfParser';
import { validateFile } from '../utils/validators';

export default function FileUpload() {
  const { addMultipleTransactions, autoCategorizeTransactions, addTemplate } = useApp();
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!source.trim()) {
      setError('Please enter an account nickname (Source) before uploading');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadResults([]);

    const results = [];

    for (const file of acceptedFiles) {
      const validation = validateFile(file);

      if (!validation.isValid) {
        results.push({
          fileName: file.name,
          status: 'error',
          error: validation.errors.join(', ')
        });
        continue;
      }

      try {
        results.push({
          fileName: file.name,
          status: 'processing',
          message: 'Parsing PDF...'
        });
        setUploadResults([...results]);

        const parsed = await pdfParser.parseFile(file, source);

        results[results.length - 1] = {
          fileName: file.name,
          status: 'processing',
          message: 'Categorizing transactions...',
          bankName: parsed.bankName,
          month: parsed.statementMonth,
          transactionCount: parsed.transactions.length
        };
        setUploadResults([...results]);

        // Auto-categorize transactions
        const categorized = await autoCategorizeTransactions(parsed.transactions);

        results[results.length - 1] = {
          fileName: file.name,
          status: 'complete',
          bankName: parsed.bankName,
          month: parsed.statementMonth,
          transactionCount: parsed.transactions.length,
          transactions: categorized,
          parsingRules: parsed.parsingRules
        };

        // Save template if we have parsing rules
        if (parsed.parsingRules) {
          addTemplate({
            bankName: parsed.bankName,
            source: source,
            parsingRules: parsed.parsingRules
          });
        }

      } catch (err) {
        results[results.length - 1] = {
          fileName: file.name,
          status: 'error',
          error: err.message
        };
      }

      setUploadResults([...results]);
    }

    setUploading(false);

    // Add all successful transactions immediately
    const successful = results.filter(r => r.status === 'complete');
    if (successful.length > 0) {
      // Add all transactions with source and account number
      const allTransactions = successful.flatMap(r =>
        r.transactions.map(t => ({
          ...t,
          bank: r.bankName,
          source: source,
          accountNumber: accountNumber
        }))
      );
      addMultipleTransactions(allTransactions);
    }
  }, [source, accountNumber, addMultipleTransactions, autoCategorizeTransactions, addTemplate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
        return <div className="spinner w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />;
      case 'complete':
        return <span className="text-success text-xl">✓</span>;
      case 'error':
        return <span className="text-red-500 text-xl">✗</span>;
      default:
        return null;
    }
  };

  return (
    <div className="card mb-6">
        <h2 className="text-xl font-bold text-textDark mb-4">Upload Bank Statements</h2>

        {/* Source and Account Number inputs */}
        <div className="mb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-textDark mb-1">
              Account Nickname (Source) *
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g., TD Checking, RBC Savings"
              className="input-field"
              disabled={uploading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textDark mb-1">
              Account Number (optional)
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g., ****1234"
              className="input-field"
              disabled={uploading}
            />
          </div>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-primary bg-primary bg-opacity-5'
              : 'border-secondary border-opacity-50 hover:border-primary hover:bg-primary hover:bg-opacity-5'
          }`}
        >
          <input {...getInputProps()} disabled={uploading || !source.trim()} />

          {!source.trim() ? (
            <div>
              <p className="text-gray-500 mb-2">Please enter account nickname first</p>
            </div>
          ) : uploading ? (
            <div>
              <div className="spinner w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-textDark font-semibold">Processing files...</p>
            </div>
          ) : isDragActive ? (
            <div>
              <p className="text-primary font-semibold text-lg">Drop files here</p>
            </div>
          ) : (
            <div>
              <svg
                className="w-12 h-12 mx-auto mb-3 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-textDark font-semibold mb-2">
                Drag and drop PDF files here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supports multiple files • Max 10MB per file
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {uploadResults.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="font-semibold text-textDark mb-3">Upload Status</h3>
            {uploadResults.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-background rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <p className="font-medium text-textDark">{result.fileName}</p>
                    {result.bankName && (
                      <p className="text-sm text-gray-600">
                        {result.bankName} • {result.month} • {result.transactionCount} transactions
                      </p>
                    )}
                    {result.message && (
                      <p className="text-sm text-gray-600">{result.message}</p>
                    )}
                    {result.error && (
                      <p className="text-sm text-red-600">{result.error}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
