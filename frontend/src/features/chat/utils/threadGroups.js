const DAY = 24 * 60 * 60 * 1000;
const GROUP_ORDER = ["Today", "Yesterday", "Earlier this week", "Earlier"];

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const labelForDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";

  const diff = Math.round((startOfDay(new Date()) - startOfDay(date)) / DAY);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "Earlier this week";
  return "Earlier";
};

export const groupThreadsByDate = (items) => {
  const groups = new Map();

  items.forEach((item) => {
    const label = labelForDate(item.at);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  });

  return GROUP_ORDER.filter((label) => groups.has(label)).map((label) => ({
    label,
    items: groups.get(label),
  }));
};

export const formatMemoDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Undated";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const formatDeskDate = (value = new Date()) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(value);
