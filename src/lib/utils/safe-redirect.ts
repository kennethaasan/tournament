const DEFAULT_REDIRECT = "/dashboard/admin/overview";

/**
 * Validates that a callback URL is safe for redirection.
 * Only allows relative paths starting with "/" that don't contain
 * protocol handlers or attempts to redirect to external hosts.
 *
 * This prevents open redirect vulnerabilities where an attacker could
 * craft a malicious callback URL like:
 * - `//evil.com` (protocol-relative URL)
 * - `/path?redirect=javascript:alert(1)`
 * - `/%2f%2fevil.com` (encoded double-slash)
 */
export function getSafeCallbackUrl(
  url: string | null | undefined,
  defaultUrl = DEFAULT_REDIRECT,
): string {
  if (!url) {
    return defaultUrl;
  }

  // Must start with a single forward slash (not //)
  if (!url.startsWith("/") || url.startsWith("//")) {
    return defaultUrl;
  }

  // Block protocol handlers (javascript:, data:, etc.) that could be injected
  // after a valid-looking path prefix
  const lowerUrl = url.toLowerCase();
  if (
    lowerUrl.includes("javascript:") ||
    lowerUrl.includes("data:") ||
    lowerUrl.includes("vbscript:")
  ) {
    return defaultUrl;
  }

  // Additional check: ensure no encoded characters that could bypass checks
  try {
    const decoded = decodeURIComponent(url);
    if (decoded.startsWith("//") || decoded.includes("://")) {
      return defaultUrl;
    }
  } catch {
    // Invalid URL encoding, reject
    return defaultUrl;
  }

  return url;
}
