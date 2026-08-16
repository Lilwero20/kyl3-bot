/** Parse strings like "1h 30m", "2d", "10s" into milliseconds. */
export function parseDuration(input: string): number | null {
  const regex = /(\d+)\s*(ms|s|m|h|d|w|mo|y)/g;
  let total = 0;
  let matched = false;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    matched = true;
    const value = Number(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'ms':
        total += value;
        break;
      case 's':
        total += value * 1000;
        break;
      case 'm':
        total += value * 60_000;
        break;
      case 'h':
        total += value * 3_600_000;
        break;
      case 'd':
        total += value * 86_400_000;
        break;
      case 'w':
        total += value * 604_800_000;
        break;
      case 'mo':
        total += value * 2_592_000_000;
        break;
      case 'y':
        total += value * 31_536_000_000;
        break;
    }
  }

  return matched ? total : null;
}

/** Format a millisecond duration into a human readable string. */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const units: [string, number][] = [
    ['y', 31_536_000_000],
    ['mo', 2_592_000_000],
    ['w', 604_800_000],
    ['d', 86_400_000],
    ['h', 3_600_000],
    ['m', 60_000],
    ['s', 1000],
  ];
  const parts: string[] = [];
  for (const [label, size] of units) {
    const count = Math.floor(ms / size);
    if (count > 0) {
      parts.push(`${count}${label}`);
      ms -= count * size;
    }
  }
  return parts.length ? parts.join(' ') : '0s';
}

/** Resolve a natural-language relative date like "12h" into an ISO timestamp string. */
export function relativeTimestamp(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

/** Roblox-style relative timestamp (Discord <t:...>). */
export function discordTimestamp(msEpochSeconds: number, style: 'R' | 'F' | 'T' = 'R'): string {
  return `<t:${Math.floor(msEpochSeconds)}:${style}>`;
}
