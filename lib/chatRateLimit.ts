/**
 * In-memory rate limiter for the chat bot.
 *
 * Why it can't be tricked by incognito mode / clearing cookies:
 *  - The PRIMARY key is the authenticated Clerk `userId`. A user must be signed
 *    in to reach the chat API, and the userId stays the same regardless of
 *    incognito mode, cleared cookies, or new browser sessions. The only way to
 *    "reset" it is to create an entirely new account.
 *  - A SECONDARY key based on the client IP is also enforced so that even with
 *    multiple accounts from the same machine/network, abuse is still throttled.
 *
 * Rules enforced (configurable below):
 *  - COOLDOWN: at least 60 seconds must pass between two consecutive requests.
 *  - QUOTA:    a maximum of 15 requests is allowed within the rolling window.
 *
 * NOTE: This is an in-memory store. It works for a single server instance and
 * resets on redeploy. For multi-instance / serverless production scale, swap the
 * `store` Map for a shared store such as Upstash Redis (the public API of this
 * module stays the same).
 */

export const RATE_LIMIT_CONFIG = {
  /** Minimum time between two consecutive requests (ms). */
  cooldownMs: 60 * 1000, // 1 minute
  /** Maximum number of requests allowed within `windowMs`. */
  maxRequests: 15,
  /** Rolling window over which `maxRequests` is counted (ms). */
  windowMs: 60 * 60 * 1000, // 1 hour
} as const;

type Bucket = {
  /** Timestamps (ms) of requests within the current window. */
  hits: number[];
  /** Timestamp (ms) of the most recent request. */
  lastRequest: number;
};

// Two separate stores so we can throttle on both identity and network origin.
const userStore = new Map<string, Bucket>();
const ipStore = new Map<string, Bucket>();

/** Quota/cooldown info returned to the client so the UI can display it. */
export type RateLimitStatus = {
  /** Requests still available in the current window. */
  remaining: number;
  /** Total allowance per window. */
  limit: number;
  /** Seconds until the user may send their next message (0 if ready now). */
  cooldownSeconds: number;
};

export type RateLimitResult =
  | { allowed: true; status: RateLimitStatus }
  | {
      allowed: false;
      reason: "cooldown" | "quota";
      /** Seconds the client should wait before retrying. */
      retryAfterSeconds: number;
      message: string;
      status: RateLimitStatus;
    };

function buildStatus(
  bucket: Bucket,
  now: number,
  consumedNow: boolean,
): RateLimitStatus {
  const { cooldownMs, maxRequests } = RATE_LIMIT_CONFIG;
  // If a request is being committed now, count it against the remaining quota.
  const used = bucket.hits.length + (consumedNow ? 1 : 0);
  const remaining = Math.max(0, maxRequests - used);

  const sinceLast = now - bucket.lastRequest;
  const cooldownSeconds =
    bucket.lastRequest === 0 || sinceLast >= cooldownMs
      ? 0
      : Math.ceil((cooldownMs - sinceLast) / 1000);

  return { remaining, limit: maxRequests, cooldownSeconds };
}

function checkBucket(
  store: Map<string, Bucket>,
  key: string,
  now: number,
): RateLimitResult {
  const { cooldownMs, maxRequests, windowMs } = RATE_LIMIT_CONFIG;

  let bucket = store.get(key);
  if (!bucket) {
    bucket = { hits: [], lastRequest: 0 };
    store.set(key, bucket);
  }

  // Drop hits that fall outside the rolling window.
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  // 1. Cooldown check (min gap between requests).
  const sinceLast = now - bucket.lastRequest;
  if (bucket.lastRequest !== 0 && sinceLast < cooldownMs) {
    const retryAfterSeconds = Math.ceil((cooldownMs - sinceLast) / 1000);
    return {
      allowed: false,
      reason: "cooldown",
      retryAfterSeconds,
      message: `Please wait ${retryAfterSeconds}s before sending another message.`,
      status: buildStatus(bucket, now, false),
    };
  }

  // 2. Quota check (max requests per window).
  if (bucket.hits.length >= maxRequests) {
    const oldest = bucket.hits[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowMs - (now - oldest)) / 1000),
    );
    return {
      allowed: false,
      reason: "quota",
      retryAfterSeconds,
      message: `You have reached the limit of ${maxRequests} messages. Try again later.`,
      status: buildStatus(bucket, now, false),
    };
  }

  return { allowed: true, status: buildStatus(bucket, now, false) };
}

function commit(store: Map<string, Bucket>, key: string, now: number) {
  const bucket = store.get(key);
  if (!bucket) return;
  bucket.hits.push(now);
  bucket.lastRequest = now;
}

/**
 * Enforce rate limits for a chat request.
 *
 * @param userId  Authenticated Clerk user id (primary, bypass-proof key).
 * @param ip      Best-effort client IP (secondary key).
 */
export function enforceChatRateLimit(
  userId: string,
  ip: string | null,
): RateLimitResult {
  const now = Date.now();

  // Primary: per authenticated user. Cannot be reset by incognito/cookies.
  const userResult = checkBucket(userStore, `user:${userId}`, now);
  if (!userResult.allowed) return userResult;

  // Secondary: per IP, to curb multi-account abuse from one machine/network.
  if (ip) {
    const ipResult = checkBucket(ipStore, `ip:${ip}`, now);
    if (!ipResult.allowed) return ipResult;
  }

  // Only commit a hit once both checks pass.
  commit(userStore, `user:${userId}`, now);
  if (ip) commit(ipStore, `ip:${ip}`, now);

  // Report the status AFTER this request has been counted.
  const userBucket = userStore.get(`user:${userId}`);
  const status: RateLimitStatus = userBucket
    ? buildStatus(userBucket, now, false)
    : {
        remaining: RATE_LIMIT_CONFIG.maxRequests,
        limit: RATE_LIMIT_CONFIG.maxRequests,
        cooldownSeconds: RATE_LIMIT_CONFIG.cooldownMs / 1000,
      };

  return { allowed: true, status };
}

/** Periodically clear empty buckets so the maps don't grow unbounded. */
function sweep() {
  const now = Date.now();
  const { windowMs } = RATE_LIMIT_CONFIG;
  for (const store of [userStore, ipStore]) {
    for (const [key, bucket] of store) {
      bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
      if (bucket.hits.length === 0 && now - bucket.lastRequest > windowMs) {
        store.delete(key);
      }
    }
  }
}

// Avoid keeping the Node process alive purely for the sweep.
const interval = setInterval(sweep, 10 * 60 * 1000);
if (typeof interval === "object" && "unref" in interval) {
  interval.unref();
}
