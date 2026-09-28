/**
 * Hosts that should use the runtime's original native fetch for direct egress.
 *
 * NVIDIA's hosted NIM edge has repeatedly stalled with OmniRoute's custom
 * undici-v8 pooled dispatcher, including the fresh-socket retry path. Native
 * fetch is already the proven transport for NVIDIA credential validation.
 * Explicit proxy routes never reach this policy because proxyFetch resolves
 * those before entering the direct-egress branch.
 */
const NATIVE_DIRECT_HOSTS = new Set(["integrate.api.nvidia.com"]);

export function shouldUseNativeDirectFetch(targetUrl: string): boolean {
  try {
    return NATIVE_DIRECT_HOSTS.has(new URL(targetUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}
