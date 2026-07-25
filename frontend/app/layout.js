import { Inter, Lexend } from 'next/font/google';
import './globals.css';
import StoreProvider from '@/store/StoreProvider';
import ThemeProvider from '@/components/ThemeProvider';
import SiteChrome from '@/components/layout/SiteChrome';
import AuroraBackground from '@/components/ui/AuroraBackground';
import ToasterProvider from '@/components/ui/ToasterProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend' });

export const metadata = {
  title: 'RentEase – Furniture & Appliance Rental Platform',
  description: 'Rent furniture and appliances monthly across Hyderabad, Bengaluru, Chennai and Mumbai.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${lexend.variable}`} suppressHydrationWarning>
      <body className="relative flex min-h-screen flex-col font-sans">
        <ThemeProvider>
          <StoreProvider>
            <AuroraBackground className="fixed opacity-60 dark:opacity-40" />
            <ToasterProvider />
            <SiteChrome>{children}</SiteChrome>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
