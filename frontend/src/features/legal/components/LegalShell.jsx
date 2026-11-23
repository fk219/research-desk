import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Brand from "../../../components/Brand";
import LegalLinks from "../../../components/LegalLinks";

const LegalShell = ({ kicker, title, summary, children }) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} · Research Desk`;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <div className="share-page legal-page">
      <header className="topbar public-topbar">
        <div className="topbar-left">
          <Link to="/" className="brand-button" aria-label="Research Desk home">
            <Brand />
          </Link>
          <span className="topbar-date">Legal</span>
        </div>

        <div className="topbar-actions">
          <Link className="share-top-link" to="/login">
            Open the desk
            <ArrowUpRight size={12} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="share-main legal-main">
        <div className="desk-scroll">
          <div className="reader legal-reader">
            <article className="legal-doc" aria-labelledby="legal-title">
              <p className="eyebrow">
                <span className="eyebrow-mark" aria-hidden="true">
                  §
                </span>
                {kicker}
              </p>

              <h1 className="legal-title" id="legal-title">
                {title}
              </h1>

              <p className="legal-summary">{summary}</p>
              <p className="legal-updated">Last updated 24 November 2026</p>

              <div className="legal-body">{children}</div>

              <footer className="memo-end">
                <span className="memo-end-mark" aria-hidden="true">
                  *
                </span>
                <span>End of notice</span>
                <span className="memo-end-rule" aria-hidden="true" />
                <span>Research Desk</span>
              </footer>
            </article>

            <footer className="site-foot">
              <span className="site-foot-brand">Research Desk</span>
              <LegalLinks />
              <span className="site-foot-note">
                A small, independent beta desk.
              </span>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LegalShell;
