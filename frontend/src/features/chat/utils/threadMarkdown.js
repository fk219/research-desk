import { getAnswerSources } from "./sources";

const slugify = (value) =>
  String(value || "research-note")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "research-note";

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

/**
 * A portable copy of the thread: question, answer markdown, and every source
 * with its URL so the answer can be checked outside the desk.
 */
export const buildThreadMarkdown = ({ title, messages = [] }) => {
  const firstQuestion = messages.find((message) => message.role === "user");
  const headline = title || firstQuestion?.content || "Research note";
  const lines = [
    `# ${headline}`,
    "",
    `_Exported from the Research Desk · ${formatDate(new Date())}_`,
    "",
  ];

  let questionNumber = 0;
  let answerNumber = 0;

  messages.forEach((message) => {
    if (message.role === "user") {
      questionNumber += 1;
      lines.push(
        questionNumber === 1 ? "## Question" : "## Follow-up question",
        "",
        message.content,
        "",
      );
      return;
    }

    if (message.role !== "ai") return;

    answerNumber += 1;
    lines.push(`## Answer ${String(answerNumber).padStart(2, "0")}`, "", message.content, "");

    const sources = getAnswerSources(message);
    if (sources.length === 0) {
      lines.push("_No sources were attached to this answer._", "");
      return;
    }

    lines.push("### Sources", "");
    sources.forEach((source) => {
      const label = source.title || source.domain || "Source";
      const suffix = source.url ? `: ${source.url}` : "";
      lines.push(`${source.number}. ${label}${suffix}`);
    });
    lines.push("");
  });

  return `${lines.join("\n").trim()}\n`;
};

export const downloadThreadMarkdown = ({ title, messages }) => {
  if (!messages?.length) return false;

  const markdown = buildThreadMarkdown({ title, messages });
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${slugify(title)}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
};
