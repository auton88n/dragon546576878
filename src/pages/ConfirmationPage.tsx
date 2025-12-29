import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import QRCode from 'qrcode';
import { CheckCircle, Download, Calendar, Clock, Users, Mail, Ticket, Home } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface BookingDetails {
  id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  visit_date: string;
  visit_time: string;
  adult_count: number;
  child_count: number;
  senior_count: number;
  total_amount: number;
}

const ConfirmationPage = () => {
  const { bookingId } = useParams();
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setError('Booking ID not found');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Booking not found');

        setBooking(data);

        // Generate QR Code
        const qrData = JSON.stringify({
          ref: data.booking_reference,
          date: data.visit_date,
          time: data.visit_time,
          tickets: data.adult_count + data.child_count + (data.senior_count || 0),
        });

        const qrUrl = await QRCode.toDataURL(qrData, {
          width: 300,
          margin: 2,
          color: {
            dark: '#2C2416',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'H',
        });
        setQrCodeUrl(qrUrl);

      } catch (err) {
        console.error('Error fetching booking:', err);
        setError(isArabic ? 'لم يتم العثور على الحجز' : 'Booking not found');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, isArabic]);

  const formatTimeDisplay = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (isArabic) {
      return hour < 12 ? `${hour}:00 ص` : `${hour === 12 ? 12 : hour - 12}:00 م`;
    }
    return hour < 12 ? `${hour}:00 AM` : `${hour === 12 ? 12 : hour - 12}:00 PM`;
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl || !booking) return;
    
    const link = document.createElement('a');
    link.download = `${booking.booking_reference}-qr.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                {isArabic ? 'خطأ' : 'Error'}
              </h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Link to="/">
                <Button>{isArabic ? 'العودة للرئيسية' : 'Back to Home'}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const totalTickets = booking.adult_count + booking.child_count + (booking.senior_count || 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-12">
        <div className="container max-w-2xl">
          {/* Success Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-4">
              <CheckCircle className="h-12 w-12 text-success animate-scale-in" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              {isArabic ? 'تم تأكيد حجزك!' : 'Booking Confirmed!'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {isArabic 
                ? 'شكراً لحجزك في سوق المفيجر'
                : 'Thank you for booking with Souq Almufaijer'}
            </p>
          </div>

          {/* Booking Reference */}
          <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">
                {isArabic ? 'رقم الحجز' : 'Booking Reference'}
              </p>
              <p className="text-3xl font-bold text-primary font-mono tracking-wider">
                {booking.booking_reference}
              </p>
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card className="mb-6">
            <CardContent className="p-8 flex flex-col items-center">
              <h3 className="text-lg font-semibold mb-4">
                {isArabic ? 'رمز الدخول' : 'Entry QR Code'}
              </h3>
              {qrCodeUrl && (
                <div className="p-4 bg-card rounded-xl border-2 shadow-inner">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code" 
                    className="w-64 h-64"
                  />
                </div>
              )}
              <Button 
                variant="outline" 
                className="mt-4 gap-2"
                onClick={handleDownloadQR}
              >
                <Download className="h-4 w-4" />
                {isArabic ? 'تحميل QR' : 'Download QR'}
              </Button>
              <p className="text-sm text-muted-foreground mt-3 text-center">
                {isArabic 
                  ? 'أظهر هذا الرمز عند الدخول'
                  : 'Show this code at the entrance'}
              </p>
            </CardContent>
          </Card>

          {/* Visit Details */}
          <Card className="mb-6">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                {isArabic ? 'تفاصيل الزيارة' : 'Visit Details'}
              </h3>
              
              <Separator />

              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'التاريخ' : 'Date'}
                    </p>
                    <p className="font-medium">
                      {format(new Date(booking.visit_date), 'PPP', { 
                        locale: isArabic ? ar : enUS 
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'الوقت' : 'Time'}
                    </p>
                    <p className="font-medium">
                      {formatTimeDisplay(booking.visit_time)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? 'عدد التذاكر' : 'Tickets'}
                    </p>
                    <p className="font-medium">
                      {totalTickets} {isArabic ? 'تذكرة' : `ticket${totalTickets > 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-semibold">
                  {isArabic ? 'المبلغ الإجمالي' : 'Total Amount'}
                </span>
                <span className="text-2xl font-bold text-primary">
                  {booking.total_amount} {isArabic ? 'ر.س' : 'SAR'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Email Notice */}
          <div className="flex items-center gap-3 p-4 bg-info/10 rounded-xl border border-info/20 mb-8">
            <Mail className="h-5 w-5 text-info shrink-0" />
            <p className="text-sm">
              {isArabic 
                ? `تم إرسال تأكيد الحجز والتذاكر إلى ${booking.customer_email}`
                : `Confirmation and tickets have been sent to ${booking.customer_email}`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/my-tickets">
              <Button size="lg" className="w-full sm:w-auto gap-2">
                <Ticket className="h-5 w-5" />
                {isArabic ? 'عرض تذاكري' : 'View My Tickets'}
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                <Home className="h-5 w-5" />
                {isArabic ? 'العودة للرئيسية' : 'Back to Home'}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ConfirmationPage;
