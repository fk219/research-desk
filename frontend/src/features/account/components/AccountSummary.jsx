import { Link } from "react-router-dom";

const initialsFor = (name) => {
  const initials = String(name || "Researcher")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "R";
};

const formatJoinedDate = (value) => {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const AccountSummary = ({ user, threadCount, threadStatus }) => {
  const username = user?.username || "Researcher";
  const email = user?.email || "Not recorded";

  const threadCopy =
    threadStatus === "loading"
      ? "Counting threads"
      : threadStatus === "error"
        ? "Unavailable right now"
        : `${threadCount} ${threadCount === 1 ? "thread" : "threads"}`;

  return (
    <section
      className="settings-panel settings-summary"
      aria-labelledby="settings-summary-title"
    >
      <header className="settings-summary-head">
        <span className="avatar settings-avatar" aria-hidden="true">
          {initialsFor(username)}
        </span>
        <div>
          <p className="settings-kicker">Account record</p>
          <h2 className="settings-panel-title" id="settings-summary-title">
            Your account
          </h2>
        </div>
      </header>

      <dl className="settings-facts">
        <div className="settings-fact">
          <dt>Username</dt>
          <dd>
            {username}
            {user?.isDemo && <span className="account-demo">demo</span>}
          </dd>
        </div>

        <div className="settings-fact">
          <dt>Email</dt>
          <dd className="settings-fact-break">{email}</dd>
        </div>

        <div className="settings-fact">
          <dt>Email status</dt>
          <dd>
            <span
              className="settings-state"
              data-state={user?.verified ? "verified" : "pending"}
            >
              {user?.verified ? "Verified" : "Not verified"}
            </span>
          </dd>
        </div>

        <div className="settings-fact">
          <dt>Joined</dt>
          <dd>{formatJoinedDate(user?.joinedAt)}</dd>
        </div>

        <div className="settings-fact">
          <dt>Threads</dt>
          <dd aria-live="polite">{threadCopy}</dd>
        </div>
      </dl>

      <p className="settings-policy">
        Read the <Link to="/privacy">Privacy notice</Link> and the{" "}
        <Link to="/terms">Terms of use</Link>.
      </p>
    </section>
  );
};

export default AccountSummary;
