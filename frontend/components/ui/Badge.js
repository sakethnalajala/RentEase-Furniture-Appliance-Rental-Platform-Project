const VARIANTS = {
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  accent: 'bg-accent-100 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
};

export default function Badge({ children, variant = 'brand', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
