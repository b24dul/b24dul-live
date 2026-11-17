import { HashRouter } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

// Phase 1 intentionally does not load Firebase or perform any network requests.
export function AppProviders({ children }: PropsWithChildren) {
  return <HashRouter>{children}</HashRouter>;
}
