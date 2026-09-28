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


/**
 * Canonicalize an NVIDIA Build/NIM API key for runtime use without mutating storage.
 * Accepts the common copy/paste forms operators use in shells and docs while
 * preserving the underlying nvapi-* token byte-for-byte after decorations are removed.
 */
export function normalizeNvidiaApiKeyForRuntime(
  value: string | null | undefined
): string | null | undefined {
  if (typeof value !== "string") return value;
  let token = value.trim();
  for (let i = 0; i < 4; i += 1) {
    const before = token;
    token = token.replace(/^export\s+/i, "").trim();
    const assignment = token.match(/^NVIDIA_API_KEY\s*=\s*(.*)$/i);
    if (assignment) token = assignment[1].trim();
    if (token.length >= 2) {
      const first = token[0];
      const last = token[token.length - 1];
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        token = token.slice(1, -1).trim();
      }
    }
    token = normalizeBearerCredentialForRuntime(token) ?? token;
    if (token === before) break;
  }
  return token;
}
