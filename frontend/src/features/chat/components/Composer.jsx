import { useEffect, useId, useRef } from "react";
import { AlertCircle, ArrowUp, X } from "lucide-react";

const Composer = ({
  value,
  onChange,
  onSubmit,
  sending = false,
  disabled = false,
  variant = "hero",
  inputRef,
  placeholder = "Ask anything…",
  notice = "",
  onDismissNotice,
}) => {
  const localRef = useRef(null);
  const labelId = useId();
  const hintId = useId();

  useEffect(() => {
    const node = localRef.current;
    if (!node) return;

    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 172)}px`;
  }, [value]);

  const submit = () => {
    if (disabled || sending || !value.trim()) return;
    onSubmit();
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;

    event.preventDefault();
    submit();
  };

  return (
    <form
      className={`composer composer--${variant}`}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="composer-top">
        <label className="composer-label" htmlFor={labelId}>
          {variant === "dock" ? "Follow-up" : "Research query"}
        </label>
      </div>

      <textarea
        id={labelId}
        ref={(node) => {
          localRef.current = node;
          if (inputRef) inputRef.current = node;
        }}
        className="composer-input"
        rows={variant === "hero" ? 2 : 1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-describedby={hintId}
        autoComplete="off"
      />

      {notice && (
        <div className="composer-notice" role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          <span>{notice}</span>
          {onDismissNotice && (
            <button
              type="button"
              className="composer-notice-dismiss"
              onClick={onDismissNotice}
              aria-label="Dismiss notice"
            >
              <X size={12} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <div className="composer-foot">
        <p className="composer-hint" id={hintId}>
          <kbd>Enter</kbd> send
          <span className="hint-sep" aria-hidden="true">
            ·
          </span>
          <span className="hint-newline">
            <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line
          </span>
        </p>

        <button
          type="submit"
          className="send-btn"
          disabled={disabled || sending || !value.trim()}
          aria-label={sending ? "Sending query" : "Send query"}
        >
          {sending ? (
            <span className="send-pulse" aria-hidden="true" />
          ) : (
            <ArrowUp size={14} strokeWidth={2.2} aria-hidden="true" />
          )}
          <span className="send-label">{sending ? "Working" : "Send"}</span>
        </button>
      </div>
    </form>
  );
};

export default Composer;
