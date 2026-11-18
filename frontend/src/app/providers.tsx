import { HashRouter } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

// Routing setup does not initialize Firebase or modify production services.
export function AppProviders({ children }: PropsWithChildren) {
  return <HashRouter>{children}</HashRouter>;
}
