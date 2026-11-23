const cleanText = (value) => (typeof value === "string" ? value.trim() : "");

const hostnameOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const normaliseApiSource = (source) => {
  if (typeof source === "string") {
    const raw = cleanText(source);
    const url = /^https?:\/\//i.test(raw) ? raw : "";
    return url
      ? { title: hostnameOf(url) || "Source", url, snippet: "" }
      : null;
  }

  if (!source || typeof source !== "object") return null;

  const url = cleanText(
    source.url || source.link || source.href || source.sourceUrl,
  );
  const safeUrl = /^https?:\/\//i.test(url) ? url : "";
  const title = cleanText(
    source.title || source.name || source.label || source.source,
  );
  const snippet = cleanText(
    source.snippet || source.description || source.excerpt || source.text,
  );

  if (!safeUrl && !title) return null;

  return {
    title: title || hostnameOf(safeUrl) || "Untitled source",
    url: safeUrl,
    snippet,
  };
};

/**
 * Reads the source arrays the API may attach to an answer. When none exist,
 * the caller falls back to numbered section markers and no source cards are
 * rendered (nothing is fabricated client-side).
 */
export const getAnswerSources = (message) => {
  const collections = [message?.sources, message?.citations, message?.references];
  const raw = collections.find((value) => Array.isArray(value) && value.length);
  if (!raw) return [];

  return raw
    .map(normaliseApiSource)
    .filter(Boolean)
    .map((source, index) => ({
      ...source,
      number: index + 1,
      domain: source.url ? hostnameOf(source.url) : "",
    }));
};

/**
 * Turns bracketed numeric citations such as [2] into links that jump to the
 * matching source card. Code spans and fenced blocks are left untouched.
 */
export const linkCitationMarkers = (content, sources, idPrefix) => {
  if (!content || !sources.length) return content || "";

  const safeContent = String(content);
  const chunks = safeContent.split(/(```[\s\S]*?```|`[^`\n]*`)/g);

  return chunks
    .map((chunk) => {
      if (chunk.startsWith("`")) return chunk;

      return chunk.replace(/\[(\d{1,2})\](?!\s*[(:])/g, (marker, rawNumber) => {
        const number = Number(rawNumber);
        if (number < 1 || number > sources.length) return marker;
        return `[${number}](#cite-${idPrefix}-${number})`;
      });
    })
    .join("");
};

export const makeDomId = (value, fallback = "answer") => {
  const clean = String(value || fallback).replace(/[^a-zA-Z0-9_-]/g, "-");
  return clean || fallback;
};
