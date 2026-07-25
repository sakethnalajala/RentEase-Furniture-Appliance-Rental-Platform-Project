import Link from 'next/link';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';

const COLUMNS = [
  {
    title: 'Platform',
    links: [
      { label: 'Browse furniture', href: '/' },
      { label: 'Browse appliances', href: '/' },
      { label: 'How it works', href: '/' },
      { label: 'Become a vendor', href: '/register' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About RentEase', href: '/' },
      { label: 'Careers', href: '/' },
      { label: 'Support', href: '/' },
      { label: 'Contact', href: '/' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of service', href: '/' },
      { label: 'Privacy policy', href: '/' },
      { label: 'Refund policy', href: '/' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-slate-200/70 bg-white/60 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 lg:px-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white shadow-premium">
                R
              </span>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Rent<span className="text-gradient">Ease</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Furniture & appliance rentals for people on the move — Hyderabad, Bengaluru, Chennai and Mumbai.
            </p>
            <div className="mt-5 flex gap-3">
              {[Github, Twitter, Linkedin, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 text-slate-500 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-white/10 dark:text-slate-400 dark:hover:text-brand-300"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-500 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200/70 pt-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} RentEase. All rights reserved.</p>
          <div className="flex gap-4">
            <span>Furniture</span>
            <span>Appliances</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
