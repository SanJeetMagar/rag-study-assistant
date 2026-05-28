// src/components/LoadingSpinner.jsx
import React from 'react';

/**
 * Reusable loading indicator Spinner
 * Adheres to color guidelines using accent values. Includes optional tag details.
 */
export default function LoadingSpinner({ size = 'md', label }) {
  // Dimensions layout configuration
  const dimensions = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div 
        className={`
          ${dimensions}
          rounded-full 
          animate-spin 
          border-[var(--paper-3)] 
          border-t-[var(--accent)]
        `}
        role="status"
        aria-label="loading"
      />
      {label && (
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]">
          {label}
        </span>
      )}
    </div>
  );
}