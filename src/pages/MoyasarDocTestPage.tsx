/**
 * Moyasar Documentation Replica Test Page
 * This page matches the official Moyasar "Basic Integration" docs EXACTLY
 * to isolate whether the issue is code vs account/key configuration.
 * 
 * Docs: https://docs.moyasar.com/guides/card-payments/basic-integration/
 */

import { useEffect, useState } from 'react';
import { MOYASAR_PUBLISHABLE_KEY } from '@/lib/moyasarConfig';

export default function MoyasarDocTestPage() {
  const [status, setStatus] = useState<string>('Initializing...');
  const [apiError, setApiError] = useState<string | null>(null);
  const [configUsed, setConfigUsed] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    // Intercept fetch to capture Moyasar API errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0]?.toString() || '';
      try {
        const response = await originalFetch(...args);
        if (url.includes('moyasar.com') || url.includes('api.moyasar')) {
          const cloned = response.clone();
          try {
            const body = await cloned.text();
            console.log('[Moyasar API]', url, response.status, body);
            if (!response.ok) {
              setApiError(`Status ${response.status}: ${body.slice(0, 500)}`);
            }
          } catch (e) {
            console.log('[Moyasar API] Could not read body', e);
          }
        }
        return response;
      } catch (err) {
        if (url.includes('moyasar.com') || url.includes('api.moyasar')) {
          setApiError(`Network error: ${err}`);
        }
        throw err;
      }
    };

    // Wait for Moyasar SDK
    const checkMoyasar = setInterval(() => {
      if (typeof window.Moyasar !== 'undefined') {
        clearInterval(checkMoyasar);
        initMoyasar();
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(checkMoyasar);
      if (typeof window.Moyasar === 'undefined') {
        setStatus('ERROR: Moyasar SDK not loaded after 10s');
      }
    }, 10000);

    function initMoyasar() {
      setStatus('SDK loaded, calling Moyasar.init()...');

      // EXACT config from official docs (with our real key and callback)
      const origin = window.location.origin;
      const config = {
        element: '.mysr-form',
        amount: 1000, // 10.00 SAR in halalas - exact from docs
        currency: 'SAR',
        description: 'Coffee Order #1', // exact from docs
        publishable_api_key: MOYASAR_PUBLISHABLE_KEY,
        callback_url: `${origin}/payment-callback/test`,
        supported_networks: ['visa', 'mastercard', 'mada'] as const,
        methods: ['creditcard'] as const,
        on_completed: async function(payment: unknown) {
          console.log('[Doc Test] Payment completed:', payment);
          setStatus('Payment completed! Check console.');
        }
      };

      console.log('[Doc Test] Calling Moyasar.init with:', config);

      try {
        // Cast to any to bypass strict typing - we're testing raw docs config
        window.Moyasar.init(config as unknown as Parameters<typeof window.Moyasar.init>[0]);
        setStatus('Moyasar.init() called - form should render below');
      } catch (err) {
        console.error('[Doc Test] Moyasar.init error:', err);
        setStatus(`ERROR: ${err}`);
      }
    }

    return () => {
      clearInterval(checkMoyasar);
      clearTimeout(timeout);
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Moyasar Doc Replica Test</h1>
        <p className="text-muted-foreground">
          This page uses the EXACT config from Moyasar official docs.
          If this fails, the issue is account/key configuration, not our code.
        </p>

        {/* Status */}
        <div className="p-4 border rounded-lg bg-muted/50">
          <p className="font-mono text-sm"><strong>Status:</strong> {status}</p>
        </div>

        {/* API Error */}
        {apiError && (
          <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
            <p className="font-bold text-destructive">Moyasar API Error:</p>
            <pre className="text-xs overflow-auto mt-2">{apiError}</pre>
          </div>
        )}

        {/* Config Used */}
        {configUsed && (
          <div className="p-4 border rounded-lg bg-muted/30">
            <p className="font-bold mb-2">Config passed to Moyasar.init():</p>
            <pre className="text-xs overflow-auto">
              {JSON.stringify({
                ...configUsed,
                publishable_api_key: `${MOYASAR_PUBLISHABLE_KEY.slice(0, 10)}...${MOYASAR_PUBLISHABLE_KEY.slice(-4)}`
              }, null, 2)}
            </pre>
          </div>
        )}

        {/* The mount point - EXACT class from docs */}
        <div className="p-4 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground mb-4">Payment form renders below:</p>
          <div className="mysr-form"></div>
        </div>

        {/* Instructions */}
        <div className="p-4 border rounded-lg text-sm space-y-2">
          <p><strong>If form renders:</strong> The key/account is working. Issue is in booking-derived values.</p>
          <p><strong>If "Form configuration issue" appears:</strong> Check Moyasar dashboard:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Is the publishable key correct and active?</li>
            <li>Is the merchant account approved for card payments?</li>
            <li>Are there domain restrictions blocking {window.location.hostname}?</li>
            <li>Is SSL valid? (Live keys require valid SSL)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
