import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../hook/useAuth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { handleRegister } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setRegisterData((previous) => ({ ...previous, [name]: value }));
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

    if (!registerData.username.trim()) {
      errors.username = "Choose a username.";
    }

    if (!registerData.email.trim()) {
      errors.email = "Enter your email address.";
    } else if (!EMAIL_PATTERN.test(registerData.email.trim())) {
      errors.email = "That email address doesn't look right.";
    }

    if (!registerData.password) {
      errors.password = "Choose a password.";
    } else if (registerData.password.length < 6) {
      errors.password = "Use at least 6 characters.";
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
    const result = await handleRegister({
      username: registerData.username.trim(),
      email: registerData.email.trim(),
      password: registerData.password,
    });
    setSubmitting(false);

    if (result.ok) {
      navigate("/login", {
        replace: true,
        state: {
          registered: true,
          email: registerData.email.trim(),
        },
      });
      return;
    }

    setFormError(result.message || "Registration failed. Try again.");
  };

  return (
    <AuthShell
      kicker="Open a desk"
      title="Create your research desk."
      description="A place for your questions, answers, and the threads you intend to keep."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form
        className="auth-form"
        onSubmit={handleSubmit}
        aria-busy={submitting}
        noValidate
      >
        {formError && (
          <div className="form-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        <div className="field">
          <label className="field-label" htmlFor="register-username">
            Username
          </label>
          <div className="field-input-wrap">
            <input
              id="register-username"
              className="field-input"
              type="text"
              name="username"
              value={registerData.username}
              onChange={handleChange}
              placeholder="Your name on the desk"
              autoComplete="username"
              required
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={
                fieldErrors.username ? "register-username-error" : undefined
              }
            />
          </div>
          {fieldErrors.username && (
            <p
              className="field-error"
              id="register-username-error"
              role="alert"
            >
              {fieldErrors.username}
            </p>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="register-email">
            Email
          </label>
          <div className="field-input-wrap">
            <input
              id="register-email"
              className="field-input"
              type="email"
              name="email"
              value={registerData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              autoComplete="email"
              required
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={
                fieldErrors.email ? "register-email-error" : undefined
              }
            />
          </div>
          {fieldErrors.email && (
            <p className="field-error" id="register-email-error" role="alert">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="register-password">
            Password
          </label>
          <div className="field-input-wrap">
            <input
              id="register-password"
              className="field-input field-input--password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={registerData.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              required
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password
                  ? "register-password-error"
                  : "register-password-hint"
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
          {fieldErrors.password ? (
            <p
              className="field-error"
              id="register-password-error"
              role="alert"
            >
              {fieldErrors.password}
            </p>
          ) : (
            <p className="field-hint" id="register-password-hint">
              Use at least 6 characters.
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
              <span>Creating account</span>
              <span className="auth-submit-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </>
          ) : (
            <>
              <span>Create account</span>
              <ArrowRight size={14} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
