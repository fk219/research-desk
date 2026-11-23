import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Download } from "lucide-react";
import AccountSummary from "../components/AccountSummary";
import ChangePasswordForm from "../components/ChangePasswordForm";
import DeleteAccountForm from "../components/DeleteAccountForm";
import SettingsShell from "../components/SettingsShell";
import { useAuth } from "../../auth/hook/useAuth";
import { exportAccount } from "../../auth/service/auth.api";
import { getChats } from "../../chat/service/chat.api";
import {
  setChats,
  setCurrentChatId,
  setError,
  setQuotaError,
} from "../../chat/chat.slice";

const exportError = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  "The export could not be prepared. Try again.";

const Settings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { handleLocalSignOut } = useAuth();

  const user = useSelector((state) => state.auth.user);

  const [threadCount, setThreadCount] = useState(0);
  const [threadStatus, setThreadStatus] = useState("loading");
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState({
    type: "idle",
    message: "",
  });

  useEffect(() => {
    let active = true;

    getChats()
      .then((data) => {
        if (!active) return;
        setThreadCount(Array.isArray(data?.chats) ? data.chats.length : 0);
        setThreadStatus("ready");
      })
      .catch(() => {
        if (active) setThreadStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  const finishSession = (state) => {
    dispatch(setChats({}));
    dispatch(setCurrentChatId(null));
    dispatch(setError(null));
    dispatch(setQuotaError(null));
    handleLocalSignOut();
    navigate("/login", { replace: true, state });
  };

  const handleExport = async () => {
    setExporting(true);
    setExportStatus({ type: "idle", message: "" });

    try {
      const blob = await exportAccount();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `research-desk-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);

      setExportStatus({
        type: "success",
        message:
          "Export downloaded. The file contains your account, threads and messages with their sources.",
      });
    } catch (error) {
      setExportStatus({ type: "error", message: exportError(error) });
    } finally {
      setExporting(false);
    }
  };

  return (
    <SettingsShell>
      <article className="settings-doc" aria-labelledby="settings-title">
        <p className="eyebrow">
          <span className="eyebrow-mark" aria-hidden="true">
            §
          </span>
          Account file
        </p>

        <h1 className="settings-title" id="settings-title">
          Account settings
        </h1>

        <p className="settings-lede">
          Manage the record attached to your research desk. Your threads stay
          yours, and every action here affects only the signed-in account.
        </p>

        <div className="settings-stack">
          <AccountSummary
            user={user}
            threadCount={threadCount}
            threadStatus={threadStatus}
          />

          <ChangePasswordForm
            isDemo={Boolean(user?.isDemo)}
            onSignedOut={() => finishSession({ passwordChanged: true })}
          />

          <section
            className="settings-panel"
            aria-labelledby="settings-export-title"
          >
            <header className="settings-panel-head">
              <p className="settings-kicker">Your data</p>
              <h2 className="settings-panel-title" id="settings-export-title">
                Export account data
              </h2>
              <p className="settings-panel-copy">
                Download a JSON file with your account, every thread and every
                message, including the sources attached to each answer. The file
                never contains your password hash.
              </p>
            </header>

            <div className="settings-actions">
              <button
                type="button"
                className="settings-action-btn"
                onClick={handleExport}
                disabled={exporting}
                aria-busy={exporting}
              >
                <Download size={14} aria-hidden="true" />
                <span>
                  {exporting ? "Preparing export" : "Download JSON export"}
                </span>
              </button>
            </div>

            {exportStatus.type === "error" && (
              <div className="form-error settings-form-status" role="alert">
                <AlertCircle size={14} aria-hidden="true" />
                <span>{exportStatus.message}</span>
              </div>
            )}

            {exportStatus.type === "success" && (
              <p className="form-notice settings-form-status" role="status">
                {exportStatus.message}
              </p>
            )}
          </section>

          <DeleteAccountForm
            isDemo={Boolean(user?.isDemo)}
            onDeleted={() => finishSession({ accountDeleted: true })}
          />
        </div>

        <footer className="memo-end">
          <span className="memo-end-mark" aria-hidden="true">
            *
          </span>
          <span>End of account file</span>
          <span className="memo-end-rule" aria-hidden="true" />
          <span>Research Desk</span>
        </footer>
      </article>
    </SettingsShell>
  );
};

export default Settings;
