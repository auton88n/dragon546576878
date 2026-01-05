interface RateLimitConfig {
  key: string;
  maxAttempts: number;
  windowMinutes: number;
}

interface RateLimitResult {
  allowed: boolean;
  remainingMinutes?: number;
}

export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const storageKey = `rate_limit_${config.key}`;
  const stored = localStorage.getItem(storageKey);
  const now = Date.now();
  
  let attempts: number[] = stored ? JSON.parse(stored) : [];
  
  // Filter to only recent attempts within window
  const windowMs = config.windowMinutes * 60 * 1000;
  attempts = attempts.filter(t => now - t < windowMs);
  
  // Update storage with filtered attempts
  localStorage.setItem(storageKey, JSON.stringify(attempts));
  
  if (attempts.length >= config.maxAttempts) {
    const oldestAttempt = Math.min(...attempts);
    const remainingMs = windowMs - (now - oldestAttempt);
    return { 
      allowed: false, 
      remainingMinutes: Math.ceil(remainingMs / 60000) 
    };
  }
  
  return { allowed: true };
}

export function recordAttempt(key: string) {
  const storageKey = `rate_limit_${key}`;
  const stored = localStorage.getItem(storageKey);
  const attempts: number[] = stored ? JSON.parse(stored) : [];
  attempts.push(Date.now());
  localStorage.setItem(storageKey, JSON.stringify(attempts));
}

// Rate limit configurations
export const RATE_LIMITS = {
  CONTACT_FORM: { key: 'contact_form', maxAttempts: 10, windowMinutes: 15 },
  GROUP_BOOKING: { key: 'group_booking', maxAttempts: 5, windowMinutes: 60 },
  SUPPORT_TRANSFER: { key: 'support_transfer', maxAttempts: 2, windowMinutes: 30 },
} as const;
