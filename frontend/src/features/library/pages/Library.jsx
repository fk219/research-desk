import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, RefreshCw, Search, Trash2 } from "lucide-react";
import Brand from "../../../components/Brand";

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "The request failed.");
  }
  return data;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const Library = () => {
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [kind, setKind] = useState("text");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const loadDocuments = async () => {
    const data = await request("/api/library/documents");
    setDocuments(data.documents || []);
  };

  useEffect(() => {
    loadDocuments().catch((err) => setError(err.message));
  }, []);

  const waitForJob = async (jobId) => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const data = await request(`/api/library/jobs/${jobId}`);
      setStatus(`Indexing: ${data.job.status}`);
      if (data.job.status === "ready") return data.job;
      if (data.job.status === "failed") throw new Error(data.job.error || "Ingestion failed.");
      await sleep(500);
    }
    throw new Error("Ingestion is taking longer than expected.");
  };

  const upload = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("Uploading…");
    try {
      const data = await request("/api/library/documents", {
        method: "POST",
        body: JSON.stringify({ title, content, kind }),
      });
      await waitForJob(data.job.id);
      setTitle("");
      setContent("");
      setStatus("Indexed and ready.");
      await loadDocuments();
    } catch (err) {
      setError(err.message);
      setStatus("");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setError("");
    try {
      await request(`/api/library/documents/${id}`, { method: "DELETE" });
      await loadDocuments();
    } catch (err) {
      setError(err.message);
    }
  };

  const reingest = async (id) => {
    setError("");
    setStatus("Re-indexing…");
    try {
      const data = await request(`/api/library/documents/${id}/reingest`, { method: "POST" });
      await waitForJob(data.job.id);
      setStatus("Re-indexed.");
      await loadDocuments();
    } catch (err) {
      setError(err.message);
    }
  };

  const search = async (event) => {
    event.preventDefault();
    setSearching(true);
    setError("");
    try {
      const data = await request(`/api/library/search?q=${encodeURIComponent(query)}`);
      setResults(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <main className="library-page">
      <header className="library-top">
        <Link to="/" className="library-back">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to the desk
        </Link>
        <Brand />
      </header>

      <div className="library-heading">
        <p className="eyebrow">Private sources</p>
        <h1>Your library, cited.</h1>
        <p>
          Upload text or Markdown. The desk indexes it locally and can use it
          alongside live web sources in any answer.
        </p>
      </div>

      {error && <p className="library-error" role="alert">{error}</p>}
      {status && <p className="library-status" role="status">{status}</p>}

      <div className="library-grid">
        <section className="library-card">
          <h2>Add a document</h2>
          <form onSubmit={upload} className="library-form">
            <label>
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={160}
                required
                placeholder="e.g. Atlas refund policy"
              />
            </label>
            <label>
              Content
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={9}
                required
                placeholder="Paste the text or Markdown to index…"
              />
            </label>
            <label>
              Format
              <select value={kind} onChange={(event) => setKind(event.target.value)}>
                <option value="text">Text</option>
                <option value="markdown">Markdown</option>
              </select>
            </label>
            <button type="submit" className="library-primary" disabled={busy}>
              <BookOpen size={15} aria-hidden="true" />
              {busy ? "Indexing…" : "Upload and index"}
            </button>
          </form>
        </section>

        <section className="library-card">
          <h2>Search the library</h2>
          <form onSubmit={search} className="library-search">
            <Search size={15} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. refund window"
              aria-label="Search the library"
            />
            <button type="submit" disabled={searching || !query.trim()}>
              {searching ? "Searching" : "Search"}
            </button>
          </form>

          {results.length > 0 && (
            <ul className="library-results">
              {results.map((result) => (
                <li key={`${result.documentId}-${result.chunkIndex}`}>
                  <span>{result.documentTitle} · chunk {result.chunkIndex + 1}</span>
                  <p>{result.text}</p>
                  <small>score {result.score}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="library-list">
        <h2>Documents ({documents.length})</h2>
        {documents.length === 0 ? (
          <p className="library-empty">No documents yet. Upload one above.</p>
        ) : (
          <ul>
            {documents.map((document) => (
              <li key={document.id}>
                <div>
                  <strong>{document.title}</strong>
                  <span>
                    {document.status} · {document.chunkCount} chunks · {document.charCount.toLocaleString()} chars
                  </span>
                  {document.error && <small>{document.error}</small>}
                </div>
                <div className="library-actions">
                  <button
                    type="button"
                    onClick={() => reingest(document.id)}
                    aria-label={`Re-index ${document.title}`}
                    title="Re-index"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(document.id)}
                    aria-label={`Delete ${document.title}`}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default Library;
