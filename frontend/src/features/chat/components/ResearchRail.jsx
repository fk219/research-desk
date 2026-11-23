import { useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  CornerDownLeft,
  Pencil,
  Pin,
  PinOff,
  Plus,
  X,
} from "lucide-react";
import { groupThreadsByDate } from "../utils/threadGroups";
import LegalLinks from "../../../components/LegalLinks";

const ResearchRail = ({
  chats,
  recentThreads,
  activeChatId,
  loading,
  open,
  onClose,
  onNew,
  onOpen,
  onReuse,
  onRename,
  onTogglePin,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const cancelEditRef = useRef(false);

  const items = useMemo(() => {
    const serverChats = Object.values(chats || {}).filter(
      (chat) => chat && chat._id !== "temp",
    );
    const serverIds = new Set(serverChats.map((chat) => chat._id));
    const recentById = new Map(
      (recentThreads || [])
        .filter((entry) => entry.id)
        .map((entry) => [entry.id, entry]),
    );

    const serverItems = serverChats.map((chat) => ({
      key: `thread-${chat._id}`,
      kind: "thread",
      id: chat._id,
      title: chat.title || "Untitled research",
      pinned: Boolean(chat.pinned),
      shared: Boolean(chat.shared),
      at: chat.updatedAt || recentById.get(chat._id)?.at || Date.now(),
    }));

    const seenQueries = new Set();
    const localItems = (recentThreads || [])
      .filter((entry) => !(entry.id && serverIds.has(entry.id)))
      .filter((entry) => !(loading && serverChats.length === 0 && entry.id))
      .filter((entry) => {
        const key = entry.query.trim().toLowerCase();
        if (seenQueries.has(key)) return false;
        seenQueries.add(key);
        return true;
      })
      .map((entry) => ({
        key: `local-${entry.id || entry.query}`,
        kind: "local",
        query: entry.query,
        title: entry.title || entry.query,
        pinned: false,
        at: entry.at,
      }));

    return [...serverItems, ...localItems].sort(
      (a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime(),
    );
  }, [chats, recentThreads, loading]);

  const { pinnedItems, groups, orderedItems } = useMemo(() => {
    const pinned = items.filter(
      (item) => item.kind === "thread" && item.pinned,
    );
    const rest = items.filter(
      (item) => !(item.kind === "thread" && item.pinned),
    );
    const dateGroups = groupThreadsByDate(rest);

    return {
      pinnedItems: pinned,
      groups: dateGroups,
      orderedItems: [...pinned, ...rest],
    };
  }, [items]);

  const itemNumbers = useMemo(
    () => new Map(orderedItems.map((item, index) => [item.key, index + 1])),
    [orderedItems],
  );

  const showSkeleton = loading && items.length === 0;

  const startEditing = (event, item) => {
    event.stopPropagation();
    cancelEditRef.current = false;
    setEditingId(item.id);
    setDraftTitle(item.title);
  };

  const commitRename = async (item) => {
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      return;
    }

    const title = draftTitle.trim();
    setEditingId(null);
    setDraftTitle("");

    if (!title || title === item.title) return;
    await onRename?.(item.id, title);
  };

  const cancelRename = () => {
    cancelEditRef.current = true;
    setEditingId(null);
    setDraftTitle("");
  };

  const renderThreadRow = (item) => {
    const isActive = item.kind === "thread" && item.id === activeChatId;
    const isEditing = item.kind === "thread" && editingId === item.id;

    if (isEditing) {
      return (
        <form
          className="thread-rename"
          key={item.key}
          onSubmit={(event) => {
            event.preventDefault();
            commitRename(item);
          }}
        >
          <label className="sr-only" htmlFor={`rename-${item.id}`}>
            Rename thread
          </label>
          <input
            id={`rename-${item.id}`}
            className="thread-rename-input"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={() => commitRename(item)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                cancelRename();
              }
            }}
            maxLength={120}
            autoFocus
          />
          <button
            type="submit"
            className="thread-rename-save"
            aria-label="Save thread name"
          >
            <Check size={12} aria-hidden="true" />
          </button>
        </form>
      );
    }

    return (
      <div
        className="thread-row"
        key={item.key}
        data-active={isActive}
        data-kind={item.kind}
      >
        <button
          type="button"
          className="thread-item"
          data-active={isActive}
          data-kind={item.kind}
          onClick={() =>
            item.kind === "thread" ? onOpen(item.id) : onReuse(item.query)
          }
          title={
            item.kind === "local"
              ? "Reuse this query in the composer"
              : item.title
          }
          aria-label={
            item.kind === "local"
              ? `Reuse query: ${item.title}`
              : `Open research thread: ${item.title}`
          }
          aria-current={isActive ? "page" : undefined}
        >
          <span className="thread-index" aria-hidden="true">
            {String(itemNumbers.get(item.key)).padStart(2, "0")}
          </span>
          <span className="thread-title">{item.title}</span>
          {item.kind === "thread" && item.pinned && (
            <Pin
              className="thread-pin-indicator"
              size={10}
              aria-hidden="true"
            />
          )}
          {item.kind === "local" && (
            <span className="thread-kind" aria-hidden="true">
              <CornerDownLeft size={11} />
            </span>
          )}
        </button>

        {item.kind === "thread" && (
          <div className="thread-actions">
            <button
              type="button"
              className="thread-action"
              data-on={item.pinned}
              onClick={() => onTogglePin?.(item.id, !item.pinned)}
              aria-pressed={item.pinned}
              aria-label={
                item.pinned
                  ? `Unpin thread: ${item.title}`
                  : `Pin thread: ${item.title}`
              }
              title={item.pinned ? "Unpin thread" : "Pin thread"}
            >
              {item.pinned ? (
                <PinOff size={11} aria-hidden="true" />
              ) : (
                <Pin size={11} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="thread-action"
              onClick={(event) => startEditing(event, item)}
              aria-label={`Rename thread: ${item.title}`}
              title="Rename thread"
            >
              <Pencil size={11} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      id="research-rail"
      className="rail"
      data-open={open}
      aria-label="Research threads"
    >
      <div className="rail-head">
        <div className="rail-heading-row">
          <p className="rail-kicker">Index</p>
          <button
            type="button"
            className="rail-close"
            onClick={onClose}
            aria-label="Close research threads"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <button type="button" className="rail-new" onClick={onNew}>
          <Plus size={15} aria-hidden="true" />
          <span>New research</span>
        </button>
      </div>

      <div className="rail-scroll">
        <div className="rail-section-top">
          <span>Threads</span>
          <span className="rail-count">
            {String(items.length).padStart(2, "0")}
          </span>
        </div>

        {showSkeleton ? (
          <>
            <span className="sr-only" role="status">
              Loading your research threads.
            </span>
            <div className="rail-skeleton" aria-hidden="true">
              <span className="rail-skeleton-line shimmer" />
              <span className="rail-skeleton-line shimmer" />
              <span className="rail-skeleton-line shimmer" />
              <span className="rail-skeleton-line shimmer" />
            </div>
          </>
        ) : items.length === 0 ? (
          <div className="rail-empty">
            <BookOpen
              className="rail-empty-icon"
              size={18}
              aria-hidden="true"
            />
            <p className="rail-empty-title">No threads yet</p>
            <p className="rail-empty-copy">
              Ask your first question and the note opens here, indexed by date.
            </p>
          </div>
        ) : (
          <>
            {pinnedItems.length > 0 && (
              <div className="rail-group">
                <p className="rail-group-label">Pinned</p>
                {pinnedItems.map(renderThreadRow)}
              </div>
            )}

            {groups.map((group) => (
              <div className="rail-group" key={group.label}>
                <p className="rail-group-label">{group.label}</p>
                {group.items.map(renderThreadRow)}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="rail-foot">
        <div className="rail-foot-note">
          <span className="rail-sync-dot" aria-hidden="true" />
          <p>Pin a thread to keep it at the top. Rename inline from the index.</p>
        </div>
        <LegalLinks className="rail-legal" />
      </div>
    </aside>
  );
};

export default ResearchRail;
