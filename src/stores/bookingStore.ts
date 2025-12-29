import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BookingFormState, TicketPricing } from '@/types';

interface BookingStore extends BookingFormState {
  // Actions
  setStep: (step: 1 | 2 | 3 | 4) => void;
  setTickets: (type: 'adult' | 'child' | 'senior', count: number) => void;
  setPricing: (pricing: TicketPricing) => void;
  setVisitDate: (date: string) => void;
  setVisitTime: (time: string) => void;
  setCustomerInfo: (info: Partial<BookingFormState['customerInfo']>) => void;
  setLanguage: (lang: 'ar' | 'en') => void;
  calculateTotal: () => void;
  reset: () => void;
  canProceed: () => boolean;
}

const initialState: BookingFormState = {
  step: 1,
  tickets: {
    adult: 0,
    child: 0,
    senior: 0,
  },
  pricing: {
    adult: 100,
    child: 50,
    senior: 75,
  },
  visitDate: undefined,
  visitTime: undefined,
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
        const newCount = Math.max(0, Math.min(10, count)); // Max 10 per type
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

      setVisitTime: (time) => set({ visitTime: time }),

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
            return state.tickets.adult + state.tickets.child + state.tickets.senior > 0;
          case 2:
            return !!state.visitDate && !!state.visitTime;
          case 3:
            return (
              state.customerInfo.name.length >= 3 &&
              /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.customerInfo.email) &&
              /^\+966[0-9]{9}$/.test(state.customerInfo.phone)
            );
          case 4:
            return state.totalAmount > 0;
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
        visitTime: state.visitTime,
        customerInfo: state.customerInfo,
        language: state.language,
      }),
    }
  )
);
