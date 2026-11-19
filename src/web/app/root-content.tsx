'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from './providers';
import { Header } from './header';

export function RootContent({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <Header />
      {children}
    </ThemeProvider>
  );
}
