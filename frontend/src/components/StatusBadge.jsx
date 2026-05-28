// src/components/StatusBadge.jsx
import React from 'react';

/**
 * Reusable styled Pill Badge
 * Encapsulates dynamic layout definitions matching standard state strings:
 * pending | processing | ready | error | active | inactive.
 */
export default function StatusBadge({ status }) {
  const normStatus = status ? status.toLowerCase() : 'pending';

  // State thematic layout mappings
  const themeMap = {
    pending: {
      bg: 'bg-[var(--warn-light)]',
      text: 'text-[var(--warn)]',
      border: 'border-[var(--warn)]/20',
      label: 'Pending',
    },
    processing: {
      bg: 'bg-[var(--accent-4-light)]',
      text: 'text-[var(--accent-4)]',
      border: 'border-[var(--accent-4)]/20',
      label: 'Processing',
    },
    ready: {
      bg: 'bg-[var(--accent-2-light)]',
      text: 'text-[var(--accent-2)]',
      border: 'border-[var(--accent-2)]/20',
      label: 'Ready',
    },
    error: {
      bg: 'bg-[var(--accent-light)]',
      text: 'text-[var(--accent)]',
      border: 'border-[var(--accent)]/20',
      label: 'Error',
    },
    active: {
      bg: 'bg-[var(--accent-2-light)]',
      text: 'text-[var(--accent-2)]',
      border: 'border-[var(--accent-2)]/20',
      label: 'Active',
    },
    inactive: {
      bg: 'bg-[var(--paper-3)]',
      text: 'text-[var(--ink-3)]',
      border: 'border-[var(--border)]',
      label: 'Inactive',
    },
  };

  const theme = themeMap[normStatus] || themeMap.pending;

  return (
    <span 
      className={`
        inline-flex items-center font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] px-2.5 py-1 rounded-[4px] border
        ${theme.bg} ${theme.text} ${theme.border}
      `}
    >
      {/* Blinking indicator for active-in-progress workloads */}
      {normStatus === 'processing' && (
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-4)] animate-pulse mr-1.5" />
      )}
      {theme.label}
    </span>
  );
}
