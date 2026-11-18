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
            In chat, other visitors only see a name made up automatically from your random account
            ID (such as SwiftOtter42). Nobody can choose a name, so a real name never appears.
          </li>
          <li>
            Anyone can read the chat; you need to sign in with Google to post. Online status is
            visible only to the site owner.
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
          The site started fresh on 18 November 2026: accounts, names and scores from before then
          are not carried over.
        </p>
      </Section>
      <Section title="Stored on your device">
        <ul className="list-disc space-y-2 pl-5">
          <li>Your sign-in session (in your browser’s storage), until you sign out.</li>
          <li>Display preferences, such as the sidebar setting.</li>
          <li>Your Sudoku and 2048 games, saved automatically so you can carry on later.</li>
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
            <strong>YouTube</strong>: videos play on this site in YouTube’s player, using its
            privacy-enhanced mode. The player loads only when you press Play on a video, or
            automatically on the Watch page while B24DUL is live. The player itself is run by
            YouTube, so YouTube receives your IP address and the video you watch. “Open on YouTube”
            and Subscribe take you to YouTube’s own site.
          </li>
          <li>
            <strong>Firebase</strong> (Google) provides sign-in. The chat is stored in its database
            in Google’s European (Belgium) data centre.
          </li>
        </ul>
      </Section>
      <Section title="Chat">
        <p>
          Anyone can read the chat without signing in. To post, you sign in with Google. Your chat
          name is made up from your random account ID each time it is shown; it is not stored, and
          you cannot choose it. The chat stores:
        </p>
        <ul className="list-disc space-y-2 pl-5">
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
          does not reveal who you are. The database has no place for names, emails or photos: a
          message can only hold the account ID, the text and the time.
        </p>
        <p>
          The chat blocks swearing, links, email addresses, phone numbers and questions asking for
          personal details. Please don’t share them in any form.
        </p>
      </Section>
      <Section title="Leaderboards">
        <p>
          When you are signed in with Google, your best 2048 score and your fastest hint-free Sudoku
          time for each level are saved. Each entry holds only your random account ID, the score or
          time, and when it was saved. Anyone can see the top entries, shown under the same made-up
          name as in chat. Only you and the site owner can look up your own entry.
        </p>
        <p>
          To help keep the boards fair, a score can carry a private note for the site owner if the
          browser window looked like developer tools were open during that game. Only the site owner
          can see it; it is a hint to review, not an accusation, and it never stops a score being
          saved. The site owner can remove any score.
        </p>
      </Section>
      <Section title="Features still to come">
        <p>
          Visitor statistics are not on the new site yet. Before they go live, this notice will be
          updated to say exactly what they store and who can see them.
        </p>
      </Section>
      <Section title="Your choices">
        <p>
          You can sign out at any time on the{' '}
          <Link className="font-semibold underline underline-offset-4" to="/profile">
            Account page
          </Link>
          . To ask for your data to be deleted, use the privacy request on the same page; it
          includes your account ID.
        </p>
        <p>
          The site owner keeps a log of deletion requests containing only the account ID, the
          request’s status and dates. Completing a request erases your chat messages, online
          entries, slow-mode stamp, leaderboard entries and any timeout or ban, and the site owner
          deletes your sign-in account from Firebase Authentication.
        </p>
      </Section>
    </section>
  );
}
