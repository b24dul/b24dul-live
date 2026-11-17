import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { GlassPanel, PrimaryButton } from '../components/ui';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Never log private user data or error details into public UI.
    if (import.meta.env.DEV) console.error('Preview render error', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="mx-auto grid min-h-screen max-w-xl place-items-center px-5">
        <GlassPanel className="w-full p-8">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="mt-3 text-slate-300">
            The development preview could not display this section. No production account or data was changed.
          </p>
          <PrimaryButton className="mt-6" onClick={() => window.location.reload()}>
            Reload preview
          </PrimaryButton>
        </GlassPanel>
      </main>
    );
  }
}
