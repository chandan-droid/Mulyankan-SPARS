/**
 * cacheManager.js
 * Centralized localStorage cache for API responses.
 *
 * Strategy: **Stale-While-Revalidate**
 *   → Serve cached data instantly for snappy UI rendering.
 *   → Background-refresh the cache from the API on every access.
 *   → Mutations automatically invalidate related cache entries.
 */

const CACHE_PREFIX = 'spars_cache_';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const TOKEN_STORAGE_KEY = 'edutrack_token';
const USER_STORAGE_KEY = 'edutrack_user';

function _getCacheNamespace() {
  try {
    const rawUser = sessionStorage.getItem(USER_STORAGE_KEY);
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user?.id != null) return `user:${user.id}`;
      if (user?.email) return `user:${user.email}`;
    }

    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) return `auth:${token.slice(0, 24)}`;
  } catch {
    // Ignore and use anonymous scope.
  }
  return 'anon';
}

function _buildCacheKey(url) {
  return `${CACHE_PREFIX}${_getCacheNamespace()}:${url}`;
}

/* ── Read ──────────────────────────────────────────────────────────────── */

/**
 * Retrieve cached API data for a given URL.
 * @param {string} url – full request URL used as cache key
 * @returns {*} cached data, or `null` if missing / expired
 */
export function cacheGet(url) {
  try {
    const scopedKey = _buildCacheKey(url);
    const legacyKey = CACHE_PREFIX + url;
    let raw = localStorage.getItem(scopedKey);

    // Backward-compatible read: migrate old unscoped cache entries.
    if (!raw) {
      raw = localStorage.getItem(legacyKey);
      if (raw) {
        localStorage.setItem(scopedKey, raw);
      }
    }

    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > MAX_AGE_MS) {
      localStorage.removeItem(scopedKey);
      localStorage.removeItem(legacyKey);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/* ── Write ─────────────────────────────────────────────────────────────── */

/**
 * Persist API data into localStorage for a given URL.
 * Handles quota errors by purging stale entries and retrying once.
 * @param {string} url
 * @param {*} data
 */
export function cacheSet(url, data) {
  const payload = JSON.stringify({ data, ts: Date.now() });
  try {
    localStorage.setItem(_buildCacheKey(url), payload);
  } catch {
    cachePurgeExpired();
    try {
      localStorage.setItem(_buildCacheKey(url), payload);
    } catch {
      // Storage still full – skip silently (cache is best-effort)
    }
  }
}

/* ── Invalidate ────────────────────────────────────────────────────────── */

/**
 * Remove all cache entries whose key contains the given substring.
 * @param {string} pattern – substring matched against the URL portion of each key
 */
export function cacheInvalidate(pattern) {
  try {
    const keys = _collectCacheKeys((key) => key.includes(pattern));
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore – invalidation is best-effort
  }
}

/**
 * Clear **all** API cache entries from localStorage.
 * Call this on logout to prevent stale data leaking across sessions.
 */
export function cacheClearAll() {
  try {
    const keys = _collectCacheKeys(() => true);
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore
  }
}

/* ── Maintenance ───────────────────────────────────────────────────────── */

/**
 * Remove cache entries older than MAX_AGE_MS.
 */
export function cachePurgeExpired() {
  try {
    const keys = _collectCacheKeys((_, raw) => {
      try {
        return Date.now() - JSON.parse(raw).ts > MAX_AGE_MS;
      } catch {
        return true; // corrupted entry – remove
      }
    });
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore
  }
}

/* ── Internal ──────────────────────────────────────────────────────────── */

/**
 * Iterate localStorage and collect cache keys that match a predicate.
 * @param {(key: string, value: string) => boolean} predicate
 * @returns {string[]}
 */
function _collectCacheKeys(predicate) {
  const result = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      const value = localStorage.getItem(key);
      if (predicate(key, value)) {
        result.push(key);
      }
    }
  }
  return result;
}
