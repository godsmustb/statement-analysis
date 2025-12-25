import React, { useState } from 'react';
import TemplateManager from './TemplateManager';

export default function TemplateSelector() {
  const [showManager, setShowManager] = useState(false);

  return (
    <>
      <div className="card mb-6">
        <button
          onClick={() => setShowManager(true)}
          className="btn-primary w-full"
        >
          Manage Uploads
        </button>
      </div>

      <TemplateManager
        isOpen={showManager}
        onClose={() => setShowManager(false)}
      />
    </>
  );
}
