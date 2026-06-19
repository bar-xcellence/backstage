// Shared, dependency-free email shape check. Lives here (a module with no
// imports) so client components and server code can both reuse it without
// dragging server-only deps (db/drizzle) into the client bundle.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRecipientInput(input: {
  label?: string | null;
  email?: string | null;
}): string[] {
  const errors: string[] = [];
  const label = input.label?.trim();
  const email = input.email?.trim();
  if (!label) errors.push("Label is required");
  if (!email) errors.push("Email is required");
  else if (!EMAIL_PATTERN.test(email)) errors.push("Email is not valid");
  return errors;
}
