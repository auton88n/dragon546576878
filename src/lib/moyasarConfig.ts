/**
 * Moyasar Configuration Builder
 * MINIMAL config matching official docs exactly to avoid "Form configuration issue"
 * SDK: moyasar-payment-form v2.2.5
 */

import type { MoyasarPayment } from '@/types/moyasar.d';

export const MOYASAR_PUBLISHABLE_KEY = 'pk_live_Ah7AU1kvj5r64sAV369hkXhVuNi6bmAmVt1Pf1ZN';
export const ALLOWED_DOMAINS = ['almufaijer.com', 'tickets.almufaijer.com', 'localhost'];

export interface MoyasarConfigParams {
  mountSelector: string;
  amountInHalalas: number;
  bookingId: string;
  bookingReference: string;
  onCompleted: (payment: MoyasarPayment) => Promise<void> | void;
}

/**
 * Build MINIMAL Moyasar config - ONLY required fields per official docs
 * NO optional fields (language, on_initiating, on_failure) to prevent config rejection
 */
export function buildMoyasarConfig(params: MoyasarConfigParams) {
  const {
    mountSelector,
    amountInHalalas,
    bookingId,
    bookingReference,
    onCompleted,
  } = params;

  // Use current origin for callback (handles almufaijer.com vs tickets.almufaijer.com)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://almufaijer.com';
  const callbackUrl = `${origin}/payment-callback/${bookingId}`;

  // Config matching official Moyasar docs EXACTLY
  return {
    element: mountSelector,
    amount: amountInHalalas,
    currency: 'SAR',
    description: `Souq Almufaijer - ${bookingReference}`,
    publishable_api_key: MOYASAR_PUBLISHABLE_KEY,
    callback_url: callbackUrl,
    methods: ['creditcard'],
    supported_networks: ['visa', 'mastercard', 'mada'],
    on_completed: onCompleted,
  };
}

/**
 * Check if current hostname is allowed for real payments
 */
export function isAllowedPaymentDomain(): boolean {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  return ALLOWED_DOMAINS.some(d => hostname.includes(d) || hostname === 'localhost');
}

/**
 * Get user-friendly error message
 */
export function getPaymentErrorMessage(isArabic: boolean, errorMessage?: string): string {
  return errorMessage || (isArabic ? 'حدث خطأ في عملية الدفع' : 'An error occurred during payment');
}

/**
 * Handle payment completion - redirect to callback or 3DS
 */
export function handlePaymentCompletion(
  payment: MoyasarPayment,
  bookingId: string,
  setTransactionUrl?: (url: string) => void
): void {
  console.log('Payment completed:', payment.id, payment.status, payment.source?.transaction_url);
  
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://almufaijer.com';
  
  // Handle 3D Secure / bank verification
  if (payment.status === 'initiated' && payment.source?.transaction_url) {
    console.log('3DS required, redirecting to:', payment.source.transaction_url);
    if (setTransactionUrl) {
      setTransactionUrl(payment.source.transaction_url);
    }
    window.location.href = payment.source.transaction_url;
    return;
  }
  
  // Payment completed - redirect to callback
  console.log('Payment completed, redirecting to callback');
  const redirectUrl = `${origin}/payment-callback/${bookingId}?id=${payment.id}&status=${payment.status}`;
  window.location.href = redirectUrl;
}
