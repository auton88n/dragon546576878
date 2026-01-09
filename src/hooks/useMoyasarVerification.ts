import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MoyasarVerificationResult {
  moyasar: {
    totalPaid: number;
    paymentCount: number;
    currency: string;
    paymentMethods: Record<string, { count: number; amount: number }>;
  };
  database: {
    totalRevenue: number;
    bookingCount: number;
  };
  match: boolean;
  discrepancy: number;
  verifiedAt: string;
}

export const useMoyasarVerification = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MoyasarVerificationResult | null>(null);

  const verify = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-moyasar-totals');

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data as MoyasarVerificationResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify';
      setError(message);
      console.error('Moyasar verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  return { verify, loading, error, result };
};
