'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

// Four themes: light, dark, glass, and midnight (Professional Midnight Blue). next-themes only
// ever applies a single class token per theme (a value containing a space, e.g. "theme-glass
// dark", throws — DOMTokenList rejects tokens with whitespace), so each dark-family theme gets
// its own single class. They still get dark mode's proven text contrast for free:
// tailwind.config.js's darkMode selector matches `.dark`, `.theme-glass`, or `.theme-midnight`,
// so every `dark:` utility in the app already applies under all three. Each theme class then
// layers its own distinct color language (surface tint, animated body gradient, glass tinting,
// glow shadows) on top via rules in globals.css.
export default function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={['light', 'dark', 'glass', 'midnight']}
      value={{
        light: 'light',
        dark: 'dark',
        glass: 'theme-glass',
        midnight: 'theme-midnight',
      }}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
