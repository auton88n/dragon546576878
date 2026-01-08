/**
 * Moyasar SDK Loader Utility
 * Ensures the SDK is loaded before payment initialization
 * Uses official jsDelivr CDN (v2.2.5) as per Moyasar documentation
 */

const SDK_JS_URL = 'https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.5/dist/moyasar.umd.min.js';
const SDK_CSS_URL = 'https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.5/dist/moyasar.css';
const LOAD_TIMEOUT_MS = 10000;

interface LoadResult {
  success: boolean;
  error?: string;
  source: 'already_loaded' | 'dynamic_injection';
}

/**
 * Check if Moyasar SDK is already available
 */
export function isMoyasarLoaded(): boolean {
  return typeof window.Moyasar !== 'undefined' && typeof window.Moyasar.init === 'function';
}

/**
 * Inject CSS if not already present
 */
function ensureCssLoaded(): void {
  const existingLink = document.querySelector(`link[href*="moyasar"]`);
  if (existingLink) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = SDK_CSS_URL;
  document.head.appendChild(link);
}

/**
 * Load Moyasar SDK dynamically
 * Returns a promise that resolves when SDK is ready or rejects with error
 */
export async function loadMoyasarSdk(): Promise<LoadResult> {
  // Already loaded from index.html
  if (isMoyasarLoaded()) {
    console.log('Moyasar SDK already loaded');
    return { success: true, source: 'already_loaded' };
  }

  // Ensure CSS is loaded
  ensureCssLoaded();

  return new Promise((resolve, reject) => {
    // Check if script tag already exists
    const existingScript = document.querySelector(`script[src*="moyasar"]`);
    if (existingScript) {
      // Script exists but SDK not ready - wait for it
      let attempts = 0;
      const maxAttempts = 50;
      const checkInterval = setInterval(() => {
        attempts++;
        if (isMoyasarLoaded()) {
          clearInterval(checkInterval);
          resolve({ success: true, source: 'already_loaded' });
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error('Moyasar script exists but SDK never became available'));
        }
      }, 200);
      return;
    }

    // Inject script dynamically
    const script = document.createElement('script');
    script.src = SDK_JS_URL;
    script.async = true;

    const timeout = setTimeout(() => {
      reject(new Error(`Moyasar SDK load timeout (${LOAD_TIMEOUT_MS}ms)`));
    }, LOAD_TIMEOUT_MS);

    script.onload = () => {
      clearTimeout(timeout);
      // Small delay to ensure SDK initializes
      setTimeout(() => {
        if (isMoyasarLoaded()) {
          console.log('Moyasar SDK loaded via dynamic injection');
          resolve({ success: true, source: 'dynamic_injection' });
        } else {
          reject(new Error('Script loaded but Moyasar object not defined'));
        }
      }, 100);
    };

    script.onerror = (event) => {
      clearTimeout(timeout);
      const errorMsg = navigator.onLine 
        ? 'Failed to load Moyasar SDK - may be blocked by CSP or ad blocker'
        : 'Failed to load Moyasar SDK - no internet connection';
      console.error('Moyasar script onerror:', event);
      reject(new Error(errorMsg));
    };

    document.head.appendChild(script);
  });
}

/**
 * Get diagnostic info about SDK loading state
 */
export function getMoyasarDiagnostics(): Record<string, unknown> {
  return {
    sdkLoaded: isMoyasarLoaded(),
    moyasarType: typeof window.Moyasar,
    hasInit: typeof window.Moyasar?.init === 'function',
    online: navigator.onLine,
    scriptTags: document.querySelectorAll('script[src*="moyasar"]').length,
    cssTags: document.querySelectorAll('link[href*="moyasar"]').length,
    hostname: window.location.hostname,
    timestamp: new Date().toISOString(),
  };
}
