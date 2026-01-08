// Moyasar Payment Form SDK v2.2.5 Type Definitions
// Based on official documentation: https://docs.moyasar.com/

declare global {
  interface Window {
    Moyasar: {
      init: (config: MoyasarConfig) => MoyasarInstance;
    };
  }
}

export interface MoyasarConfig {
  element: string;
  amount: number; // Amount in halalas (smallest currency unit)
  currency: string;
  description: string;
  publishable_api_key: string;
  callback_url: string;
  methods: ('creditcard' | 'applepay' | 'stcpay' | 'samsungpay')[];
  apple_pay?: {
    country: string;
    label: string;
    validate_merchant_url: string;
  };
  credit_card?: {
    save_card?: boolean;
    verify?: boolean;
  };
  // on_initiating can return boolean, override object, or Promise
  on_initiating?: () => boolean | MoyasarInitiatingOverride | Promise<boolean | MoyasarInitiatingOverride> | void;
  on_completed?: (payment: MoyasarPayment) => void;
  on_failure?: (error: MoyasarError) => void;
  fixed_width?: boolean;
  language?: string; // 'ar', 'en', 'fr', etc.
  supported_networks?: ('visa' | 'mastercard' | 'mada' | 'amex')[];
  metadata?: Record<string, unknown>;
}

export interface MoyasarInitiatingOverride {
  amount?: number;
  description?: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
}

export interface MoyasarPayment {
  id: string;
  status: 'initiated' | 'paid' | 'failed' | 'authorized' | 'captured' | 'refunded' | 'voided';
  amount: number;
  fee: number;
  currency: string;
  refunded: number;
  refunded_at: string | null;
  captured: number;
  captured_at: string | null;
  voided_at: string | null;
  description: string;
  amount_format: string;
  fee_format: string;
  refunded_format: string;
  captured_format: string;
  invoice_id: string | null;
  ip: string | null;
  callback_url: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
  source: {
    type: 'creditcard' | 'applepay' | 'stcpay' | 'samsungpay';
    company: string;
    name: string;
    number: string;
    message: string | null;
    transaction_url: string | null;
    gateway_id: string;
    reference_number: string | null;
    token: string | null;
  };
}

export interface MoyasarError {
  type: string;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface MoyasarInstance {
  // The instance doesn't expose many methods - it's primarily event-driven
}

export {};
