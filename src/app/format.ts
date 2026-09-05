const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");

/** HH:MM:SS, the transport-bar reading of a position. */
export const timecode = (ms: number): string => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${pad(total / 3600)}:${pad((total % 3600) / 60)}:${pad(total % 60)}`;
};

/**
 * How much reading is left, in the words a person would use.
 * Far more useful on a library row than a word count or a percentage.
 */
export const timeLeft = (ms: number): string => {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "under a minute left";
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h left` : `${hours}h ${rest}m left`;
};

/** Rough remaining time from a token count, before an engine exists. */
export const estimateMs = (tokensLeft: number, wpm: number): number =>
  (tokensLeft / Math.max(1, wpm)) * 60000;

export const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return "0 KB";
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
};
