export function toDatetimeLocal(value: Date): string {
  const offset = value.getTimezoneOffset();
  const normalized = new Date(value.getTime() - offset * 60_000);
  return normalized.toISOString().slice(0, 16);
}

export function buildDefaultWindow(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getTime() - 15 * 60_000);
  return {
    start: toDatetimeLocal(start),
    end: toDatetimeLocal(end),
  };
}
