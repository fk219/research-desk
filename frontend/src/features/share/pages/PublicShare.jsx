import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, Lock } from "lucide-react";
import Brand from "../../../components/Brand";
import { getPublicChat } from "../../chat/service/chat.api";
import ThreadBody from "../../chat/components/ThreadBody";
import { formatMemoDate } from "../../chat/utils/threadGroups";

const PublicTopbar = () => (
  <header className="topbar public-topbar">
    <div className="topbar-left">
      <Link
        to="/login"
        className="brand-button"
        aria-label="Perplexity research desk"
      >
        <Brand />
      </Link>
      <span className="topbar-date">Shared report</span>
    </div>

    <div className="topbar-actions">
      <span className="share-readonly">
        <Lock size={10} aria-hidden="true" />
        Read only
      </span>
      <Link className="share-top-link" to="/login">
        Research your own question
        <ArrowUpRight size={12} aria-hidden="true" />
      </Link>
    </div>
  </header>
);

const ShareCta = () => (
  <section className="share-cta-card" aria-labelledby="share-cta-title">
    <p className="eyebrow">
      <span className="eyebrow-rule" aria-hidden="true" />
      Your own desk
    </p>
    <h2 className="share-cta-title" id="share-cta-title">
      Research your own question.
    </h2>
    <p className="share-cta-copy">
      Every answer keeps the question that produced it, the numbered sources
      behind it, and a thread you can return to. The demo desk needs no email
      verification.
    </p>
    <Link className="share-cta-btn" to="/login">
      Open the research desk
      <ArrowUpRight size={14} aria-hidden="true" />
    </Link>
  </section>
);

const PublicShare = () => {
  const { shareId } = useParams();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getPublicChat(shareId);
        if (active) setThread(data?.thread || null);
      } catch (err) {
        if (active) {
          setError(
            err?.response?.data?.message ||
              "This shared report could not be opened.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [shareId]);

  const messages = useMemo(() => thread?.messages || [], [thread?.messages]);

  useEffect(() => {
    if (!thread?.title) return undefined;

    const previousTitle = document.title;
    document.title = `${thread.title} · Shared research`;

    return () => {
      document.title = previousTitle;
    };
  }, [thread?.title]);

  const firstUserMessage = messages.find((message) => message.role === "user");
  const headline = firstUserMessage?.content || thread?.title || "Shared report";
  const answerCount = messages.filter((message) => message.role === "ai").length;
  const threadDate = firstUserMessage?.createdAt || thread?.updatedAt;

  if (loading) {
    return (
      <div className="share-page">
        <PublicTopbar />
        <main className="share-main">
          <div className="share-loading" role="status" aria-live="polite">
            <span className="desk-pulse" aria-hidden="true" />
            <p>Opening the shared research note.</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="share-page">
        <PublicTopbar />
        <main className="share-main">
          <section className="share-error" aria-labelledby="share-error-title">
            <p className="eyebrow">
              <span className="eyebrow-mark" aria-hidden="true">
                §
              </span>
              Shared report
            </p>
            <h1 className="share-error-title" id="share-error-title">
              This note is not public.
            </h1>
            <p className="share-error-copy">
              {error ||
                "The link may have been turned off, or the report never existed. Ask the author for a fresh link."}
            </p>
            <Link className="share-cta-btn" to="/login">
              Open the research desk
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="share-page">
      <PublicTopbar />

      <main className="share-main">
        <div className="desk-scroll">
          <div className="reader">
            <article className="memo" aria-labelledby="shared-memo-title">
              <header className="memo-head">
                <p className="eyebrow">
                  <span className="eyebrow-mark" aria-hidden="true">
                    §
                  </span>
                  Shared research memo
                </p>

                <h1 className="memo-title" id="shared-memo-title">
                  {headline}
                </h1>

                <div className="memo-meta">
                  <span>{formatMemoDate(threadDate)}</span>
                  <span className="meta-divider" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    {answerCount} {answerCount === 1 ? "answer" : "answers"}
                  </span>
                  <span className="meta-divider" aria-hidden="true">
                    ·
                  </span>
                  <span className="memo-live">Read-only copy</span>
                </div>
              </header>

              <div className="memo-body">
                {messages.length > 0 ? (
                  <ThreadBody messages={messages} />
                ) : (
                  <p className="share-empty">
                    This report has no passages yet.
                  </p>
                )}
              </div>

              <footer className="memo-end">
                <span className="memo-end-mark" aria-hidden="true">
                  *
                </span>
                <span>End of shared note</span>
                <span className="memo-end-rule" aria-hidden="true" />
                <span>Public link</span>
              </footer>
            </article>

            <ShareCta />
          </div>
        </div>
      </main>
    </div>
  );
};

export default PublicShare;
