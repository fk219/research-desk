import { useMemo } from "react";
import { BookOpen, CornerDownLeft, Plus, X } from "lucide-react";
import { groupThreadsByDate } from "../utils/threadGroups";

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
}) => {
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
        at: entry.at,
      }));

    return [...serverItems, ...localItems].sort(
      (a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime(),
    );
  }, [chats, recentThreads, loading]);

  const groups = useMemo(() => groupThreadsByDate(items), [items]);
  const itemNumbers = useMemo(
    () => new Map(items.map((item, index) => [item.key, index + 1])),
    [items],
  );

  const showSkeleton = loading && items.length === 0;

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
          groups.map((group) => (
            <div className="rail-group" key={group.label}>
              <p className="rail-group-label">{group.label}</p>
              {group.items.map((item) => {
                const isActive =
                  item.kind === "thread" && item.id === activeChatId;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className="thread-item"
                    data-active={isActive}
                    data-kind={item.kind}
                    onClick={() =>
                      item.kind === "thread"
                        ? onOpen(item.id)
                        : onReuse(item.query)
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
                    {item.kind === "local" && (
                      <span className="thread-kind" aria-hidden="true">
                        <CornerDownLeft size={11} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="rail-foot">
        <span className="rail-sync-dot" aria-hidden="true" />
        <p>Recent queries are kept in this browser.</p>
      </div>
    </aside>
  );
};

export default ResearchRail;
