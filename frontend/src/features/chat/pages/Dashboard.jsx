import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AlertCircle, ArrowUpRight, LogOut, Menu } from "lucide-react";
import Brand from "../../../components/Brand";
import { useAuth } from "../../auth/hook/useAuth";
import useChat from "../hook/useChat";
import { setChats, setCurrentChatId, setError } from "../chat.slice";
import AnswerBlock, { AnswerSkeleton } from "../components/AnswerBlock";
import Composer from "../components/Composer";
import ResearchRail from "../components/ResearchRail";
import {
  makeThreadTitle,
  readRecentThreads,
  rememberThread,
} from "../utils/recentThreads";
import { formatDeskDate, formatMemoDate } from "../utils/threadGroups";

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
  const composerRef = useRef(null);
  const mainRef = useRef(null);

  const { handleSendMessage, handleGetChats, handleOpenChats } = useChat();
  const { handleLogout } = useAuth();

  const [isRailOpen, setIsRailOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [recentThreads, setRecentThreads] = useState(readRecentThreads);

  const user = useSelector((state) => state.auth.user);
  const chats = useSelector((state) => state.chat.chats);
  const currentChatId = useSelector((state) => state.chat.currentChatId);
  const loading = useSelector((state) => state.chat.loading);
  const error = useSelector((state) => state.chat.error);

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

  const accountName = user?.username || user?.email || "Researcher";
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
      await handleSendMessage({
        message: trimmed,
        chatId: hasThread ? currentChatId : null,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleNewThread = () => {
    dispatch(setCurrentChatId(null));
    dispatch(setError(null));
    setInputText("");
    setIsRailOpen(false);
    scrollToTop();
    focusComposer();
  };

  const handleOpenChat = (chatId) => {
    setIsRailOpen(false);
    dispatch(setError(null));
    handleOpenChats(chatId, chats);
  };

  const handleReuseQuery = (query) => {
    dispatch(setCurrentChatId(null));
    dispatch(setError(null));
    setInputText(query);
    setIsRailOpen(false);
    scrollToTop();
    focusComposer();
  };

  const handleSuggestion = (query) => {
    setInputText(query);
    focusComposer();
  };

  const handleSignOut = () => {
    setIsRailOpen(false);
    dispatch(setCurrentChatId(null));
    dispatch(setChats({}));
    dispatch(setError(null));
    handleLogout();
  };

  let answerNumber = 0;
  const messageBlocks = messages.map((message, index) => {
    const key = message._id || `${message.role}-${index}`;

    if (message.role === "user") {
      if (index === firstUserIndex) return null;

      return (
        <section className="follow-up" key={key} aria-label="Follow-up question">
          <p className="follow-up-label">Follow-up</p>
          <p className="follow-up-question">{message.content}</p>
        </section>
      );
    }

    answerNumber += 1;
    return (
      <AnswerBlock
        key={key}
        message={message}
        number={answerNumber}
      />
    );
  });

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
            aria-label="Perplexity research desk — start new research"
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
              <span className="account-name">{accountName}</span>
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
            aria-label="Log out"
          >
            <LogOut size={14} aria-hidden="true" />
            <span className="logout-label">Log out</span>
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
                </header>

                <div className="memo-body">
                  {messageBlocks}

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
                          <ArrowUpRight size={11} aria-hidden="true" />
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
