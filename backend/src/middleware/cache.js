// Simple in-memory cache middleware for GET requests
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default

/**
 * Cache middleware for GET requests
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 */
function cacheMiddleware(ttl = CACHE_TTL) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.originalUrl || req.url}`;
    const cached = cache.get(key);

    if (cached && (Date.now() - cached.timestamp) < ttl) {
      // Return cached response
      return res.json(cached.data);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function (data) {
      // Cache the response
      cache.set(key, {
        data: JSON.parse(JSON.stringify(data)), // Deep clone
        timestamp: Date.now()
      });

      // Clean old cache entries periodically
      if (cache.size > 100) {
        const now = Date.now();
        for (const [k, v] of cache.entries()) {
          if (now - v.timestamp > ttl) {
            cache.delete(k);
          }
        }
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Clear cache for a specific key pattern
 */
function clearCache(pattern) {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

/**
 * Clear all cache
 */
function clearAllCache() {
  cache.clear();
}

module.exports = {
  cacheMiddleware,
  clearCache,
  clearAllCache
};

