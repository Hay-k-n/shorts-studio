/** Returns BACKEND_URL with a guaranteed https:// prefix. */
export function getBackendUrl(): string {
  const raw = process.env.BACKEND_URL ?? "http://localhost:4000";
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, "");
  return "https://" + raw.replace(/\/$/, "");
}
