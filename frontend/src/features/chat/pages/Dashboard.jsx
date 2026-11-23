import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Check,
  Download,
  Link2,
  LogOut,
  Menu,
  Share2,
} from "lucide-react";
import Brand from "../../../components/Brand";
import { useAuth } from "../../auth/hook/useAuth";
import useChat from "../hook/useChat";
import {
  setChats,
  setCurrentChatId,
  setError,
  setQuotaError,
} from "../chat.slice";
import { AnswerSkeleton } from "../components/AnswerBlock";
import Composer from "../components/Composer";
import ResearchRail from "../components/ResearchRail";
import ThreadBody from "../components/ThreadBody";
import {
  makeThreadTitle,
  readRecentThreads,
  rememberThread,
} from "../utils/recentThreads";
import { formatDeskDate, formatMemoDate } from "../utils/threadGroups";
import { copyToClipboard } from "../utils/clipboard";
import { downloadThreadMarkdown } from "../utils/threadMarkdown";

const SUGGESTIONS = [
  {
    title: "How AI is changing research",
    query:
      "What are the most important breakthroughs in AI research right now, and what do they change for everyday work?",
  },
  {
    title: "Write a debounce hook",
    query:
      "Write a performant debounce hook in React with TypeScript, and explain the edge cases.",
  },
  {
    title: "Quantum computing, plainly",
    query:
      "Explain quantum computing and superposition with simple, real-world analogies.",
  },
];

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

const ErrorNotice = ({ message, onDismiss, inline = false }) => (
  <div
    className={`error-notice${inline ? " error-notice--inline" : ""}`}
    role="alert"
  >
    <AlertCircle className="error-icon" size={16} aria-hidden="true" />
    <div className="error-copy">
      <p className="error-title">That request didn't come back.</p>
      <p className="error-text">
        {String(message || "Check your connection and try again.")}
      </p>
    </div>
    <button
      type="button"
      className="error-dismiss"
      onClick={onDismiss}
      aria-label="Dismiss error"
    >
      Dismiss
    </button>
  </div>
);

const ThreadPending = () => (
  <section className="thread-pending" aria-busy="true">
    <span className="sr-only" role="status">
      Opening the research note.
    </span>
    <p className="eyebrow">
      <span className="eyebrow-mark" aria-hidden="true">
        §
      </span>
      Opening note
    </p>
    <div className="pending-title shimmer" aria-hidden="true" />
    <div className="pending-meta shimmer" aria-hidden="true" />
    <div className="skeleton-lines" aria-hidden="true">
      <span className="pending-line shimmer" />
      <span className="pending-line shimmer" />
      <span className="pending-line shimmer" />
      <span className="pending-line shimmer" />
    </div>
  </section>
);

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const composerRef = useRef(null);
  const mainRef = useRef(null);
  const shareTimerRef = useRef(null);

  const {
    handleSendMessage,
    handleGetChats,
    handleOpenChats,
    handleRenameChat,
    handleTogglePin,
    handleShareChat,
  } = useChat();
  const { handleLogout } = useAuth();

  const [isRailOpen, setIsRailOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [recentThreads, setRecentThreads] = useState(readRecentThreads);
  const [shareStatus, setShareStatus] = useState("idle");
  const [shareError, setShareError] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  const user = useSelector((state) => state.auth.user);
  const chats = useSelector((state) => state.chat.chats);
  const currentChatId = useSelector((state) => state.chat.currentChatId);
  const loading = useSelector((state) => state.chat.loading);
  const error = useSelector((state) => state.chat.error);
  const quotaError = useSelector((state) => state.chat.quotaError);

  const activeChat = currentChatId ? chats?.[currentChatId] : null;
  const messages = useMemo(() => activeChat?.messages || [], [activeChat?.messages]);

  const firstUserIndex = messages.findIndex((message) => message.role === "user");
  const firstUserMessage = messages[firstUserIndex];
  const headline = firstUserMessage?.content || activeChat?.title || "New research";
  const answerCount = messages.filter((message) => message.role === "ai").length;
  const threadDate =
    firstUserMessage?.createdAt || activeChat?.updatedAt || null;

  const hasThread = Boolean(currentChatId) && currentChatId !== "temp";
  const hasStreamingAnswer = messages.some(
    (message) => message.role === "ai" && message.streaming,
  );
  const lastMessage = messages[messages.length - 1];
  const awaitingAnswer = isSending && lastMessage?.role === "user";
  const showThreadLoading = loading && hasThread && messages.length === 0;
  const showEmptyThread = !loading && hasThread && messages.length === 0;

  const isShared = Boolean(activeChat?.shared && activeChat?.shareId);
  const publicShareUrl = activeChat?.shareId
    ? `${window.location.origin}/share/${activeChat.shareId}`
    : "";
  const shareLabel =
    shareStatus === "copied"
      ? "Link copied"
      : shareStatus === "working"
        ? "Sharing"
        : isShared
          ? "Copy link"
          : "Share";

  const accountName = user?.isDemo
    ? "Demo Researcher"
    : user?.username || user?.email || "Researcher";
  const accountEmail =
    user?.email && user.email !== accountName ? user.email : "";

  useEffect(() => {
    handleGetChats();
  }, [handleGetChats]);

  useEffect(() => {
    if (messages.length === 0 && !isSending) return;
    const node = mainRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, loading, isSending]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsRailOpen(false);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(
    () => () => {
      if (shareTimerRef.current) window.clearTimeout(shareTimerRef.current);
    },
    [],
  );

  // Keep a device-side index of the queries in the rail. Server history remains
  // the source of truth for messages; this only survives reloads.
  const firstUserContent = firstUserMessage?.content || "";
  const activeTitle = activeChat?.title || "";
  useEffect(() => {
    if (!hasThread || !firstUserContent) return;

    setRecentThreads(
      rememberThread({
        id: currentChatId,
        query: firstUserContent,
        title: activeTitle || makeThreadTitle(firstUserContent),
        at: Date.now(),
      }),
    );
  }, [currentChatId, hasThread, firstUserContent, activeTitle]);

  const focusComposer = () => {
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  const scrollToTop = () => {
    window.requestAnimationFrame(() => {
      mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
    });
  };

  const handleSubmit = async (override) => {
    const raw = typeof override === "string" ? override : inputText;
    const trimmed = raw.trim();
    if (!trimmed || isSending || loading) return;

    const entryQuery = firstUserMessage?.content || trimmed;
    const entryTitle = activeChat?.title || makeThreadTitle(entryQuery);

    setInputText("");
    dispatch(setError(null));
    dispatch(setQuotaError(null));
    setIsSending(true);
    setRecentThreads(
      rememberThread({
        id: hasThread ? currentChatId : null,
        query: entryQuery,
        title: entryTitle,
        at: Date.now(),
      }),
    );

    try {
      const result = await handleSendMessage({
        message: trimmed,
        chatId: hasThread ? currentChatId : null,
      });

      // A quota or rate-limit rejection never reached the server, so put the
      // question back in the composer instead of losing the draft.
      if (result?.quotaExceeded) {
        setInputText((current) => (current.trim() ? current : trimmed));
      }
    } finally {
      setIsSending(false);
    }
  };

  const clearShareFeedback = () => {
    if (shareTimerRef.current) window.clearTimeout(shareTimerRef.current);
    setShareStatus("idle");
    setShareError("");
  };

  const flashShareCopied = () => {
    setShareStatus("copied");
    if (shareTimerRef.current) window.clearTimeout(shareTimerRef.current);
    shareTimerRef.current = window.setTimeout(
      () => setShareStatus("idle"),
      2600,
    );
  };

  const handleNewThread = () => {
    dispatch(setCurrentChatId(null));
    dispatch(setError(null));
    dispatch(setQuotaError(null));
    clearShareFeedback();
    setInputText("");
    setIsRailOpen(false);
    scrollToTop();
    focusComposer();
  };

  const handleOpenChat = (chatId) => {
    setIsRailOpen(false);
    dispatch(setError(null));
    dispatch(setQuotaError(null));
    clearShareFeedback();
    handleOpenChats(chatId, chats);
  };

  const handleReuseQuery = (query) => {
    dispatch(setCurrentChatId(null));
    dispatch(setError(null));
    dispatch(setQuotaError(null));
    clearShareFeedback();
    setInputText(query);
    setIsRailOpen(false);
    scrollToTop();
    focusComposer();
  };

  const handleSuggestion = (query) => {
    setInputText(query);
    focusComposer();
  };

  const handleExport = () => {
    if (!hasThread) return;
    downloadThreadMarkdown({
      title: activeChat?.title || headline,
      messages,
    });
  };

  const handleShare = async () => {
    if (!hasThread) return;
    setShareError("");

    // Already public: the action copies the existing link without toggling it
    // off. Stopping sharing is a separate, explicit control.
    if (isShared) {
      try {
        await copyToClipboard(publicShareUrl);
        flashShareCopied();
      } catch {
        setShareStatus("error");
        setShareError("The link could not be copied. Select it from the share bar.");
      }
      return;
    }

    setShareStatus("working");
    const result = await handleShareChat(currentChatId);

    if (!result.ok) {
      setShareStatus("error");
      setShareError(result.message || "Sharing could not be turned on.");
      return;
    }

    if (!result.shared) {
      setShareStatus("idle");
      return;
    }

    const sharePath =
      result.path || (result.shareId ? `/share/${result.shareId}` : "");
    const url = sharePath
      ? `${window.location.origin}${sharePath}`
      : result.url;

    try {
      await copyToClipboard(url);
      flashShareCopied();
    } catch {
      setShareStatus("error");
      setShareError("Sharing is on, but the link could not be copied.");
    }
  };

  const handleStopSharing = async () => {
    setShareStatus("working");
    const result = await handleShareChat(currentChatId);

    if (!result.ok) {
      setShareStatus("error");
      setShareError(result.message || "Sharing could not be turned off.");
      return;
    }

    clearShareFeedback();
  };

  const handleSignOut = async () => {
    setIsRailOpen(false);
    setIsSigningOut(true);
    dispatch(setCurrentChatId(null));
    dispatch(setChats({}));
    dispatch(setError(null));
    dispatch(setQuotaError(null));
    await handleLogout();
    navigate("/login", { replace: true, state: { signedOut: true } });
  };

  return (
    <div className="desk">
      <a className="skip-link" href="#research-note">
        Skip to the research note
      </a>

      <header className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setIsRailOpen(true)}
            aria-label="Open research threads"
            aria-controls="research-rail"
            aria-expanded={isRailOpen}
          >
            <Menu size={18} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="brand-button"
            onClick={handleNewThread}
            aria-label="Perplexity research desk: start new research"
          >
            <Brand />
          </button>

          <span className="topbar-date">{formatDeskDate()}</span>
        </div>

        <div className="topbar-actions">
          <div className="account" aria-label={`Signed in as ${accountName}`} title={accountName}>
            <span className="avatar" aria-hidden="true">
              {initialsFor(accountName)}
            </span>
            <span className="account-text">
              <span className="account-name">
                {accountName}
                {user?.isDemo && (
                  <span className="account-demo">demo</span>
                )}
              </span>
              {accountEmail && (
                <span className="account-email">{accountEmail}</span>
              )}
            </span>
          </div>

          <button
            type="button"
            className="logout-btn"
            onClick={handleSignOut}
            title="Log out"
            aria-label={isSigningOut ? "Signing out" : "Log out"}
            disabled={isSigningOut}
            aria-busy={isSigningOut}
          >
            <LogOut size={14} aria-hidden="true" />
            <span className="logout-label">
              {isSigningOut ? "Signing out" : "Log out"}
            </span>
          </button>
        </div>
      </header>

      <div className="desk-body">
        <div
          className="rail-scrim"
          data-open={isRailOpen}
          onClick={() => setIsRailOpen(false)}
          aria-hidden="true"
        />

        <ResearchRail
          chats={chats}
          recentThreads={recentThreads}
          activeChatId={currentChatId}
          loading={loading}
          open={isRailOpen}
          onClose={() => setIsRailOpen(false)}
          onNew={handleNewThread}
          onOpen={handleOpenChat}
          onReuse={handleReuseQuery}
          onRename={handleRenameChat}
          onTogglePin={handleTogglePin}
        />

        <main
          className="desk-main"
          id="research-note"
          tabIndex={-1}
          aria-label="Research note"
        >
          <div className="desk-scroll" ref={mainRef}>
            <div className="reader">
            {messages.length > 0 ? (
              <article className="memo" aria-labelledby="memo-title">
                <header className="memo-head">
                  <p className="eyebrow">
                    <span className="eyebrow-mark" aria-hidden="true">
                      §
                    </span>
                    Research memo
                  </p>

                  <h1 className="memo-title" id="memo-title">
                    {headline}
                  </h1>

                  <div className="memo-toolbar">
                    <div className="memo-meta">
                      <span>{formatMemoDate(threadDate)}</span>
                      <span className="meta-divider" aria-hidden="true">
                        ·
                      </span>
                      <span>
                        {answerCount} {answerCount === 1 ? "answer" : "answers"}
                      </span>
                      {isSending && (
                        <>
                          <span className="meta-divider" aria-hidden="true">
                            ·
                          </span>
                          <span className="memo-live">
                            <span className="desk-pulse" aria-hidden="true" />
                            Working
                          </span>
                        </>
                      )}
                    </div>

                    <div className="memo-actions" aria-label="Thread actions">
                      <button
                        type="button"
                        className="memo-action"
                        data-status={shareStatus}
                        onClick={handleShare}
                        disabled={shareStatus === "working" || isSending}
                      >
                        {shareStatus === "copied" ? (
                          <Check size={12} aria-hidden="true" />
                        ) : (
                          <Share2 size={12} aria-hidden="true" />
                        )}
                        <span>{shareLabel}</span>
                      </button>

                      <button
                        type="button"
                        className="memo-action"
                        onClick={handleExport}
                        disabled={answerCount === 0 || isSending || hasStreamingAnswer}
                      >
                        <Download size={12} aria-hidden="true" />
                        <span>Export</span>
                      </button>
                    </div>
                  </div>

                  {isShared && (
                    <div className="share-bar">
                      <span className="share-bar-label">
                        <Link2 size={11} aria-hidden="true" />
                        Public link
                      </span>
                      <code className="share-bar-url" title={publicShareUrl}>
                        {publicShareUrl}
                      </code>
                      <button
                        type="button"
                        className="share-bar-copy"
                        onClick={handleShare}
                      >
                        {shareStatus === "copied" ? "Copied" : "Copy link"}
                      </button>
                      <button
                        type="button"
                        className="share-bar-stop"
                        onClick={handleStopSharing}
                        disabled={shareStatus === "working"}
                      >
                        Stop sharing
                      </button>
                    </div>
                  )}

                  {shareError && (
                    <p className="share-error-note" role="alert">
                      {shareError}
                    </p>
                  )}

                  <span className="sr-only" role="status" aria-live="polite">
                    {shareStatus === "copied"
                      ? "Public link copied to the clipboard."
                      : shareStatus === "error"
                        ? "The share link action failed."
                        : ""}
                  </span>
                </header>

                <div className="memo-body">
                  <ThreadBody messages={messages} />

                  {awaitingAnswer && <AnswerSkeleton />}

                  {error && (
                    <ErrorNotice
                      message={error}
                      onDismiss={() => dispatch(setError(null))}
                      inline
                    />
                  )}
                </div>

                {!isSending && !error && !hasStreamingAnswer && answerCount > 0 && (
                  <footer className="memo-end">
                    <span className="memo-end-mark" aria-hidden="true">
                      *
                    </span>
                    <span>End of note</span>
                    <span className="memo-end-rule" aria-hidden="true" />
                    <span>Filed</span>
                  </footer>
                )}
              </article>
            ) : showThreadLoading ? (
              <ThreadPending />
            ) : showEmptyThread ? (
              <section className="empty-note" aria-labelledby="empty-note-title">
                {error && (
                  <ErrorNotice
                    message={error}
                    onDismiss={() => dispatch(setError(null))}
                  />
                )}

                <p className="eyebrow">
                  <span className="eyebrow-mark" aria-hidden="true">
                    §
                  </span>
                  Blank note
                </p>
                <h1 className="memo-title" id="empty-note-title">
                  {activeChat?.title || "This note has no passages yet."}
                </h1>
                <p className="empty-note-copy">
                  There is nothing filed in this thread yet. Ask the desk a
                  question to open the record.
                </p>

                <Composer
                  value={inputText}
                  onChange={setInputText}
                  onSubmit={() => handleSubmit()}
                  sending={isSending}
                  disabled={loading}
                  variant="hero"
                  inputRef={composerRef}
                  placeholder="Ask the first question…"
                  notice={quotaError}
                  onDismissNotice={() => dispatch(setQuotaError(null))}
                />
              </section>
            ) : (
              <section className="hero" aria-labelledby="hero-title">
                {error && (
                  <ErrorNotice
                    message={error}
                    onDismiss={() => dispatch(setError(null))}
                  />
                )}

                <p className="eyebrow">
                  <span className="eyebrow-rule" aria-hidden="true" />
                  Research desk · Ask
                </p>

                <h1 className="hero-title" id="hero-title">
                  Ask a question <em>worth keeping.</em>
                </h1>

                <p className="hero-lede">
                  Answers arrive as reading notes: clear prose, numbered
                  passages, and a thread you can return to. Pick a line of
                  inquiry below, or start your own.
                </p>

                <div className="hero-composer">
                  <Composer
                    value={inputText}
                    onChange={setInputText}
                    onSubmit={() => handleSubmit()}
                    sending={isSending}
                    disabled={loading}
                    variant="hero"
                    inputRef={composerRef}
                    placeholder="What are you researching?"
                    notice={quotaError}
                    onDismissNotice={() => dispatch(setQuotaError(null))}
                  />
                </div>

                <div className="hero-prompts">
                  <div className="prompt-head">
                    <p className="prompt-kicker">Suggested lines of inquiry</p>
                    <span className="prompt-note">
                      Select one to edit before sending
                    </span>
                  </div>

                  <div className="prompt-grid">
                    {SUGGESTIONS.map((suggestion, index) => (
                      <button
                        key={suggestion.title}
                        type="button"
                        className="prompt-card"
                        onClick={() => handleSuggestion(suggestion.query)}
                      >
                        <span className="prompt-index">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="prompt-title">{suggestion.title}</span>
                        <span className="prompt-query">{suggestion.query}</span>
                        <span className="prompt-use">
                          Use prompt
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}
            </div>
          </div>

          {messages.length > 0 && (
            <div className="composer-dock">
              <div className="composer-dock-inner">
                <Composer
                  value={inputText}
                  onChange={setInputText}
                  onSubmit={() => handleSubmit()}
                  sending={isSending}
                  disabled={loading}
                  variant="dock"
                  inputRef={composerRef}
                  placeholder={
                    isSending ? "Draft your next question…" : "Ask a follow-up…"
                  }
                  notice={quotaError}
                  onDismissNotice={() => dispatch(setQuotaError(null))}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
