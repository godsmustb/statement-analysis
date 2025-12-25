import React, { useEffect } from 'react';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, message }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        // CTRL+Z will be handled after deletion via Undo button
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-textDark mb-2">
            Confirm Deletion
          </h2>
          <p className="text-gray-700">
            {message || 'Are you sure you want to delete this transaction?'}
          </p>
          <p className="text-sm text-gray-500 mt-3">
            Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">CTRL+Z</kbd> after deletion to undo
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-secondary"
            autoFocus
          >
            No
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Yes
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">Enter</kbd> to confirm •
            Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">Esc</kbd> to cancel
          </p>
        </div>
      </div>
    </div>
  );
}
