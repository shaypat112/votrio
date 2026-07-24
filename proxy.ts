import { NextResponse, type NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

// This is intentionally a small, bounded process-local shield. A CDN/WAF must
// remain the authoritative DDoS control for multi-instance deployments.
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_BUCKETS = 10_000;

function clientAddress(request: NextRequest) {
  // Prefer the platform-provided address. Only trust forwarded headers when
  // the deployment sits behind a trusted reverse proxy/CDN.
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    "unknown"
  );
}

function limitFor(pathname: string) {
  if (
    pathname === "/api/scan/github" ||
    pathname === "/api/github/repo-scan" ||
    pathname.startsWith("/api/ai/") ||
    pathname === "/api/ai" ||
    pathname === "/api/chat" ||
    pathname === "/api/analyze" ||
    pathname === "/api/settings/test-webhook"
  ) {
    return 10;
  }
  return 120;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const now = Date.now();
  const key = `${clientAddress(request)}:${pathname}`;
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
    }
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }

  const limit = limitFor(pathname);
  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  if (bucket.count > limit) {
    return NextResponse.json(
      { error: "Too many requests. Please retry later." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
        },
      },
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
