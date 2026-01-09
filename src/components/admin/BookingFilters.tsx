import { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, Filter, RotateCcw, CreditCard, Download, CalendarDays, CalendarClock, AlertCircle } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface BookingFiltersState {
  search: string;
  status: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
  hideAbandoned: boolean;
}

interface BookingFiltersProps {
  filters: BookingFiltersState;
  onFiltersChange: (filters: BookingFiltersState) => void;
  onReset: () => void;
  onExport?: (format: 'csv' | 'excel') => void;
  exporting?: boolean;
}

const BookingFilters = ({ filters, onFiltersChange, onReset, onExport, exporting }: BookingFiltersProps) => {
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

  // Quick date filter handlers
  const handleQuickDate = (preset: 'today' | 'tomorrow' | 'thisWeek' | 'pastDue') => {
    const today = new Date();
    let dateFrom = '';
    let dateTo = '';

    switch (preset) {
      case 'today':
        dateFrom = format(today, 'yyyy-MM-dd');
        dateTo = format(today, 'yyyy-MM-dd');
        break;
      case 'tomorrow':
        const tomorrow = addDays(today, 1);
        dateFrom = format(tomorrow, 'yyyy-MM-dd');
        dateTo = format(tomorrow, 'yyyy-MM-dd');
        break;
      case 'thisWeek':
        dateFrom = format(startOfWeek(today, { weekStartsOn: 6 }), 'yyyy-MM-dd'); // Saturday
        dateTo = format(endOfWeek(today, { weekStartsOn: 6 }), 'yyyy-MM-dd');
        break;
      case 'pastDue':
        dateTo = format(addDays(today, -1), 'yyyy-MM-dd');
        onFiltersChange({ ...filters, dateFrom: '', dateTo, paymentStatus: 'pending' });
        return;
    }

    onFiltersChange({ ...filters, dateFrom, dateTo });
  };

  return (
    <div className="glass-card p-4 rounded-xl border border-accent/20 space-y-4">
      {/* Quick Date Filters */}
      <div className="flex flex-wrap gap-2 rtl:[direction:rtl]">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickDate('today')}
          className="border-accent/30 hover:bg-accent/10 hover:border-accent text-xs gap-1.5"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          {isArabic ? 'اليوم' : 'Today'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickDate('tomorrow')}
          className="border-accent/30 hover:bg-accent/10 hover:border-accent text-xs gap-1.5"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {isArabic ? 'غداً' : 'Tomorrow'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickDate('thisWeek')}
          className="border-accent/30 hover:bg-accent/10 hover:border-accent text-xs gap-1.5"
        >
          <Calendar className="h-3.5 w-3.5" />
          {isArabic ? 'هذا الأسبوع' : 'This Week'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickDate('pastDue')}
          className="border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500 text-amber-600 dark:text-amber-400 text-xs gap-1.5"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {isArabic ? 'متأخر الدفع' : 'Past Due'}
        </Button>
      </div>

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
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">
            {isArabic ? 'حالة الحجز' : 'Booking Status'}
          </label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
          >
            <SelectTrigger className="w-full lg:w-40 bg-background/50 border-border/50">
              <SelectValue placeholder={isArabic ? 'الكل' : 'All'} />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
              <SelectItem value="confirmed">{isArabic ? 'مؤكد' : 'Confirmed'}</SelectItem>
              <SelectItem value="pending">{isArabic ? 'معلق' : 'Pending'}</SelectItem>
              <SelectItem value="cancelled">{isArabic ? 'ملغي' : 'Cancelled'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Status Filter */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">
            {isArabic ? 'حالة الدفع' : 'Payment Status'}
          </label>
          <Select
            value={filters.paymentStatus}
            onValueChange={(value) => onFiltersChange({ ...filters, paymentStatus: value })}
          >
            <SelectTrigger className="w-full lg:w-44 bg-background/50 border-border/50">
              <SelectValue placeholder={isArabic ? 'الكل' : 'All'} />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
              <SelectItem value="pending">{isArabic ? 'في انتظار الدفع' : 'Awaiting Payment'}</SelectItem>
              <SelectItem value="completed">{isArabic ? 'مدفوع' : 'Paid'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">
            {isArabic ? 'من تاريخ' : 'From Date'}
          </label>
          <div className="relative">
            <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent pointer-events-none" />
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
              className="ps-10 w-full lg:w-40 bg-background/50 border-border/50 focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Date To */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">
            {isArabic ? 'إلى تاريخ' : 'To Date'}
          </label>
          <div className="relative">
            <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent pointer-events-none" />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
              className="ps-10 w-full lg:w-40 bg-background/50 border-border/50 focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Export Dropdown */}
        {onExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                disabled={exporting}
                className="border-accent/30 hover:bg-accent/10 hover:border-accent transition-colors gap-2"
              >
                <Download className="h-4 w-4" />
                {isArabic ? 'تصدير' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-card border-border">
              <DropdownMenuItem onClick={() => onExport('csv')} className="cursor-pointer">
                {isArabic ? 'تصدير CSV' : 'Export as CSV'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('excel')} className="cursor-pointer">
                {isArabic ? 'تصدير Excel' : 'Export as Excel'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

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