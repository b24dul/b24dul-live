import { Link } from 'react-router-dom';
import { GlassPanel, PageHeader } from '../../components/ui';

export const PRIVACY_NOTICE_UPDATED = '18 November 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassPanel as="section" className="p-6 sm:p-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 flex max-w-3xl flex-col gap-3 text-slate-300">{children}</div>
    </GlassPanel>
  );
}

/** Plain-English privacy notice for the new site. Update it before shipping anything that stores new data. */
export function PrivacyNotice() {
  return (
    <section className="flex min-w-0 flex-col gap-8">
      <PageHeader
        title="Privacy notice"
        description={`What the new B24DUL site records, and why. Last updated ${PRIVACY_NOTICE_UPDATED}.`}
      />
      <Section title="The short version">
        <ul className="list-disc space-y-2 pl-5">
          <li>You can use the site without signing in.</li>
          <li>
            If you sign in with Google, your name, email address and photo are{' '}
            <strong>never shown to other people</strong> and are{' '}
            <strong>not copied into the site’s database</strong>.
          </li>
          <li>
            Other visitors will only ever see a nickname you choose, never your real name. Please
            don’t put your real name in your nickname or messages.
          </li>
          <li>
            Chat messages and nicknames are public. Online status is visible only to the site owner.
          </li>
          <li>The new site does not use advertising or tracking cookies.</li>
        </ul>
      </Section>
      <Section title="Signing in">
        <p>
          Sign-in uses Firebase Authentication, a Google service. You can continue as a guest, which
          creates a random account ID that lives only in this browser, or sign in with Google.
        </p>
        <p>
          When you sign in with Google, Google tells Firebase Authentication your account ID, name,
          email address and profile photo. Firebase Authentication keeps these in the site’s account
          list so that you can sign in again. Only the site owner can see that list. The site does
          not copy them into its database, and they are never shown to other visitors.
        </p>
        <p>
          Your own name and email appear on your Account page only for you. They are read from the
          sign-in session in your own browser.
        </p>
        <p>
          The new site starts fresh: accounts, names and scores from the old site are not carried
          over.
        </p>
      </Section>
      <Section title="Stored on your device">
        <ul className="list-disc space-y-2 pl-5">
          <li>Your sign-in session (in your browser’s storage), until you sign out.</li>
          <li>Display preferences, such as the sidebar setting.</li>
          <li>Practice game progress for Sudoku and 2048.</li>
        </ul>
        <p>
          You can remove all of this by signing out and clearing this site’s data in your browser.
        </p>
      </Section>
      <Section title="Other services the site uses">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>GitHub Pages</strong> hosts the site. Like any web host, it receives your IP
            address when pages load.
          </li>
          <li>
            <strong>Cloudflare</strong> runs the service that tells the site whether the stream is
            live. Your browser asks it for the current status; no account details are sent.
          </li>
          <li>
            <strong>YouTube</strong>: the embedded player loads only when you choose to open it, and
            then uses YouTube’s privacy-enhanced mode. Videos in the archive open on YouTube.
          </li>
          <li>
            <strong>Firebase</strong> (Google) provides sign-in. The chat is stored in its database
            in Google’s European (Belgium) data centre.
          </li>
        </ul>
      </Section>
      <Section title="Chat">
        <p>To chat you continue as a guest or sign in, then choose a nickname. The chat stores:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Your nickname</strong>, linked to your random account ID. Anyone can see it.
          </li>
          <li>
            <strong>Your messages</strong>: the text, the time and your account ID. Anyone can read
            them. They stay until the site owner removes them or clears the chat.
          </li>
          <li>
            <strong>Online status</strong>: while the chat is open, a record that you are connected
            and since when. Only the site owner can see it, and it is removed when you leave.
          </li>
          <li>
            <strong>The time of your last message</strong>, to enforce the 5-second slow mode. Only
            you can see it.
          </li>
          <li>
            <strong>Moderation</strong>: if the site owner mutes or bans an account, that is
            recorded against the account ID. Only that person and the site owner can see it.
          </li>
        </ul>
        <p>
          Your account ID is a random code created by Firebase. It is not your Google account ID and
          does not reveal who you are. The database only accepts a nickname on your public profile,
          so your Google name, email and photo cannot be saved there.
        </p>
        <p>
          The chat blocks swearing, links, email addresses, phone numbers and questions asking for
          personal details. Please don’t share them in any form.
        </p>
      </Section>
      <Section title="Features still to come">
        <p>
          Leaderboards and visitor statistics are not on the new site yet. Before either goes live,
          this notice will be updated to say exactly what it stores and who can see it.
        </p>
      </Section>
      <Section title="Your choices">
        <p>
          You can sign out at any time on the{' '}
          <Link className="font-semibold underline underline-offset-4" to="/profile">
            Account page
          </Link>
          . To ask for your data to be deleted, use the privacy request on the same page.
        </p>
      </Section>
    </section>
  );
}
