import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Brand from "../../../components/Brand";
import LegalLinks from "../../../components/LegalLinks";

const SettingsShell = ({ children }) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Account settings · Research Desk";

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="desk settings-page">
      <a className="skip-link" href="#settings-main">
        Skip to account settings
      </a>

      <header className="topbar">
        <div className="topbar-left">
          <Link to="/" className="brand-button" aria-label="Research Desk home">
            <Brand />
          </Link>
          <span className="topbar-date">Account</span>
        </div>

        <div className="topbar-actions">
          <Link
            to="/"
            className="settings-back"
            aria-label="Back to desk"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            <span>Back to desk</span>
          </Link>
        </div>
      </header>

      <main className="desk-main" id="settings-main" tabIndex={-1}>
        <div className="desk-scroll">
          <div className="reader settings-reader">
            {children}

            <footer className="site-foot settings-foot">
              <span className="site-foot-brand">Research Desk</span>
              <LegalLinks />
              <span className="site-foot-note">Account file</span>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsShell;
