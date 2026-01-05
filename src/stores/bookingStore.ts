import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BookingFormState, TicketPricing } from '@/types';

interface PackageQuantity {
  packageId: string;
  quantity: number;
  adults: number;
  children: number;
  price: number;
}

interface BookingStore extends Omit<BookingFormState, 'visitTime'> {
  // Package quantities (multiple packages)
  packageQuantities: PackageQuantity[];
  
  // Actions - Now 2 steps only
  setStep: (step: 1 | 2) => void;
  setTickets: (type: 'adult' | 'child' | 'senior', count: number) => void;
  setPackageQuantity: (packageId: string, quantity: number, adults: number, children: number, price: number) => void;
  setPricing: (pricing: TicketPricing) => void;
  setVisitDate: (date: string) => void;
  setCustomerInfo: (info: Partial<BookingFormState['customerInfo']>) => void;
  setLanguage: (lang: 'ar' | 'en') => void;
  calculateTotal: () => void;
  reset: () => void;
  canProceed: () => boolean;
  getPackageQuantity: (packageId: string) => number;
}

const initialState: Omit<BookingFormState, 'visitTime'> & { packageQuantities: PackageQuantity[] } = {
  step: 1,
  packageQuantities: [],
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
          packageQuantities: [],
        }));
        get().calculateTotal();
      },

      setPackageQuantity: (packageId, quantity, adults, children, price) => {
        set((state) => {
          let newPackageQuantities = [...state.packageQuantities];
          const existingIndex = newPackageQuantities.findIndex(p => p.packageId === packageId);
          
          if (quantity <= 0) {
            // Remove package if quantity is 0
            newPackageQuantities = newPackageQuantities.filter(p => p.packageId !== packageId);
          } else if (existingIndex >= 0) {
            // Update existing
            newPackageQuantities[existingIndex] = { packageId, quantity, adults, children, price };
          } else {
            // Add new
            newPackageQuantities.push({ packageId, quantity, adults, children, price });
          }
          
          // Calculate totals from all packages
          let totalAdults = 0;
          let totalChildren = 0;
          let totalAmount = 0;
          
          newPackageQuantities.forEach(pkg => {
            totalAdults += pkg.adults * pkg.quantity;
            totalChildren += pkg.children * pkg.quantity;
            totalAmount += pkg.price * pkg.quantity;
          });
          
          return {
            packageQuantities: newPackageQuantities,
            tickets: { adult: totalAdults, child: totalChildren, senior: 0 },
            totalAmount,
          };
        });
      },

      getPackageQuantity: (packageId) => {
        const pkg = get().packageQuantities.find(p => p.packageId === packageId);
        return pkg?.quantity || 0;
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
            // Step 1: At least one package selected + Date selected
            return (
              state.packageQuantities.length > 0 &&
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
      version: 2,
      partialize: (state) => ({
        packageQuantities: state.packageQuantities,
        tickets: state.tickets,
        visitDate: state.visitDate ?? '',
        customerInfo: state.customerInfo,
        language: state.language,
      }),
      migrate: (persistedState, version) => {
        if (version < 2) {
          // Clear stale data on version upgrade
          return {
            packageQuantities: [] as PackageQuantity[],
            tickets: { adult: 0, child: 0, senior: 0 },
            visitDate: '',
            customerInfo: { name: '', email: '', phone: '', specialRequests: '' },
            language: 'ar' as const,
          };
        }
        return persistedState as {
          packageQuantities: PackageQuantity[];
          tickets: { adult: number; child: number; senior: number };
          visitDate: string;
          customerInfo: { name: string; email: string; phone: string; specialRequests?: string };
          language: 'ar' | 'en';
        };
      },
    }
  )
);
