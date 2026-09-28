/**
 * Canonicalize a bearer-token value before an HTTP layer adds the scheme.
 *
 * Some operator UIs receive the complete header value (`Bearer <token>`) while
 * OmniRoute's provider executors add `Authorization: Bearer` themselves. Strip
 * only that transport decoration plus surrounding whitespace. Never log the
 * credential here.
 */
export function normalizeBearerCredentialForRuntime(
  value: string | null | undefined
): string | null | undefined {
  if (typeof value !== "string") return value;
  return value.trim().replace(/^Bearer\s+/i, "").trim();
}
