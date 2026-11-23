import { Link } from "react-router-dom";
import Brand from "../../../components/Brand";

const AuthShell = ({ kicker, title, description, children, footer }) => (
  <div className="auth-page">
    <main className="auth-frame">
      <div className="auth-brand-row">
        <Link
          to="/"
          className="auth-brand-link"
          aria-label="Perplexity research desk"
        >
          <Brand />
        </Link>
        <span className="auth-edition">Reading room</span>
      </div>

      <section className="auth-card" aria-labelledby="auth-title">
        <p className="auth-kicker">{kicker}</p>
        <h1 className="auth-title" id="auth-title">
          {title}
        </h1>
        <p className="auth-desc">{description}</p>
        {children}
      </section>

      {footer && <p className="auth-foot">{footer}</p>}

      <p className="auth-note">
        Your threads and reading history stay with your account.
      </p>
    </main>
  </div>
);

export const AuthBoot = ({ label = "Checking your session" }) => (
  <div className="boot" role="status" aria-live="polite">
    <Brand />
    <div className="boot-rule" aria-hidden="true" />
    <p className="boot-meta">{label}</p>
  </div>
);

export default AuthShell;
