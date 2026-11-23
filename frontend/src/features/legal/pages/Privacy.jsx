import LegalShell from "../components/LegalShell";

export default function Privacy() {
  return (
    <LegalShell
      kicker="Privacy notice"
      title="Privacy"
      summary="What Research Desk stores, why it stores it, and how to have it removed. This is a small beta project, not a certified or audited service."
    >
      <section className="legal-section" aria-labelledby="privacy-who">
        <h2 id="privacy-who">Who runs the desk</h2>
        <p>
          Research Desk is an independent beta project. Questions about this
          notice or your data can go to{" "}
          <a href="mailto:furqank219@gmail.com">furqank219@gmail.com</a>.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="privacy-collect">
        <h2 id="privacy-collect">What we collect</h2>
        <ul>
          <li>
            <strong>Account details.</strong> Your username, email address, a
            bcrypt hash of your password, whether your email is verified, a
            session version number, and account timestamps. The plain password
            is never stored.
          </li>
          <li>
            <strong>Research content.</strong> Thread titles, pin and sharing
            settings, share identifiers, questions, answers, and the source
            cards attached to each answer (title, URL, snippet, and date).
          </li>
          <li>
            <strong>Quota counts.</strong> There is no separate quota counter.
            The daily limit of 25 answered questions per UTC day is counted from
            the AI answer messages stored in your threads.
          </li>
          <li>
            <strong>Session and browser storage.</strong> A signed JWT session
            cookie, plus browser localStorage entries for recent query titles
            and a local sign-out marker. The localStorage entries stay on your
            device and can be cleared in your browser settings.
          </li>
          <li>
            <strong>Operational logs.</strong> The API host records requests
            such as IP address, path, method, status, and time. These logs are
            used to run and protect the service.
          </li>
          <li>
            <strong>Aggregate analytics.</strong> Vercel Analytics records page
            views and referrers in aggregate. It is used to see which pages are
            read, not to build advertising profiles.
          </li>
        </ul>
      </section>

      <section className="legal-section" aria-labelledby="privacy-answers">
        <h2 id="privacy-answers">How questions become answers</h2>
        <p>
          When you ask a question, the question text and the follow-up context
          needed to answer it are sent to the configured answer model. The model
          can call a web search tool, which sends a search query to Tavily and
          returns results. The answer, the numbered sources, and the original
          question are then stored in your account so the thread can be opened
          again.
        </p>
        <p>
          Do not submit sensitive personal, medical, financial, or confidential
          material. The desk is a research tool, not a private vault.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="privacy-cookies">
        <h2 id="privacy-cookies">Cookies and sessions</h2>
        <p>
          The only application cookie is <code>token</code>, an httpOnly session
          cookie containing a JWT. It keeps you signed in, is cleared when you
          sign out, and is marked Secure in production. Signing out also
          increments your session version on the server, so older tokens are
          rejected. The app sets no advertising or cross-site tracking cookies.
        </p>
        <p>
          Fonts are loaded from Google Fonts, which receives your IP address and
          request details when the page loads.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="privacy-sharing">
        <h2 id="privacy-sharing">Public sharing</h2>
        <p>
          Sharing is off by default. If you turn it on, the public page shows the
          thread title, dates, questions, answers, and sources. It does not show
          your email address, username, user ID, thread ID, or message IDs.
          Anyone with the link can read that thread. Turning sharing off stops
          the link from working, but it does not delete the thread.
        </p>
        <p>
          The demo account is shared with every visitor. Threads created there
          are visible to later visitors and are not private. Do not put personal
          information in the demo desk.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="privacy-processors">
        <h2 id="privacy-processors">Third-party processors</h2>
        <p>
          These providers process data on behalf of the desk for the purposes
          listed:
        </p>
        <ul>
          <li>
            <strong>Vercel</strong> hosts the web app and provides aggregate
            analytics.
          </li>
          <li>
            <strong>Render</strong> hosts the API and keeps operational logs.
          </li>
          <li>
            <strong>MongoDB Atlas</strong> stores accounts, threads, messages,
            and sources.
          </li>
          <li>
            <strong>Groq</strong> generates answers when a Groq API key is
            configured.
          </li>
          <li>
            <strong>Mistral</strong> generates answers when it is configured as
            the model provider.
          </li>
          <li>
            <strong>Tavily</strong> receives search queries and returns web
            results and snippets.
          </li>
          <li>
            <strong>Google Fonts</strong> serves the typefaces used by the app.
          </li>
          <li>
            <strong>Gmail</strong> sends account verification emails.
          </li>
        </ul>
        <p>
          Each provider handles data under its own privacy terms. Some requests
          may be processed outside your country.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="privacy-retention">
        <h2 id="privacy-retention">Retention</h2>
        <p>
          Account details, threads, and messages are kept while your account
          exists. A thread is removed when you delete it in the app. Share links
          stop resolving when sharing is turned off. Account verification emails
          are sent through Gmail and may remain in your mailbox.
        </p>
        <p>
          Hosting and analytics providers keep request logs and aggregate
          analytics for their own limited retention periods. Data may also
          remain in provider backups until those backups expire.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="privacy-export">
        <h2 id="privacy-export">Exporting your data</h2>
        <p>
          The account settings page can download a JSON file containing your
          account details, every thread and every message, including the source
          cards attached to each answer. The export is generated on request and
          never contains your password hash.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="privacy-deletion">
        <h2 id="privacy-deletion">Deleting your account</h2>
        <p>
          You can delete your account from the account settings page. Deletion
          removes the account record, its threads, messages, and every public
          share link. It cannot be undone. You can delete individual threads
          yourself at any time from the research rail.
        </p>
        <p>
          If you cannot sign in, email{" "}
          <a href="mailto:furqank219@gmail.com">furqank219@gmail.com</a> from the
          address on the account and ask for deletion.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="privacy-security">
        <h2 id="privacy-security">Security and changes</h2>
        <p>
          Passwords are hashed with bcrypt, sessions use an httpOnly cookie, and
          the API applies rate limits. No online service can promise perfect
          security, and this beta project does not claim any certification or
          compliance status.
        </p>
        <p>
          This notice may change as the project changes. The date at the top of
          the page shows the latest version.
        </p>
      </section>
    </LegalShell>
  );
}
