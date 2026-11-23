import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import {
  getAnswerSources,
  linkCitationMarkers,
  makeDomId,
} from "../utils/sources";
import { copyToClipboard } from "../utils/clipboard";

const AnswerSources = ({ sources, idPrefix }) => (
  <section
    className="answer-sources"
    aria-label={`Sources cited in this answer (${sources.length})`}
  >
    <div className="sources-head">
      <span className="sources-title">Sources</span>
      <span className="sources-count">
        {sources.length} {sources.length === 1 ? "card" : "cards"}
      </span>
      <span className="sources-rule" aria-hidden="true" />
    </div>

    <div className="sources-grid">
      {sources.map((source) => {
        const cardId = `${idPrefix}-source-${source.number}`;
        const body = (
          <>
            <span className="source-numeral" aria-hidden="true">
              {source.number}
            </span>
            <span className="source-main">
              <span className="source-title">{source.title}</span>
              {source.snippet && (
                <span className="source-snippet">{source.snippet}</span>
              )}
              {source.domain && (
                <span className="source-domain">
                  {source.domain}
                  {source.url && (
                    <ArrowUpRight size={10} aria-hidden="true" />
                  )}
                </span>
              )}
            </span>
          </>
        );

        if (source.url) {
          return (
            <a
              key={`${source.number}-${source.url}`}
              id={cardId}
              className="source-card"
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {body}
            </a>
          );
        }

        return (
          <div key={`${source.number}-${source.title}`} id={cardId} className="source-card">
            {body}
          </div>
        );
      })}
    </div>
  </section>
);

const stripNode = (props) => {
  const next = { ...props };
  delete next.node;
  return next;
};

const AnswerBlock = ({ message, number }) => {
  const bodyRef = useRef(null);
  const timerRef = useRef(null);
  const [copyStatus, setCopyStatus] = useState("idle");

  const content = message?.content || "";
  const sources = getAnswerSources(message);

  const idPrefix = `answer-${makeDomId(message?._id, String(number))}`;
  const citePrefix = `#cite-${idPrefix}-`;

  const renderedContent = linkCitationMarkers(content, sources, idPrefix);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const markStatus = (status) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setCopyStatus(status);
    timerRef.current = window.setTimeout(() => setCopyStatus("idle"), 2200);
  };

  const handleCopy = async () => {
    const text = bodyRef.current?.innerText || content;
    if (!text.trim()) return;

    try {
      await copyToClipboard(text);
      markStatus("copied");
    } catch {
      markStatus("error");
    }
  };

  const markdownComponents = {
    a: (props) => {
      const { href = "", children } = props;
      const anchorProps = stripNode(props);

      if (href.startsWith(citePrefix)) {
        const citeNumber = href.slice(citePrefix.length);
        return (
          <sup className="cite-mark">
            <a
              className="cite-mark-link"
              href={`#${idPrefix}-source-${citeNumber}`}
              aria-label={`Go to source ${citeNumber}`}
            >
              {children}
            </a>
          </sup>
        );
      }

      const external = /^https?:/i.test(href);
      return (
        <a
          {...anchorProps}
          href={href}
          className="answer-link"
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {children}
        </a>
      );
    },
    pre: (props) => <pre {...stripNode(props)} className="answer-pre" />,
    table: (props) => (
      <div className="answer-table-wrap">
        <table {...stripNode(props)} />
      </div>
    ),
    img: (props) => <img loading="lazy" {...stripNode(props)} />,
  };

  const sourceCountLabel = `${sources.length} ${
    sources.length === 1 ? "source" : "sources"
  }`;
  const statusLabel = message?.streaming
    ? "Composing"
    : sources.length
      ? sourceCountLabel
      : "Reading note";

  const copyLabel =
    copyStatus === "copied"
      ? "Copied"
      : copyStatus === "error"
        ? "Retry"
        : "Copy";

  return (
    <section className="answer" aria-label={`Answer ${number}`}>
      <div className="answer-head">
        <span className="answer-kicker">
          <span className="answer-mark" aria-hidden="true" />
          Answer {String(number).padStart(2, "0")}
        </span>
        <span className="answer-status">{statusLabel}</span>
        <span className="answer-rule" aria-hidden="true" />

        <button
          type="button"
          className="copy-btn"
          data-status={copyStatus}
          onClick={handleCopy}
          disabled={message?.streaming || !content.trim()}
          aria-label={
            copyStatus === "copied"
              ? "Answer copied"
              : copyStatus === "error"
                ? "Copy failed. Try again"
                : "Copy answer"
          }
        >
          {copyStatus === "copied" ? (
            <Check size={12} aria-hidden="true" />
          ) : (
            <Copy size={12} aria-hidden="true" />
          )}
          <span>{copyLabel}</span>
        </button>
        <span className="sr-only" role="status" aria-live="polite">
          {copyStatus === "copied"
            ? "Answer copied to the clipboard."
            : copyStatus === "error"
              ? "The answer could not be copied."
              : ""}
        </span>
      </div>

      <div
        ref={bodyRef}
        className={`answer-body${sources.length ? "" : " answer-body--numbered"}`}
      >
        <ReactMarkdown components={markdownComponents}>
          {renderedContent}
        </ReactMarkdown>
        {message?.streaming && (
          <span className="answer-caret" aria-hidden="true" />
        )}
      </div>

      {sources.length > 0 && (
        <AnswerSources sources={sources} idPrefix={idPrefix} />
      )}
    </section>
  );
};

export const AnswerSkeleton = () => (
  <div className="answer-skeleton" aria-busy="true">
    <span className="sr-only" role="status">
      Drafting the answer.
    </span>

    <div className="answer-head" aria-hidden="true">
      <span className="answer-kicker">
        <span className="answer-mark" />
        Answer
      </span>
      <span className="answer-status">Composing</span>
      <span className="answer-rule" />
    </div>

    <p className="skeleton-status" aria-hidden="true">
      <span className="desk-pulse" />
      Reading the desk and drafting a note
    </p>

    <div className="skeleton-lines" aria-hidden="true">
      <span className="skeleton-line skeleton-line--title shimmer" />
      <span className="skeleton-line shimmer" />
      <span className="skeleton-line shimmer" />
      <span className="skeleton-line shimmer" />
      <span className="skeleton-line shimmer" />
    </div>
  </div>
);

export default memo(AnswerBlock);
