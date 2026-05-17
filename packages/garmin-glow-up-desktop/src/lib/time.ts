export function relativeTime(isoStr: string): string {
  const d = new Date(isoStr);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d ago`;
  return d.toLocaleDateString();
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function currentYear(): number {
  return new Date().getFullYear();
}
