import { format, subDays } from 'date-fns';
import type {
  ReportData,
  DailyStats,
  PaymentMethodStats,
  PaymentStatusStats,
  DeclineReasonStats,
} from '@/hooks/useReportData';

// Deterministic pseudo-random based on a string seed (so charts look the same on every refresh)
const seededRandom = (seed: string): number => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Map to [0,1)
  return ((h >>> 0) % 100000) / 100000;
};

const generateDailyStats = (days: number): DailyStats[] => {
  const stats: DailyStats[] = [];
  const baseRevenue = 95000;
  const baseBookings = 700;
  const baseVisitors = 2400;

  for (let i = 0; i < days; i++) {
    const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
    const day = new Date(date).getDay(); // 0 Sun .. 6 Sat
    // Friday/Saturday boost (5/6 are weekend in many locales; KSA weekend Fri/Sat)
    const weekendBoost = day === 5 || day === 6 ? 1.35 : 1.0;
    // Mild weekly oscillation
    const wave = 1 + 0.08 * Math.sin((i / days) * Math.PI * 2 * 3);
    // Deterministic jitter ±10%
    const jitter = 0.9 + seededRandom(date) * 0.2;

    const revenue = Math.round(baseRevenue * weekendBoost * wave * jitter);
    const bookings = Math.round(baseBookings * weekendBoost * wave * jitter);
    const visitors = Math.round(baseVisitors * weekendBoost * wave * jitter);

    stats.push({ date, revenue, bookings, visitors });
  }

  return stats;
};

export const getShowcaseReportData = (days: number): ReportData => {
  const dailyStats = generateDailyStats(days);

  const paymentMethods: PaymentMethodStats[] = [
    { method: 'mada', count: 8210, amount: 1275400 },
    { method: 'creditcard', count: 6520, amount: 988300 },
    { method: 'applepay', count: 2940, amount: 445200 },
    { method: 'stcpay', count: 830, amount: 131100 },
  ];

  const paymentStatus: PaymentStatusStats = {
    completed: 17840,
    pending: 445,
    failed: 215,
  };

  const declineReasons: DeclineReasonStats[] = [
    { reason: 'rejected', count: 86 },
    { reason: 'insufficient_funds', count: 54 },
    { reason: '3ds_failed', count: 31 },
    { reason: 'expired_card', count: 22 },
    { reason: 'processing_error', count: 14 },
    { reason: 'network_error', count: 8 },
  ];

  return {
    dailyStats,
    totalRevenue: 2840000,
    totalBookings: 18500,
    totalVisitors: 62400,
    averageBookingValue: 2840000 / 18500,
    paymentMethods,
    paymentStatus,
    declineReasons,
  };
};

export interface ShowcaseVerificationResult {
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

export const getShowcaseVerification = (): ShowcaseVerificationResult => ({
  moyasar: {
    totalPaid: 2838750,
    paymentCount: 18492,
    currency: 'SAR',
    paymentMethods: {
      mada: { count: 8208, amount: 1275000 },
      creditcard: { count: 6518, amount: 988050 },
      applepay: { count: 2938, amount: 444900 },
      stcpay: { count: 828, amount: 130800 },
    },
  },
  database: {
    totalRevenue: 2840000,
    bookingCount: 18500,
  },
  match: false,
  discrepancy: 1250,
  verifiedAt: new Date().toISOString(),
});
