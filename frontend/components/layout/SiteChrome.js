'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

// Dashboard-style areas (the customer app shell, and future vendor/admin ones) bring their
// own header/sidebar and shouldn't also carry the marketing navbar + footer.
const DASHBOARD_PREFIXES = ['/customer'];

export default function SiteChrome({ children }) {
  const pathname = usePathname();
  const isDashboard = DASHBOARD_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isDashboard) return <main className="relative flex-1">{children}</main>;

  return (
    <>
      <Navbar />
      <main className="relative flex-1">{children}</main>
      <Footer />
    </>
  );
}
