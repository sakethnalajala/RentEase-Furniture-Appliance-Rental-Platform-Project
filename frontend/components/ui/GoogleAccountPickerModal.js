'use client';

import { Mail } from 'lucide-react';
import Modal from './Modal';
import Spinner from './Spinner';

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
}

// Shown when the simulated "Continue with Google" flow finds more than one real (non-demo)
// account for the selected role — mirrors a real Google account chooser closely enough to read
// as intentional, without pretending to be the real thing.
export default function GoogleAccountPickerModal({ open, onClose, accounts, onSelect, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="Choose an account">
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        More than one account was found for this role. Select one to continue.
      </p>
      <div className="flex flex-col gap-2">
        {accounts.map((account) => (
          <button
            key={account.email}
            type="button"
            disabled={loading}
            onClick={() => onSelect(account)}
            className="focus-ring flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white/70 px-4 py-3 text-left transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold text-white shadow-premium">
              {account.name ? initials(account.name) : <Mail size={14} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{account.name}</p>
              <p className="truncate text-xs text-slate-400">{account.email}</p>
            </div>
            {loading && <Spinner size="sm" />}
          </button>
        ))}
      </div>
    </Modal>
  );
}
