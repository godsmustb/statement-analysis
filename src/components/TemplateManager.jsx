import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import ConfirmationModal from './ConfirmationModal';

export default function TemplateManager({ isOpen, onClose }) {
  const { templates, deleteTemplate } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (!isOpen) return null;

  const handleDelete = (bankName) => {
    setConfirmDelete(bankName);
  };

  const confirmDeleteTemplate = () => {
    if (confirmDelete) {
      deleteTemplate(confirmDelete);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-textDark">Template Manager</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-textDark text-2xl"
            >
              ×
            </button>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No templates saved yet.</p>
              <p className="text-sm mt-2">Templates will be automatically created when you upload bank statements.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(template => (
                <div
                  key={template.bankName}
                  className="flex items-center justify-between p-4 bg-background rounded-lg"
                >
                  <div>
                    <h3 className="font-semibold text-textDark">{template.bankName}</h3>
                    <p className="text-sm text-gray-600">
                      Last updated: {new Date(template.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(template.bankName)}
                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-secondary bg-opacity-10 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> Templates help parse bank statements more accurately.
              If you delete a template and upload the same bank again, a new template will be created.
            </p>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmDelete !== null}
        title="Delete Template"
        message={`Are you sure you want to delete the template for ${confirmDelete}? This action cannot be undone. You can create a new template by uploading statements from this bank again.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDeleteTemplate}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
