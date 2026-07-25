'use client';

import { useSelector } from 'react-redux';
import { ShieldCheck, Building2, User } from 'lucide-react';

const ROLE_META = {
  customer: { label: 'Customer', icon: User, badge: 'bg-brand-500/15 text-brand-700 dark:text-brand-300' },
  vendor: { label: 'Vendor', icon: Building2, badge: 'bg-accent-500/15 text-accent-700 dark:text-accent-300' },
  admin: { label: 'Admin', icon: ShieldCheck, badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  delivery_partner: { label: 'Delivery Partner', icon: User, badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
};

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
}

export default function UserInfoCard({ className = '' }) {
  const user = useSelector((state) => state.auth.user);
  if (!user) return null;

  const meta = ROLE_META[user.role] || ROLE_META.customer;
  const Icon = meta.icon;

  return (
    <div
      className={`glass flex items-center gap-3 rounded-2xl border border-slate-200/70 p-3 dark:border-white/10 ${className}`}
    >
      {user.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar} alt={user.name} className="h-11 w-11 shrink-0 rounded-full object-cover shadow-premium" />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white shadow-premium">
          {initials(user.name)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
        <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
          <Icon size={10} />
          {meta.label}
        </span>
      </div>
    </div>
  );
}
