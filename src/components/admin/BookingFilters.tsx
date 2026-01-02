import { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, Filter, RotateCcw, CreditCard } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface BookingFiltersState {
  search: string;
  status: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
}

interface BookingFiltersProps {
  filters: BookingFiltersState;
  onFiltersChange: (filters: BookingFiltersState) => void;
  onReset: () => void;
}

const BookingFilters = ({ filters, onFiltersChange, onReset }: BookingFiltersProps) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  
  // Local state for debounced search
  const [localSearch, setLocalSearch] = useState(filters.search);
  
  // Sync local state when filters.search changes externally (e.g., reset)
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);
  
  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFiltersChange({ ...filters, search: localSearch });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  return (
    <div className="glass-card p-4 rounded-xl border border-accent/20">
      <div className="flex flex-col lg:flex-row gap-4 rtl:[direction:rtl]">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
          <Input
            placeholder={isArabic ? 'بحث برقم الحجز أو اسم العميل...' : 'Search by reference or customer...'}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="ps-10 bg-background/50 border-border/50 focus:border-accent transition-colors text-start"
          />
        </div>

        {/* Booking Status Filter */}
        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger className="w-full lg:w-40 bg-background/50 border-border/50">
            <Filter className="h-4 w-4 me-2 text-accent" />
            <SelectValue placeholder={isArabic ? 'الحالة' : 'Status'} />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
            <SelectItem value="confirmed">{isArabic ? 'مؤكد' : 'Confirmed'}</SelectItem>
            <SelectItem value="pending">{isArabic ? 'معلق' : 'Pending'}</SelectItem>
            <SelectItem value="cancelled">{isArabic ? 'ملغي' : 'Cancelled'}</SelectItem>
          </SelectContent>
        </Select>

        {/* Payment Status Filter */}
        <Select
          value={filters.paymentStatus}
          onValueChange={(value) => onFiltersChange({ ...filters, paymentStatus: value })}
        >
          <SelectTrigger className="w-full lg:w-44 bg-background/50 border-border/50">
            <CreditCard className="h-4 w-4 me-2 text-accent" />
            <SelectValue placeholder={isArabic ? 'الدفع' : 'Payment'} />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
            <SelectItem value="pending">{isArabic ? 'في انتظار الدفع' : 'Awaiting Payment'}</SelectItem>
            <SelectItem value="completed">{isArabic ? 'مدفوع' : 'Paid'}</SelectItem>
          </SelectContent>
        </Select>

        {/* Date From */}
        <div className="relative">
          <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent pointer-events-none" />
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
            className="ps-10 w-full lg:w-44 bg-background/50 border-border/50 focus:border-accent transition-colors"
          />
        </div>

        {/* Date To */}
        <div className="relative">
          <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent pointer-events-none" />
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
            className="ps-10 w-full lg:w-44 bg-background/50 border-border/50 focus:border-accent transition-colors"
          />
        </div>

        {/* Reset */}
        <Button 
          variant="outline" 
          onClick={onReset}
          className="border-accent/30 hover:bg-accent/10 hover:border-accent transition-colors gap-2 rtl:flex-row-reverse"
        >
          <RotateCcw className="h-4 w-4" />
          {isArabic ? 'إعادة تعيين' : 'Reset'}
        </Button>
      </div>
    </div>
  );
};

export default BookingFilters;
