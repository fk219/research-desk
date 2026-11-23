import { Link } from "react-router-dom";

const LegalLinks = ({ className = "" }) => (
  <nav
    className={`legal-links ${className}`.trim()}
    aria-label="Legal"
  >
    <Link to="/privacy">Privacy</Link>
    <span className="legal-links-dot" aria-hidden="true">
      ·
    </span>
    <Link to="/terms">Terms</Link>
  </nav>
);

export default LegalLinks;
