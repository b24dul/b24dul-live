import { useState, type FormEvent } from 'react';
import { GlassPanel } from '../../components/ui';
import { privacyRequestMailto } from './privacyDraft';

const currentSite = 'https://b24dul.github.io/b24dul-live/legacy/';

export function PrivacyRequest() {
  const [uid, setUid] = useState('');
  const [mailto, setMailto] = useState<string | null>(null);
  const [error, setError] = useState('');

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = privacyRequestMailto(uid);
    if (!draft) {
      setMailto(null);
      setError('Enter a valid visitor account ID from the current site.');
      return;
    }
    setError('');
    setMailto(draft);
  }

  return (
    <section aria-labelledby="privacy-request-title">
      <GlassPanel className="p-6 sm:p-8">
        <h2 className="text-xl font-semibold" id="privacy-request-title">
          Request visitor data deletion
        </h2>
        <p className="mt-3 max-w-2xl text-slate-300">
          This preview cannot access your visitor account ID. On the current site, use “Request data
          deletion” to find it, then enter it here to prepare an email. Your ID is not saved by this
          form.
        </p>
        <a
          className="ui-button ui-button--secondary mt-4"
          href={currentSite}
          target="_blank"
          rel="noopener noreferrer"
        >
          Find your ID on the current site
        </a>
        <form className="mt-5 flex max-w-xl flex-col gap-3" onSubmit={prepare} noValidate>
          <label className="text-sm font-semibold" htmlFor="privacy-visitor-id">
            Visitor account ID
          </label>
          <input
            aria-describedby="privacy-request-help privacy-request-error"
            autoComplete="off"
            className="min-w-0 rounded-lg border border-slate-500 bg-slate-950 px-3 py-2 text-white"
            id="privacy-visitor-id"
            maxLength={128}
            onChange={(event) => {
              setUid(event.target.value);
              setMailto(null);
              setError('');
            }}
            value={uid}
          />
          <p className="text-sm text-slate-300" id="privacy-request-help">
            Your email app will open a draft. Nothing is sent until you choose to send it.
          </p>
          <p className="text-sm text-red-200" id="privacy-request-error" role="alert">
            {error}
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="ui-button ui-button--secondary" type="submit">
              Prepare email request
            </button>
            {mailto && (
              <a className="ui-button ui-button--primary" href={mailto}>
                Open email draft
              </a>
            )}
          </div>
        </form>
        <p className="mt-4 max-w-2xl text-sm text-slate-300">
          The administrator reviews requests. Public chat, leaderboard scores and sign-in accounts
          may need separate review; preparing an email does not delete data.
        </p>
      </GlassPanel>
    </section>
  );
}
