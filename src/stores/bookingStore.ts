import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BookingFormState, TicketPricing } from '@/types';

interface BookingStore extends Omit<BookingFormState, 'visitTime'> {
  // Actions - Now 2 steps only
  setStep: (step: 1 | 2) => void;
  setTickets: (type: 'adult' | 'child' | 'senior', count: number) => void;
  setPricing: (pricing: TicketPricing) => void;
  setVisitDate: (date: string) => void;
  setCustomerInfo: (info: Partial<BookingFormState['customerInfo']>) => void;
  setLanguage: (lang: 'ar' | 'en') => void;
  calculateTotal: () => void;
  reset: () => void;
  canProceed: () => boolean;
}

const initialState: Omit<BookingFormState, 'visitTime'> = {
  step: 1,
  tickets: {
    adult: 0,
    child: 0,
    senior: 0,
  },
  pricing: {
    adult: 40,
    child: 25,
    senior: 0,
  },
  visitDate: undefined,
  customerInfo: {
    name: '',
    email: '',
    phone: '',
    specialRequests: '',
  },
  language: 'ar',
  totalAmount: 0,
};

export const useBookingStore = create<BookingStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ step }),

      setTickets: (type, count) => {
        const newCount = Math.max(0, Math.min(10, count));
        set((state) => ({
          tickets: { ...state.tickets, [type]: newCount },
        }));
        get().calculateTotal();
      },

      setPricing: (pricing) => {
        set({ pricing });
        get().calculateTotal();
      },

      setVisitDate: (date) => set({ visitDate: date }),

      setCustomerInfo: (info) =>
        set((state) => ({
          customerInfo: { ...state.customerInfo, ...info },
        })),

      setLanguage: (language) => set({ language }),

      calculateTotal: () => {
        const { tickets, pricing } = get();
        const total =
          tickets.adult * pricing.adult +
          tickets.child * pricing.child +
          tickets.senior * pricing.senior;
        set({ totalAmount: total });
      },

      reset: () => set(initialState),

      canProceed: () => {
        const state = get();
        switch (state.step) {
          case 1:
            // Step 1: Tickets + Date selected (NO time required)
            return (
              state.tickets.adult + state.tickets.child + state.tickets.senior > 0 &&
              !!state.visitDate
            );
          case 2:
            // Step 2: Customer info valid
            return (
              state.customerInfo.name.length >= 3 &&
              /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.customerInfo.email) &&
              /^\+966[0-9]{9}$/.test(state.customerInfo.phone)
            );
          default:
            return false;
        }
      },
    }),
    {
      name: 'almufaijer-booking',
      partialize: (state) => ({
        tickets: state.tickets,
        visitDate: state.visitDate,
        customerInfo: state.customerInfo,
        language: state.language,
      }),
    }
  )
);
