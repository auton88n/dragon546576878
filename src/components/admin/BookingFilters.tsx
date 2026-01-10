import { useState, useEffect } from 'react';
import { Search, Calendar, RotateCcw, Download, CalendarDays, CalendarClock, AlertCircle, EyeOff, ChevronDown, X, Filter } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
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

  // Count active filters (excluding defaults)
  const activeFilterCount = [
    filters.status !== 'all',
    filters.paymentStatus !== 'all',
    filters.dateFrom !== '',
    filters.dateTo !== '',
    filters.hideAbandoned,
  ].filter(Boolean).length;

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
        dateFrom = format(startOfWeek(today, { weekStartsOn: 6 }), 'yyyy-MM-dd');
        dateTo = format(endOfWeek(today, { weekStartsOn: 6 }), 'yyyy-MM-dd');
        break;
      case 'pastDue':
        dateTo = format(addDays(today, -1), 'yyyy-MM-dd');
        onFiltersChange({ ...filters, dateFrom: '', dateTo, paymentStatus: 'pending' });
        return;
    }

    onFiltersChange({ ...filters, dateFrom, dateTo });
  };

  // Get active filter chips for display
  const getActiveFilterChips = () => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    
    if (filters.status !== 'all') {
      const statusLabels: Record<string, { en: string; ar: string }> = {
        confirmed: { en: 'Confirmed', ar: 'مؤكد' },
        pending: { en: 'Pending', ar: 'معلق' },
        cancelled: { en: 'Cancelled', ar: 'ملغي' },
      };
      chips.push({
        key: 'status',
        label: isArabic ? statusLabels[filters.status]?.ar : statusLabels[filters.status]?.en,
        onRemove: () => onFiltersChange({ ...filters, status: 'all' }),
      });
    }
    
    if (filters.paymentStatus !== 'all') {
      const paymentLabels: Record<string, { en: string; ar: string }> = {
        pending: { en: 'Awaiting Payment', ar: 'في انتظار الدفع' },
        completed: { en: 'Paid', ar: 'مدفوع' },
      };
      chips.push({
        key: 'paymentStatus',
        label: isArabic ? paymentLabels[filters.paymentStatus]?.ar : paymentLabels[filters.paymentStatus]?.en,
        onRemove: () => onFiltersChange({ ...filters, paymentStatus: 'all' }),
      });
    }
    
    if (filters.dateFrom || filters.dateTo) {
      const dateLabel = filters.dateFrom && filters.dateTo 
        ? `${filters.dateFrom} → ${filters.dateTo}`
        : filters.dateFrom 
          ? `${isArabic ? 'من' : 'From'} ${filters.dateFrom}`
          : `${isArabic ? 'إلى' : 'To'} ${filters.dateTo}`;
      chips.push({
        key: 'date',
        label: dateLabel,
        onRemove: () => onFiltersChange({ ...filters, dateFrom: '', dateTo: '' }),
      });
    }
    
    if (filters.hideAbandoned) {
      chips.push({
        key: 'hideAbandoned',
        label: isArabic ? 'إخفاء المهجورة' : 'Hiding Abandoned',
        onRemove: () => onFiltersChange({ ...filters, hideAbandoned: false }),
      });
    }
    
    return chips;
  };

  const activeChips = getActiveFilterChips();

  return (
    <div className="glass-card p-3 rounded-xl border border-accent/20 space-y-3">
      {/* Row 1: Quick Date Chips + Search + Advanced Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Quick Date Presets */}
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDate('today')}
            className="h-8 px-2.5 border-accent/30 hover:bg-accent/10 hover:border-accent text-xs gap-1"
          >
            <CalendarDays className="h-3 w-3" />
            {isArabic ? 'اليوم' : 'Today'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDate('tomorrow')}
            className="h-8 px-2.5 border-accent/30 hover:bg-accent/10 hover:border-accent text-xs gap-1"
          >
            <CalendarClock className="h-3 w-3" />
            {isArabic ? 'غداً' : 'Tomorrow'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDate('thisWeek')}
            className="h-8 px-2.5 border-accent/30 hover:bg-accent/10 hover:border-accent text-xs gap-1"
          >
            <Calendar className="h-3 w-3" />
            {isArabic ? 'الأسبوع' : 'Week'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDate('pastDue')}
            className="h-8 px-2.5 border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500 text-amber-600 dark:text-amber-400 text-xs gap-1"
          >
            <AlertCircle className="h-3 w-3" />
            {isArabic ? 'متأخر' : 'Past Due'}
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isArabic ? 'بحث برقم الحجز أو الاسم...' : 'Search reference or name...'}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="h-8 ps-9 text-sm bg-background/50 border-border/50 focus:border-accent transition-colors"
          />
        </div>

        {/* Actions Row */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Advanced Filters Toggle */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 border-accent/30 hover:bg-accent/10 transition-colors",
                  isAdvancedOpen && "bg-accent/10 border-accent"
                )}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">{isArabic ? 'فلاتر' : 'Filters'}</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-4 w-4 p-0 text-[10px] bg-primary text-primary-foreground">
                    {activeFilterCount}
                  </Badge>
                )}
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  isAdvancedOpen && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>

          {/* Export Dropdown */}
          {onExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline"
                  size="sm"
                  disabled={exporting}
                  className="h-8 gap-1.5 border-accent/30 hover:bg-accent/10 hover:border-accent transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{isArabic ? 'تصدير' : 'Export'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border">
                <DropdownMenuItem onClick={() => onExport('csv')} className="cursor-pointer text-sm">
                  {isArabic ? 'تصدير CSV' : 'Export CSV'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('excel')} className="cursor-pointer text-sm">
                  {isArabic ? 'تصدير Excel' : 'Export Excel'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Reset */}
          <Button 
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isArabic ? 'مسح' : 'Clear'}</span>
          </Button>
        </div>
      </div>

      {/* Collapsible Advanced Filters */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-up-2 data-[state=open]:slide-down-2">
          <div className="pt-3 border-t border-border/30 space-y-3">
            {/* Status Filters Row - 2 columns */}
            <div className="grid grid-cols-2 gap-3">
              {/* Booking Status */}
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  {isArabic ? 'حالة الحجز' : 'Booking Status'}
                </label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
                >
                  <SelectTrigger className="h-8 text-sm bg-background/50 border-border/50">
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

              {/* Payment Status */}
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  {isArabic ? 'حالة الدفع' : 'Payment Status'}
                </label>
                <Select
                  value={filters.paymentStatus}
                  onValueChange={(value) => onFiltersChange({ ...filters, paymentStatus: value })}
                >
                  <SelectTrigger className="h-8 text-sm bg-background/50 border-border/50">
                    <SelectValue placeholder={isArabic ? 'الكل' : 'All'} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
                    <SelectItem value="pending">{isArabic ? 'في انتظار الدفع' : 'Awaiting Payment'}</SelectItem>
                    <SelectItem value="completed">{isArabic ? 'مدفوع' : 'Paid'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range Row - 2 columns */}
            <div className="grid grid-cols-2 gap-3">
              {/* Date From */}
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  {isArabic ? 'من تاريخ' : 'From Date'}
                </label>
                <div className="relative">
                  <Calendar className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                    className="h-8 ps-8 text-sm bg-background/50 border-border/50 focus:border-accent transition-colors"
                  />
                </div>
              </div>

              {/* Date To */}
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  {isArabic ? 'إلى تاريخ' : 'To Date'}
                </label>
                <div className="relative">
                  <Calendar className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                    className="h-8 ps-8 text-sm bg-background/50 border-border/50 focus:border-accent transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Hide Abandoned Toggle */}
            <div className="flex items-center gap-2.5 pt-1">
              <Switch
                id="hide-abandoned"
                checked={filters.hideAbandoned}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, hideAbandoned: checked })}
                className="scale-90"
              />
              <Label 
                htmlFor="hide-abandoned" 
                className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5"
              >
                <EyeOff className="h-3.5 w-3.5" />
                {isArabic ? 'إخفاء الحجوزات المهجورة' : 'Hide abandoned bookings'}
              </Label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {activeChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="h-6 gap-1 text-xs bg-accent/10 text-accent-foreground hover:bg-accent/20 transition-colors cursor-default"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="ml-0.5 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingFilters;
