'use client';

// ─── تأمین‌کننده تم روشن/تاریک ───
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="erp-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
