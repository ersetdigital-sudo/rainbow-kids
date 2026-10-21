export function rp(n?: number | null): string {
  return `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;
}

export function num(n: number): string {
  return n.toLocaleString("id-ID");
}

export function percent(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`;
}

export function initials(name?: string): string {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function uid(prefix: string): string {
  return (
    prefix +
    Date.now().toString(36).slice(-5) +
    Math.floor(Math.random() * 90 + 10)
  );
}
