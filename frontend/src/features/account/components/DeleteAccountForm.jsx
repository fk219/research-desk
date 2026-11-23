import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { deleteAccount } from "../../auth/service/auth.api";

const errorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  "The account could not be deleted. Try again.";

const DeleteAccountForm = ({ isDemo, onDeleted }) => {
  const redirectTimer = useRef(null);

  useEffect(
    () => () => {
      if (redirectTimer.current) window.clearTimeout(redirectTimer.current);
    },
    [],
  );

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const isSuccess = status.type === "success";
  const isBusy = submitting || isSuccess;

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
    setStatus((previous) =>
      previous.type === "error" ? { type: "idle", message: "" } : previous,
    );

    if (fieldErrors.password) {
      setFieldErrors((previous) => {
        const next = { ...previous };
        delete next.password;
        return next;
      });
    }
  };

  const handleConfirmationChange = (event) => {
    setConfirmation(event.target.value);
    setStatus((previous) =>
      previous.type === "error" ? { type: "idle", message: "" } : previous,
    );

    if (fieldErrors.confirmation) {
      setFieldErrors((previous) => {
        const next = { ...previous };
        delete next.confirmation;
        return next;
      });
    }
  };

  const validate = () => {
    const errors = {};

    if (!password) {
      errors.password = "Enter your password.";
    }

    if (confirmation !== "DELETE") {
      errors.confirmation = "Type DELETE in capitals to confirm.";
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
      await deleteAccount({ password });
      setStatus({
        type: "success",
        message:
          "Account deleted. Your threads, messages and public share links were removed.",
      });

      redirectTimer.current = window.setTimeout(() => onDeleted(), 1100);
    } catch (error) {
      setStatus({ type: "error", message: errorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="settings-panel settings-panel--danger"
      aria-labelledby="settings-danger-title"
    >
      <header className="settings-panel-head">
        <p className="settings-kicker">Danger zone</p>
        <h2 className="settings-panel-title" id="settings-danger-title">
          Delete account
        </h2>
        <p className="settings-panel-copy">
          This permanently removes every thread, every message and every public
          share link on the account. It cannot be undone.
        </p>
      </header>

      {isDemo ? (
        <p className="settings-demo-note">
          The shared demo account cannot be deleted, because every visitor uses
          it. Return to the desk if you are finished reading.
        </p>
      ) : (
        <form
          className="settings-form"
          onSubmit={handleSubmit}
          aria-busy={submitting}
          noValidate
        >
          <div className="field">
            <label className="field-label" htmlFor="settings-delete-password">
              Password
            </label>
            <div className="field-input-wrap">
              <input
                id="settings-delete-password"
                className="field-input"
                type="password"
                name="password"
                value={password}
                onChange={handlePasswordChange}
                autoComplete="current-password"
                required
                disabled={isBusy}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password
                    ? "settings-delete-password-error"
                    : undefined
                }
              />
            </div>
            {fieldErrors.password && (
              <p
                className="field-error"
                id="settings-delete-password-error"
                role="alert"
              >
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="field">
            <label
              className="field-label"
              htmlFor="settings-delete-confirmation"
            >
              Type DELETE to confirm
              <span className="field-optional">Exact word, capitals</span>
            </label>
            <div className="field-input-wrap">
              <input
                id="settings-delete-confirmation"
                className="field-input field-input--mono"
                type="text"
                name="confirmation"
                value={confirmation}
                onChange={handleConfirmationChange}
                autoComplete="off"
                spellCheck="false"
                required
                disabled={isBusy}
                aria-invalid={Boolean(fieldErrors.confirmation)}
                aria-describedby={
                  fieldErrors.confirmation
                    ? "settings-delete-confirmation-error"
                    : "settings-delete-confirmation-hint"
                }
              />
            </div>
            {fieldErrors.confirmation ? (
              <p
                className="field-error"
                id="settings-delete-confirmation-error"
                role="alert"
              >
                {fieldErrors.confirmation}
              </p>
            ) : (
              <p className="field-hint" id="settings-delete-confirmation-hint">
                The exact word is checked before anything is deleted.
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

          <div className="settings-actions">
            <button
              type="submit"
              className="settings-danger"
              disabled={isBusy}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <span>Deleting account</span>
                  <span className="auth-submit-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </>
              ) : (
                <span>Delete account permanently</span>
              )}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

export default DeleteAccountForm;
