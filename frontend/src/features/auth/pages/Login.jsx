import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AlertCircle, ArrowRight, BookOpen, Eye, EyeOff } from "lucide-react";
import AuthShell, { AuthBoot } from "../components/AuthShell";
import { useAuth } from "../hook/useAuth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleLogin, handleDemo } = useAuth();

  const user = useSelector((state) => state.auth.user);
  const loading = useSelector((state) => state.auth.loading);

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loginData, setLoginData] = useState(() => ({
    email: location.state?.email || "",
    password: "",
  }));

  const notice = location.state?.registered;
  const signedOut = location.state?.signedOut;
  const passwordChanged = location.state?.passwordChanged;
  const accountDeleted = location.state?.accountDeleted;

  if (user) {
    return <Navigate to="/" replace />;
  }

  if (loading && !submitting && !demoLoading) {
    return <AuthBoot label="Checking your session" />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setLoginData((previous) => ({ ...previous, [name]: value }));
    setFormError("");

    if (fieldErrors[name]) {
      setFieldErrors((previous) => {
        const next = { ...previous };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const errors = {};

    if (!loginData.email.trim()) {
      errors.email = "Enter your email address.";
    } else if (!EMAIL_PATTERN.test(loginData.email.trim())) {
      errors.email = "That email address doesn't look right.";
    }

    if (!loginData.password) {
      errors.password = "Enter your password.";
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const result = await handleLogin({
      email: loginData.email.trim(),
      password: loginData.password,
    });
    setSubmitting(false);

    if (result.ok) {
      navigate("/", { replace: true });
      return;
    }

    setFormError(result.message || "Sign in failed. Try again.");
  };

  const handleDemoOpen = async () => {
    setFormError("");
    setDemoLoading(true);
    const result = await handleDemo();
    setDemoLoading(false);

    if (result.ok) {
      navigate("/", { replace: true });
      return;
    }

    setFormError(result.message || "The demo desk could not be opened.");
  };

  return (
    <AuthShell
      kicker="Return to the desk"
      title="Welcome back."
      description="Sign in to reopen your threads, answers, and reading history. Or step straight into the shared demo desk."
      footer={
        <>
          New to the desk?{" "}
          <Link to="/register">Create an account</Link>
        </>
      }
    >
      <div className="demo-open-wrap">
        <button
          type="button"
          className="demo-open"
          onClick={handleDemoOpen}
          disabled={demoLoading || submitting}
          aria-busy={demoLoading}
        >
          <span className="demo-open-icon" aria-hidden="true">
            <BookOpen size={17} />
          </span>
          <span className="demo-open-copy">
            <span className="demo-open-title">
              {demoLoading ? "Opening the demo desk" : "Open the demo desk"}
            </span>
            <span className="demo-open-sub">
              No verification · sample threads and sources included
            </span>
          </span>
          <ArrowRight className="demo-open-arrow" size={15} aria-hidden="true" />
        </button>
      </div>

      <p className="auth-divider">
        <span>or sign in with email</span>
      </p>

      <form
        className="auth-form"
        onSubmit={handleSubmit}
        aria-busy={submitting}
        noValidate
      >
        {signedOut && !passwordChanged && !accountDeleted && (
          <p className="form-notice" role="status">
            You’ve been signed out. The session was revoked on the server.
          </p>
        )}

        {passwordChanged && (
          <p className="form-notice" role="status">
            Password changed. Every session was signed out. Sign in again with
            your new password.
          </p>
        )}

        {accountDeleted && (
          <p className="form-notice" role="status">
            Account deleted. Your threads, messages and public share links were
            removed.
          </p>
        )}

        {notice && (
          <p className="form-notice" role="status">
            Account created. Verify your email, then sign in.
          </p>
        )}

        {formError && (
          <div className="form-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        <div className="field">
          <label className="field-label" htmlFor="login-email">
            Email
          </label>
          <div className="field-input-wrap">
            <input
              id="login-email"
              className="field-input"
              type="email"
              name="email"
              value={loginData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              autoComplete="email"
              required
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={
                fieldErrors.email ? "login-email-error" : undefined
              }
            />
          </div>
          {fieldErrors.email && (
            <p className="field-error" id="login-email-error" role="alert">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="login-password">
            Password
          </label>
          <div className="field-input-wrap">
            <input
              id="login-password"
              className="field-input field-input--password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={loginData.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? "login-password-error" : undefined
              }
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff size={14} aria-hidden="true" />
              ) : (
                <Eye size={14} aria-hidden="true" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="field-error" id="login-password-error" role="alert">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="auth-submit"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? (
            <>
              <span>Signing in</span>
              <span className="auth-submit-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight size={14} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
