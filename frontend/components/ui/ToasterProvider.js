'use client';

import { useTheme } from 'next-themes';
import { Toaster } from 'sonner';

// Glass theme has no direct sonner equivalent — its dark, glassy backdrop reads fine with
// sonner's "dark" preset, so it's mapped there.
export default function ToasterProvider() {
  const { theme } = useTheme();
  const sonnerTheme = theme === 'light' ? 'light' : 'dark';

  return (
    <Toaster
      theme={sonnerTheme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        className: 'font-sans',
        style: { borderRadius: '0.875rem' },
      }}
    />
  );
}
