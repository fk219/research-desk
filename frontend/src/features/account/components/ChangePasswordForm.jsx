import { useEffect, useRef, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { changePassword } from "../../auth/service/auth.api";

const errorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  "The password could not be changed. Try again.";

const ChangePasswordForm = ({ isDemo, onSignedOut }) => {
  const redirectTimer = useRef(null);

  useEffect(
    () => () => {
      if (redirectTimer.current) window.clearTimeout(redirectTimer.current);
    },
    [],
  );

  const [fields, setFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const isSuccess = status.type === "success";
  const isBusy = submitting || isSuccess;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFields((previous) => ({ ...previous, [name]: value }));
    setStatus((previous) =>
      previous.type === "error" ? { type: "idle", message: "" } : previous,
    );

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

    if (!fields.currentPassword) {
      errors.currentPassword = "Enter your current password.";
    }

    if (!fields.newPassword) {
      errors.newPassword = "Enter a new password.";
    } else if (fields.newPassword.length < 8 || fields.newPassword.length > 72) {
      errors.newPassword = "Use between 8 and 72 characters.";
    }

    if (!fields.confirmPassword) {
      errors.confirmPassword = "Confirm the new password.";
    } else if (fields.confirmPassword !== fields.newPassword) {
      errors.confirmPassword = "The new passwords do not match.";
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "idle", message: "" });

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);

    try {
      const data = await changePassword({
        currentPassword: fields.currentPassword,
        newPassword: fields.newPassword,
      });

      setStatus({
        type: "success",
        message:
          data?.message ||
          "Password changed. All sessions were signed out.",
      });

      redirectTimer.current = window.setTimeout(() => onSignedOut(), 1100);
    } catch (error) {
      setStatus({ type: "error", message: errorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  if (isDemo) {
    return (
      <section
        className="settings-panel"
        aria-labelledby="settings-password-title"
      >
        <header className="settings-panel-head">
          <p className="settings-kicker">Security</p>
          <h2 className="settings-panel-title" id="settings-password-title">
            Change password
          </h2>
          <p className="settings-panel-copy">
            The shared demo account uses a private generated password, so it
            cannot be changed here. Create a personal account to manage your own
            credentials.
          </p>
        </header>
      </section>
    );
  }

  return (
    <section
      className="settings-panel"
      aria-labelledby="settings-password-title"
    >
      <header className="settings-panel-head">
        <p className="settings-kicker">Security</p>
        <h2 className="settings-panel-title" id="settings-password-title">
          Change password
        </h2>
        <p className="settings-panel-copy">
          Changing the password signs out every session, including this one.
          You will sign in again with the new password.
        </p>
      </header>

      <form
        className="settings-form"
        onSubmit={handleSubmit}
        aria-busy={submitting}
        noValidate
      >
        <div className="field">
          <label className="field-label" htmlFor="settings-current-password">
            Current password
          </label>
          <div className="field-input-wrap">
            <input
              id="settings-current-password"
              className="field-input field-input--password"
              type={showPasswords ? "text" : "password"}
              name="currentPassword"
              value={fields.currentPassword}
              onChange={handleChange}
              autoComplete="current-password"
              required
              disabled={isBusy}
              aria-invalid={Boolean(fieldErrors.currentPassword)}
              aria-describedby={
                fieldErrors.currentPassword
                  ? "settings-current-password-error"
                  : undefined
              }
            />
          </div>
          {fieldErrors.currentPassword && (
            <p
              className="field-error"
              id="settings-current-password-error"
              role="alert"
            >
              {fieldErrors.currentPassword}
            </p>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="settings-new-password">
            New password
            <span className="field-optional">8 to 72 characters</span>
          </label>
          <div className="field-input-wrap">
            <input
              id="settings-new-password"
              className="field-input field-input--password"
              type={showPasswords ? "text" : "password"}
              name="newPassword"
              value={fields.newPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              disabled={isBusy}
              aria-invalid={Boolean(fieldErrors.newPassword)}
              aria-describedby={
                fieldErrors.newPassword
                  ? "settings-new-password-error"
                  : "settings-new-password-hint"
              }
            />
          </div>
          {fieldErrors.newPassword ? (
            <p
              className="field-error"
              id="settings-new-password-error"
              role="alert"
            >
              {fieldErrors.newPassword}
            </p>
          ) : (
            <p className="field-hint" id="settings-new-password-hint">
              Pick something long and unique to this desk.
            </p>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="settings-confirm-password">
            Confirm new password
          </label>
          <div className="field-input-wrap">
            <input
              id="settings-confirm-password"
              className="field-input field-input--password"
              type={showPasswords ? "text" : "password"}
              name="confirmPassword"
              value={fields.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
              disabled={isBusy}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              aria-describedby={
                fieldErrors.confirmPassword
                  ? "settings-confirm-password-error"
                  : undefined
              }
            />
          </div>
          {fieldErrors.confirmPassword && (
            <p
              className="field-error"
              id="settings-confirm-password-error"
              role="alert"
            >
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        {status.type === "error" && (
          <div className="form-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{status.message}</span>
          </div>
        )}

        {status.type === "success" && (
          <p className="form-notice" role="status">
            {status.message}
          </p>
        )}

        <div className="settings-actions settings-actions--split">
          <button
            type="button"
            className="settings-reveal"
            onClick={() => setShowPasswords((visible) => !visible)}
            aria-pressed={showPasswords}
          >
            {showPasswords ? (
              <EyeOff size={13} aria-hidden="true" />
            ) : (
              <Eye size={13} aria-hidden="true" />
            )}
            {showPasswords ? "Hide passwords" : "Show passwords"}
          </button>

          <button
            type="submit"
            className="auth-submit settings-submit"
            disabled={isBusy}
            aria-busy={submitting}
          >
            {submitting ? (
              <>
                <span>Changing password</span>
                <span className="auth-submit-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </>
            ) : (
              <span>Change password</span>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ChangePasswordForm;
