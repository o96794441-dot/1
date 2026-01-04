// Rate Limiter for API endpoints
// Prevents brute force attacks and abuse

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const key in store) {
        if (store[key].resetTime < now) {
            delete store[key];
        }
    }
}, 5 * 60 * 1000);

interface RateLimitConfig {
    windowMs: number;  // Time window in milliseconds
    maxRequests: number;  // Max requests per window
}

export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 }
): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const key = identifier;

    if (!store[key] || store[key].resetTime < now) {
        store[key] = {
            count: 1,
            resetTime: now + config.windowMs,
        };
        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetIn: config.windowMs,
        };
    }

    store[key].count++;

    if (store[key].count > config.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetIn: store[key].resetTime - now,
        };
    }

    return {
        allowed: true,
        remaining: config.maxRequests - store[key].count,
        resetIn: store[key].resetTime - now,
    };
}

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
    login: { windowMs: 15 * 60 * 1000, maxRequests: 5 },  // 5 attempts per 15 minutes
    register: { windowMs: 60 * 60 * 1000, maxRequests: 3 },  // 3 registrations per hour
    api: { windowMs: 60 * 1000, maxRequests: 60 },  // 60 requests per minute
};
