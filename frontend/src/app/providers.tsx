import { HashRouter } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { AccountProvider } from '../contexts/AccountContext';
import { LiveStatusProvider } from '../contexts/LiveStatusContext';

// Firebase is loaded on demand by AccountProvider (only when a page needs sign-in).
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <HashRouter>
      <AccountProvider>
        <LiveStatusProvider>{children}</LiveStatusProvider>
      </AccountProvider>
    </HashRouter>
  );
}
