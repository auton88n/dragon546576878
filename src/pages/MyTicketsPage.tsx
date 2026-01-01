import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Mail, Search, Ticket, Calendar, Clock, Users, QrCode, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface BookingWithTickets {
  id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  visit_date: string;
  visit_time: string;
  adult_count: number;
  child_count: number;
  senior_count: number | null;
  total_amount: number;
  booking_status: string;
  created_at: string;
  tickets: {
    id: string;
    ticket_code: string;
    ticket_type: string;
    qr_code_url: string | null;
    is_used: boolean;
  }[];
}

const createEmailSchema = (isArabic: boolean) => z.object({
  email: z.string()
    .email(isArabic ? 'البريد الإلكتروني غير صالح' : 'Invalid email address'),
});

type EmailFormValues = z.infer<ReturnType<typeof createEmailSchema>>;

const MyTicketsPage = () => {
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [bookings, setBookings] = useState<BookingWithTickets[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(createEmailSchema(isArabic)),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: EmailFormValues) => {
    setIsSearching(true);
    setHasSearched(false);
    setSearchError(null);

    try {
      // Fetch bookings by email
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_email', values.email.toLowerCase().trim())
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      if (!bookingsData || bookingsData.length === 0) {
        setBookings([]);
        setHasSearched(true);
        setIsSearching(false);
        return;
      }

      // Fetch tickets for each booking
      const bookingIds = bookingsData.map(b => b.id);
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .in('booking_id', bookingIds);

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
      }

      // Combine bookings with their tickets
      const bookingsWithTickets: BookingWithTickets[] = bookingsData.map(booking => ({
        ...booking,
        tickets: (ticketsData || []).filter(ticket => ticket.booking_id === booking.id),
      }));

      setBookings(bookingsWithTickets);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(isArabic ? 'حدث خطأ أثناء البحث' : 'An error occurred while searching');
    } finally {
      setIsSearching(false);
    }
  };

  const formatTimeDisplay = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (isArabic) {
      return hour < 12 ? `${hour}:00 ص` : `${hour === 12 ? 12 : hour - 12}:00 م`;
    }
    return hour < 12 ? `${hour}:00 AM` : `${hour === 12 ? 12 : hour - 12}:00 PM`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; labelAr: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      confirmed: { label: 'Confirmed', labelAr: 'مؤكد', variant: 'default' },
      pending: { label: 'Pending', labelAr: 'قيد الانتظار', variant: 'secondary' },
      cancelled: { label: 'Cancelled', labelAr: 'ملغي', variant: 'destructive' },
      completed: { label: 'Completed', labelAr: 'مكتمل', variant: 'outline' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant}>
        {isArabic ? config.labelAr : config.label}
      </Badge>
    );
  };

  const handleDownloadQR = (qrUrl: string, ticketCode: string) => {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `ticket-${ticketCode}.png`;
    link.click();
  };

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />

      <main className="flex-1 pt-24 md:pt-28 pb-8 md:pb-12 px-4 md:px-6 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-4 md:right-10 w-48 md:w-72 h-48 md:h-72 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-4 md:left-10 w-64 md:w-96 h-64 md:h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="container max-w-3xl relative z-10 px-0">
          {/* Page Header */}
          <div className="text-center mb-8 md:mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 mb-4 md:mb-6 border border-accent/20">
              <span className="icon-wrapper">
                <Ticket className="h-8 w-8 md:h-10 md:w-10 text-accent" aria-hidden="true" />
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 md:mb-3">
              {isArabic ? 'تذاكري' : 'My Tickets'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {isArabic 
                ? 'أدخل بريدك الإلكتروني لعرض تذاكرك'
                : 'Enter your email to view your tickets'}
            </p>
          </div>

          {/* Email Search Form */}
          <Card className="mb-8 glass-card border-accent/20">
            <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-accent/5 to-transparent">
              <CardTitle className="flex items-center gap-2 md:gap-3 text-base md:text-lg text-foreground">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="icon-wrapper">
                    <Search className="h-4 w-4 md:h-5 md:w-5 text-accent" aria-hidden="true" />
                  </span>
                </div>
                {isArabic ? 'البحث عن التذاكر' : 'Search Tickets'}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? 'أدخل البريد الإلكتروني الذي استخدمته للحجز'
                  : 'Enter the email you used for booking'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-foreground text-sm md:text-base">
                          <span className="icon-wrapper">
                            <Mail className="h-4 w-4 text-accent" aria-hidden="true" />
                          </span>
                          {isArabic ? 'البريد الإلكتروني' : 'Email Address'}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="example@email.com"
                            className="h-12 text-base bg-background/50 border-border/50 focus:border-accent transition-colors"
                            dir="ltr"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-lg hover:shadow-xl transition-all"
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                        {isArabic ? 'جاري البحث...' : 'Searching...'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="icon-wrapper">
                          <Search className="h-5 w-5" aria-hidden="true" />
                        </span>
                        {isArabic ? 'بحث' : 'Search'}
                      </span>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Error Message */}
          {searchError && (
            <Card className="mb-8 border-destructive/50 bg-destructive/10">
              <CardContent className="pt-6 text-center text-destructive">
                {searchError}
              </CardContent>
            </Card>
          )}

          {/* Content Area with stable min-height to prevent layout shifts */}
          <div className="min-h-[300px]">
            {/* Skeleton Loading State */}
            {isSearching && (
              <div className="space-y-6">
                {/* Skeleton for booking card */}
                <Card className="glass-card border-accent/20 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-accent/10 to-transparent border-b border-accent/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="h-6 w-32 bg-accent/10 rounded animate-pulse" />
                        <div className="h-4 w-24 bg-accent/5 rounded animate-pulse mt-2" />
                      </div>
                      <div className="h-6 w-20 bg-accent/10 rounded-full animate-pulse" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-3 w-12 bg-accent/5 rounded animate-pulse" />
                          <div className="h-5 w-20 bg-accent/10 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border pt-4">
                      <div className="h-4 w-16 bg-accent/5 rounded animate-pulse mb-3" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {[1, 2].map((i) => (
                          <div key={i} className="p-3 rounded-xl border bg-background border-accent/20">
                            <div className="w-full aspect-square rounded-lg bg-accent/5 animate-pulse mb-2" />
                            <div className="h-3 w-16 mx-auto bg-accent/5 rounded animate-pulse" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Results Area */}
            {hasSearched && !isSearching && (
              <div className="space-y-6 animate-fade-in">
                {bookings.length === 0 ? (
                  <Card className="glass-card border-accent/20">
                    <CardContent className="pt-6">
                      <div className="text-center py-8 md:py-12">
                        <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 rounded-full bg-muted/50 flex items-center justify-center">
                          <span className="icon-wrapper">
                            <Ticket className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground/40" aria-hidden="true" />
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          {isArabic ? 'لم يتم العثور على تذاكر' : 'No Tickets Found'}
                        </h3>
                        <p className="text-muted-foreground mb-8">
                          {isArabic 
                            ? 'لا توجد تذاكر مرتبطة بهذا البريد الإلكتروني'
                            : 'No tickets are associated with this email'}
                        </p>
                        <Link to="/book">
                          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                            <span className="icon-wrapper">
                              <Calendar className="h-4 w-4" aria-hidden="true" />
                            </span>
                            {isArabic ? 'احجز زيارة جديدة' : 'Book a New Visit'}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="text-sm text-muted-foreground mb-4">
                      {isArabic 
                        ? `تم العثور على ${bookings.length} حجز`
                        : `Found ${bookings.length} booking${bookings.length > 1 ? 's' : ''}`}
                    </div>
                    
                    {bookings.map((booking) => (
                      <Card key={booking.id} className="glass-card-gold border-accent/20 overflow-hidden">
                        {/* Booking Header */}
                        <CardHeader className="bg-gradient-to-r from-accent/10 to-transparent border-b border-accent/10">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <CardTitle className="text-lg font-mono text-accent">
                                {booking.booking_reference}
                              </CardTitle>
                              <CardDescription>
                                {isArabic ? 'رقم الحجز' : 'Booking Reference'}
                              </CardDescription>
                            </div>
                            {getStatusBadge(booking.booking_status)}
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-6">
                          {/* Booking Details */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div>
                              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {isArabic ? 'التاريخ' : 'Date'}
                              </div>
                              <div className="font-semibold text-foreground">
                                {format(new Date(booking.visit_date), 'd MMM yyyy', { 
                                  locale: isArabic ? ar : enUS 
                                })}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {isArabic ? 'الوقت' : 'Time'}
                              </div>
                              <div className="font-semibold text-foreground">
                                {formatTimeDisplay(booking.visit_time)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {isArabic ? 'التذاكر' : 'Tickets'}
                              </div>
                              <div className="font-semibold text-foreground">
                                {booking.adult_count + booking.child_count + (booking.senior_count || 0)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                                {isArabic ? 'المبلغ' : 'Amount'}
                              </div>
                              <div className="font-semibold text-accent">
                                {booking.total_amount} {isArabic ? 'ر.س' : 'SAR'}
                              </div>
                            </div>
                          </div>

                          {/* Tickets Grid */}
                          {booking.tickets.length > 0 && (
                            <div className="border-t border-border pt-4">
                              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <QrCode className="h-4 w-4 text-accent" />
                                {isArabic ? 'التذاكر' : 'Tickets'}
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {booking.tickets.map((ticket) => (
                                  <div 
                                    key={ticket.id} 
                                    className={`p-3 rounded-xl border text-center ${
                                      ticket.is_used 
                                        ? 'bg-muted/50 border-muted' 
                                        : 'bg-background border-accent/20'
                                    }`}
                                  >
                                    {ticket.qr_code_url ? (
                                      <img 
                                        src={ticket.qr_code_url} 
                                        alt={`Ticket ${ticket.ticket_code}`}
                                        className={`w-full aspect-square rounded-lg mb-2 ${ticket.is_used ? 'opacity-50' : ''}`}
                                      />
                                    ) : (
                                      <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center mb-2">
                                        <QrCode className="h-8 w-8 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="text-xs font-mono text-muted-foreground truncate">
                                      {ticket.ticket_code}
                                    </div>
                                    <Badge 
                                      variant={ticket.is_used ? 'secondary' : 'outline'} 
                                      className="mt-1 text-[10px]"
                                    >
                                      {ticket.is_used 
                                        ? (isArabic ? 'مستخدمة' : 'Used')
                                        : (isArabic 
                                            ? (ticket.ticket_type === 'adult' ? 'بالغ' : 'طفل')
                                            : ticket.ticket_type.charAt(0).toUpperCase() + ticket.ticket_type.slice(1)
                                          )
                                      }
                                    </Badge>
                                    {ticket.qr_code_url && !ticket.is_used && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="mt-2 w-full h-7 text-xs"
                                        onClick={() => handleDownloadQR(ticket.qr_code_url!, ticket.ticket_code)}
                                      >
                                        <Download className="h-3 w-3 mr-1" />
                                        {isArabic ? 'تحميل' : 'Download'}
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {booking.tickets.length === 0 && (
                            <div className="border-t border-border pt-4">
                              <p className="text-sm text-muted-foreground text-center py-4">
                                {isArabic 
                                  ? 'لم يتم إنشاء التذاكر بعد'
                                  : 'Tickets not yet generated'}
                              </p>
                            </div>
                          )}

                          {/* View Details Link */}
                          <div className="mt-4 pt-4 border-t border-border">
                            <Link to={`/confirmation/${booking.id}`}>
                              <Button variant="outline" className="w-full border-accent/30 hover:bg-accent/5">
                                {isArabic ? 'عرض تفاصيل الحجز' : 'View Booking Details'}
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Help Section */}
            {!hasSearched && !isSearching && (
              <div className="text-center glass-card p-6 md:p-8 rounded-xl border border-accent/10">
                <p className="text-muted-foreground mb-4 text-base md:text-lg">
                  {isArabic 
                    ? 'لم تحجز بعد؟'
                    : "Haven't booked yet?"}
                </p>
                <Link to="/book">
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 px-6 md:px-8 py-5 md:py-6 text-base md:text-lg">
                    <span className="icon-wrapper">
                      <Calendar className="h-5 w-5" aria-hidden="true" />
                    </span>
                    {isArabic ? 'احجز زيارتك الآن' : 'Book Your Visit Now'}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MyTicketsPage;
