export interface DatetimeWindow {
  start: string;
  end: string;
}

export function toDatetimeLocal(value: Date): string {
  const offset = value.getTimezoneOffset();
  const normalized = new Date(value.getTime() - offset * 60_000);
  return normalized.toISOString().slice(0, 16);
}

export function buildRelativeWindow(minutes: number): DatetimeWindow {
  const end = new Date();
  const start = new Date(end.getTime() - minutes * 60_000);
  return {
    start: toDatetimeLocal(start),
    end: toDatetimeLocal(end),
  };
}

export function buildDefaultWindow(): DatetimeWindow {
  return buildRelativeWindow(15);
}
