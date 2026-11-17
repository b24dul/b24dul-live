import { ArrowUpRight } from 'lucide-react';
import { Link, Route, Routes } from 'react-router-dom';

function FoundationHome() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
      <div className="mb-5 inline-flex w-fit rounded-full border border-cyan-400/40 px-3 py-1 text-xs tracking-widest text-cyan-200 uppercase">
        Isolated development preview
      </div>
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">B24DUL</h1>
      <p className="mt-4 max-w-xl text-slate-300">
        Phase 1 establishes the new React foundation. The existing public site remains unchanged.
        Streaming, authentication, chat, games and real data are not connected in this preview.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <a
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
          href="https://b24dul.github.io/b24dul-live/"
        >
          Visit current site <ArrowUpRight aria-hidden="true" size={18} />
        </a>
        <Link
          className="inline-flex items-center rounded-lg border border-white/25 px-4 py-3 font-semibold hover:bg-white/10"
          to="/about-preview"
        >
          Preview information
        </Link>
      </div>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<FoundationHome />} />
      <Route
        path="/about-preview"
        element={
          <main className="mx-auto max-w-2xl px-6 py-20">
            <h1 className="text-3xl font-bold">Frontend foundation preview</h1>
            <p className="mt-4 text-slate-300">
              This is a disconnected frontend scaffold, not a production release.
            </p>
            <Link className="mt-6 inline-block underline" to="/">
              Back to foundation
            </Link>
          </main>
        }
      />
      <Route path="*" element={<FoundationHome />} />
    </Routes>
  );
}
