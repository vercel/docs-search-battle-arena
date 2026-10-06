const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Admin access is a local-development convenience only. It requires all of:
 * - not running on Vercel (fails closed for every deployment, any env var)
 * - a non-production build (`next dev`)
 * - a request addressed to a loopback host
 */
export function isLocalDevAdmin(req: Request): boolean {
  if (process.env.VERCEL) return false;
  if (process.env.NODE_ENV !== "development") return false;

  const hostname = new URL(req.url).hostname;
  return LOOPBACK_HOSTS.has(hostname);
}
