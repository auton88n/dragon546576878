import { Search, Calendar, Filter } from 'lucide-react';
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isArabic ? 'بحث برقم الحجز أو اسم العميل...' : 'Search by reference or customer...'}
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10 rtl:pr-10 rtl:pl-3"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger className="w-full md:w-48">
            <Filter className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
            <SelectValue placeholder={isArabic ? 'الحالة' : 'Status'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isArabic ? 'الكل' : 'All'}</SelectItem>
            <SelectItem value="confirmed">{isArabic ? 'مؤكد' : 'Confirmed'}</SelectItem>
            <SelectItem value="pending">{isArabic ? 'معلق' : 'Pending'}</SelectItem>
            <SelectItem value="cancelled">{isArabic ? 'ملغي' : 'Cancelled'}</SelectItem>
          </SelectContent>
        </Select>

        {/* Date From */}
        <div className="relative">
          <Calendar className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
            className="pl-10 rtl:pr-10 rtl:pl-3 w-full md:w-40"
          />
        </div>

        {/* Date To */}
        <div className="relative">
          <Calendar className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
            className="pl-10 rtl:pr-10 rtl:pl-3 w-full md:w-40"
          />
        </div>

        {/* Reset */}
        <Button variant="outline" onClick={onReset}>
          {isArabic ? 'إعادة تعيين' : 'Reset'}
        </Button>
      </div>
    </div>
  );
};

export default BookingFilters;
