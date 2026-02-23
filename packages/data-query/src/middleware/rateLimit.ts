/**
 * Simple in-memory rate limiter middleware for Hono
 *
 * Limits: 30 req/min per IP (configurable)
 */

import type { Context, Next } from "hono";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

interface RateLimitOptions {
  windowMs?: number; // time window in ms (default: 60s)
  max?: number; // max requests per window (default: 30)
  keyFn?: (c: Context) => string; // function to extract rate limit key
}

export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60 * 1000,
    max = 30,
    keyFn = (c: Context) =>
      c.req.header("x-forwarded-for") ??
      c.req.header("x-real-ip") ??
      "anonymous",
  } = options;

  return async (c: Context, next: Next) => {
    const key = keyFn(c);
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    c.header("X-RateLimit-Limit", String(max));
    c.header("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    c.header(
      "X-RateLimit-Reset",
      String(Math.floor(entry.resetAt / 1000))
    );

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header("Retry-After", String(retryAfter));

      return c.json(
        {
          success: false,
          error: "Rate limit exceeded",
          retryAfterSeconds: retryAfter,
        },
        429
      );
    }

    await next();
  };
}
