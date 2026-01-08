/**
 * Moyasar Configuration Builder
 * Centralized, documentation-compliant config for all payment entry points
 * SDK: moyasar-payment-form v2.2.5
 */

import type { MoyasarConfig, MoyasarPayment, MoyasarError } from '@/types/moyasar.d';

export const MOYASAR_PUBLISHABLE_KEY = 'pk_live_Ah7AU1kvj5r64sAV369hkXhVuNi6bmAmVt1Pf1ZN';
export const PRODUCTION_DOMAIN = 'https://almufaijer.com';
export const ALLOWED_DOMAINS = ['almufaijer.com', 'tickets.almufaijer.com', 'localhost'];

export interface MoyasarConfigParams {
  mountSelector: string;
  amountInHalalas: number;
  bookingId: string;
  bookingReference: string;
  isArabic: boolean;
  onSubmissionStart?: () => void;
  onCompleted: (payment: MoyasarPayment) => void;
  onFailure: (error: MoyasarError) => void;
}

/**
 * Build a Moyasar config object that matches official MPF v2.2.5 documentation
 */
export function buildMoyasarConfig(params: MoyasarConfigParams): MoyasarConfig {
  const {
    mountSelector,
    amountInHalalas,
    bookingId,
    bookingReference,
    isArabic,
    onSubmissionStart,
    onCompleted,
    onFailure,
  } = params;

  const callbackUrl = `${PRODUCTION_DOMAIN}/payment-callback/${bookingId}`;

  return {
    element: mountSelector,
    amount: amountInHalalas,
    currency: 'SAR',
    description: `Souq Almufaijer Ticket - ${bookingReference}`,
    publishable_api_key: MOYASAR_PUBLISHABLE_KEY,
    callback_url: callbackUrl,
    methods: ['creditcard'],
    // Use only widely-supported networks (amex can cause issues with some issuers)
    supported_networks: ['visa', 'mastercard', 'mada'],
    language: isArabic ? 'ar' : 'en',
    fixed_width: true,
    on_initiating: () => {
      console.log('Payment form initiating for booking:', bookingId);
      if (onSubmissionStart) {
        onSubmissionStart();
      }
      return true; // Proceed with payment
    },
    on_completed: onCompleted,
    on_failure: onFailure,
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
 * Get user-friendly error message from Moyasar error
 */
export function getPaymentErrorMessage(
  isArabic: boolean,
  errorType?: string,
  errorCode?: string,
  errorMessage?: string
): string {
  const errorMessages: Record<string, { en: string; ar: string }> = {
    rejected: { en: 'Card was declined by your bank', ar: 'تم رفض البطاقة من قبل البنك' },
    insufficient_funds: { en: 'Insufficient funds', ar: 'رصيد غير كافٍ' },
    expired_card: { en: 'Card has expired', ar: 'البطاقة منتهية الصلاحية' },
    invalid_card: { en: 'Invalid card details', ar: 'تفاصيل البطاقة غير صحيحة' },
    processing_error: { en: 'Payment processing error. Please try again.', ar: 'خطأ في معالجة الدفع. يرجى المحاولة مرة أخرى.' },
    '3ds_failed': { en: '3D Secure verification failed', ar: 'فشل التحقق الأمني' },
    cancelled: { en: 'Payment was cancelled', ar: 'تم إلغاء الدفع' },
    timeout: { en: 'Payment timed out. Please try again.', ar: 'انتهت مهلة الدفع. يرجى المحاولة مرة أخرى.' },
    network_error: { en: 'Network error. Check your connection.', ar: 'خطأ في الشبكة. تحقق من اتصالك.' },
    configuration: { en: 'Payment form configuration error', ar: 'خطأ في إعدادات نموذج الدفع' },
  };
  
  const key = errorCode || errorType || '';
  const mapped = errorMessages[key.toLowerCase()];
  if (mapped) return isArabic ? mapped.ar : mapped.en;
  
  return errorMessage || (isArabic ? 'حدث خطأ في عملية الدفع' : 'An error occurred during payment');
}

/**
 * Handle 3DS redirect or direct completion
 */
export function handlePaymentCompletion(
  payment: MoyasarPayment,
  bookingId: string,
  setTransactionUrl?: (url: string) => void
): void {
  console.log('Payment completed:', payment.id, payment.status, payment.source?.transaction_url);
  
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
  const redirectUrl = `${PRODUCTION_DOMAIN}/payment-callback/${bookingId}?id=${payment.id}&status=${payment.status}`;
  window.location.href = redirectUrl;
}
