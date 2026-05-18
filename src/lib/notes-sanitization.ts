export function stripWorkaroundMarkers(
  text: string | null | undefined
): string {
  if (!text) return "";
  return text.replace(/WORKAROUND\[[a-z0-9-]+\]:\s*/gi, "");
}
