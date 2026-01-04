import { useCallback, useEffect, useState } from 'react';

const SITE_KEY = '6LfhSD8sAAAAAIYaRildhQMwk_lVy6XtnWvddvj3';
const ALLOWED_DOMAINS = ['almufaijer.com', 'www.almufaijer.com'];

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

function isAllowedDomain(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return ALLOWED_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain));
}

function loadRecaptchaScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.grecaptcha) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(`script[src*="recaptcha/api.js"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA'));
    document.head.appendChild(script);
  });
}

export function useRecaptcha() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const allowed = isAllowedDomain();
    setIsAllowed(allowed);

    if (allowed) {
      loadRecaptchaScript()
        .then(() => setIsLoaded(true))
        .catch((err) => console.warn('reCAPTCHA load error:', err));
    }
  }, []);

  const executeRecaptcha = useCallback(async (action: string): Promise<string | null> => {
    // Skip reCAPTCHA on non-production domains
    if (!isAllowed) {
      console.info('reCAPTCHA skipped: not on allowed domain');
      return null;
    }

    if (!isLoaded || !window.grecaptcha) {
      console.warn('reCAPTCHA not loaded yet');
      return null;
    }

    return new Promise((resolve) => {
      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha.execute(SITE_KEY, { action });
          resolve(token);
        } catch (error) {
          console.error('reCAPTCHA error:', error);
          resolve(null);
        }
      });
    });
  }, [isLoaded, isAllowed]);

  return { executeRecaptcha, isLoaded, isAllowed };
}
