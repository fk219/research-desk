const STORAGE_KEY = "research-desk:recent-threads:v1";
const MAX_THREADS = 24;

const cleanText = (value) => (typeof value === "string" ? value.trim() : "");

const normalise = (value) => cleanText(value).toLowerCase().replace(/\s+/g, " ");

export const makeThreadTitle = (query) => {
  const text = cleanText(query);
  if (!text) return "Untitled research";

  if (text.length <= 74) return text;

  const cut = text.slice(0, 74);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 42 ? lastSpace : 74).trim()}…`;
};

const isValidEntry = (entry) =>
  entry &&
  typeof entry === "object" &&
  (cleanText(entry.query) || cleanText(entry.title)) &&
  (entry.at === undefined || Number.isFinite(Number(entry.at)));

export const readRecentThreads = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isValidEntry)
      .slice(0, MAX_THREADS)
      .map((entry) => ({
        id: cleanText(entry.id) || null,
        query: cleanText(entry.query) || cleanText(entry.title),
        title: cleanText(entry.title) || makeThreadTitle(entry.query),
        at: Number(entry.at) || Date.now(),
      }));
  } catch {
    return [];
  }
};

export const saveRecentThreads = (threads) => {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(threads.slice(0, MAX_THREADS)),
    );
  } catch {
    // Storage can be unavailable (private mode, quota); the rail still works
    // with server history for this session.
  }
};

/**
 * Adds or refreshes one recent thread and returns the new list. Server chat
 * history stays authoritative; this is only a device-side index of queries.
 */
export const rememberThread = (payload, currentThreads = readRecentThreads()) => {
  const query = cleanText(payload?.query);
  const title = cleanText(payload?.title) || makeThreadTitle(query);
  if (!query && !title) return currentThreads;

  const id = cleanText(payload?.id) || null;
  const at = Number(payload?.at) || Date.now();
  const key = normalise(query || title);

  const existingIndex = currentThreads.findIndex((entry) => {
    if (id && entry.id === id) return true;
    return !entry.id && normalise(entry.query) === key;
  });

  const nextEntry = {
    id: id || currentThreads[existingIndex]?.id || null,
    query: query || currentThreads[existingIndex]?.query || title,
    title: title || currentThreads[existingIndex]?.title || makeThreadTitle(query),
    at,
  };

  const nextThreads =
    existingIndex === -1
      ? [nextEntry, ...currentThreads]
      : [
          nextEntry,
          ...currentThreads.filter((_, index) => index !== existingIndex),
        ];

  const limited = nextThreads.slice(0, MAX_THREADS);
  saveRecentThreads(limited);
  return limited;
};
