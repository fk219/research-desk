import LegalShell from "../components/LegalShell";

export default function Terms() {
  return (
    <LegalShell
      kicker="Terms of use"
      title="Terms"
      summary="The short rules for using Research Desk. The service is a beta, answers can be wrong, and you stay responsible for how you use them."
    >
      <section className="legal-section" aria-labelledby="terms-beta">
        <h2 id="terms-beta">A beta service</h2>
        <p>
          Research Desk is a free, independent beta project. Features may change,
          break, or be removed without notice. The service may be paused or
          stopped entirely. Keep your own copy of anything you need to keep.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="terms-use">
        <h2 id="terms-use">Acceptable use</h2>
        <p>Use the desk lawfully and considerately. Do not:</p>
        <ul>
          <li>submit illegal, harmful, or abusive material;</li>
          <li>attempt to access another account, bypass authentication, or probe the service for vulnerabilities;</li>
          <li>bypass the daily quota, rate limits, or other technical controls;</li>
          <li>run automated bulk queries, scrape the service, or resell access;</li>
          <li>interfere with the service or put unreasonable load on it.</li>
        </ul>
        <p>
          You are responsible for the questions you submit and for how you use
          the answers.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="terms-quota">
        <h2 id="terms-quota">Quota and fair use</h2>
        <p>
          Each account can have 25 questions answered per UTC day. The limit is
          counted from stored AI answer messages. Requests are also rate limited
          per IP address. Limits exist to keep the free desk available to
          everyone and may change. The demo account is shared, so it uses the
          same quota as every other visitor.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="terms-warranty">
        <h2 id="terms-warranty">No warranty</h2>
        <p>
          The service is provided as is and without warranties of any kind.
          Answers may be inaccurate, incomplete, out of date, or based on sources
          that are wrong. Verify important claims against the cited sources
          before relying on them. Nothing here is legal, medical, financial, or
          other professional advice.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="terms-content">
        <h2 id="terms-content">Content ownership</h2>
        <p>
          You keep ownership of the questions you write and the answers you
          receive. You grant the desk permission to store, process, and display
          that content so it can provide the service, including showing a thread
          on its public page when you choose to share it. You can turn sharing
          off at any time.
        </p>
        <p>
          The Research Desk name and interface are part of this project. The
          source code is released under the MIT license in the repository. Web
          sources and snippets belong to their publishers and remain subject to
          their terms. Do not copy or republish material you do not have the
          right to use.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="terms-termination">
        <h2 id="terms-termination">Termination</h2>
        <p>
          Access may be suspended or removed if these terms are broken, if the
          service is abused, or for security, legal, or operational reasons.
          Accounts may also be removed when the beta ends. You can stop using the
          desk at any time, delete your threads from the research rail, or ask
          for account deletion as described in the privacy notice.
        </p>
      </section>

      <section className="legal-section" aria-labelledby="terms-changes">
        <h2 id="terms-changes">Changes and contact</h2>
        <p>
          These terms may change as the project changes. The date at the top of
          the page shows the latest version. Continued use after a change means
          you accept the updated terms.
        </p>
        <p>
          Questions can go to{" "}
          <a href="mailto:furqank219@gmail.com">furqank219@gmail.com</a>.
        </p>
      </section>
    </LegalShell>
  );
}
