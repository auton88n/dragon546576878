import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import QRCode from 'qrcode';
import { 
  CheckCircle, Download, Calendar, Clock, Users, Mail, 
  Ticket, Home, MapPin, Sparkles, Share2, Plane
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';

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
  const [showConfetti, setShowConfetti] = useState(true);

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

        const qrData = JSON.stringify({
          ref: data.booking_reference,
          date: data.visit_date,
          time: data.visit_time,
          tickets: data.adult_count + data.child_count + (data.senior_count || 0),
        });

        const qrUrl = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'H',
        });
        setQrCodeUrl(qrUrl);

        // Hide confetti after animation
        setTimeout(() => setShowConfetti(false), 3000);

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

  const handleDownloadTicket = () => {
    if (!qrCodeUrl || !booking) return;
    const link = document.createElement('a');
    link.download = `${booking.booking_reference}-ticket.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const handleShare = async () => {
    if (!booking) return;
    const shareData = {
      title: isArabic ? 'تذكرة سوق المفيجر' : 'Souq Almufaijer Ticket',
      text: isArabic 
        ? `حجزي في سوق المفيجر - ${booking.booking_reference}`
        : `My booking at Souq Almufaijer - ${booking.booking_reference}`,
      url: window.location.href,
    };
    
    if (navigator.share) {
      await navigator.share(shareData);
    }
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
        <div className="flex-1 flex items-center justify-center pt-20">
          <div className="glass-card rounded-3xl p-8 text-center max-w-md mx-4">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {isArabic ? 'خطأ' : 'Error'}
            </h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link to="/">
              <Button className="gradient-bg text-white border-0">
                {isArabic ? 'العودة للرئيسية' : 'Back to Home'}
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const totalTickets = booking.adult_count + booking.child_count + (booking.senior_count || 0);

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-hidden">
      <Header />

      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#00d4aa', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <main className="flex-1 pt-24 pb-12">
        <div className="container max-w-2xl">
          {/* Success Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 rounded-full gradient-bg flex items-center justify-center animate-scale-in glow">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-accent animate-pulse" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              {isArabic ? 'تم تأكيد حجزك!' : 'Booking Confirmed!'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {isArabic 
                ? 'شكراً لحجزك في سوق المفيجر'
                : 'Thank you for booking with Souq Almufaijer'}
            </p>
          </div>

          {/* Boarding Pass Style Ticket */}
          <div className="relative mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {/* Main Ticket */}
            <div className="bg-card rounded-3xl overflow-hidden shadow-2xl border border-border">
              {/* Ticket Header */}
              <div className="gradient-bg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
                      م
                    </div>
                    <div>
                      <div className="font-bold text-lg">
                        {isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}
                      </div>
                      <div className="text-white/70 text-sm">
                        {isArabic ? 'تذكرة دخول' : 'Entry Pass'}
                      </div>
                    </div>
                  </div>
                  <Plane className="h-8 w-8 text-white/50 rotate-45" />
                </div>
              </div>

              {/* Ticket Body */}
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left Side - Details */}
                  <div className="flex-1 space-y-6">
                    {/* Booking Reference */}
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        {isArabic ? 'رقم الحجز' : 'Booking Reference'}
                      </div>
                      <div className="text-2xl font-bold font-mono gradient-text tracking-wider">
                        {booking.booking_reference}
                      </div>
                    </div>

                    {/* Guest Name */}
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        {isArabic ? 'اسم الزائر' : 'Guest Name'}
                      </div>
                      <div className="text-lg font-semibold text-foreground">
                        {booking.customer_name}
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    {/* Tickets & Location */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {isArabic ? 'التذاكر' : 'Tickets'}
                        </div>
                        <div className="font-semibold text-foreground">
                          {totalTickets} {isArabic ? 'تذكرة' : `ticket${totalTickets > 1 ? 's' : ''}`}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {isArabic ? 'الموقع' : 'Location'}
                        </div>
                        <div className="font-semibold text-foreground">
                          {isArabic ? 'المفيجر' : 'Almufaijer'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="hidden md:block w-px bg-border relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background" />
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background" />
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-border" />
                  </div>
                  
                  <div className="md:hidden h-px bg-border relative my-2">
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background" />
                    <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background" />
                  </div>

                  {/* Right Side - QR Code */}
                  <div className="flex flex-col items-center justify-center md:w-48">
                    {qrCodeUrl && (
                      <div className="p-3 bg-white rounded-2xl shadow-inner border-2 border-border">
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code" 
                          className="w-32 h-32 md:w-40 md:h-40"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      {isArabic ? 'امسح عند الدخول' : 'Scan at entrance'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ticket Footer */}
              <div className="bg-secondary/30 p-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Ticket className="h-4 w-4" />
                    <span>
                      {isArabic ? 'المبلغ المدفوع:' : 'Amount Paid:'}
                    </span>
                    <span className="font-bold text-foreground">
                      {booking.total_amount} {isArabic ? 'ر.س' : 'SAR'}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {isArabic ? 'تذكرة إلكترونية' : 'E-Ticket'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Button 
              onClick={handleDownloadTicket}
              className="flex-1 gap-2 gradient-bg text-white border-0 h-12 glow-hover"
            >
              <Download className="h-5 w-5" />
              {isArabic ? 'تحميل التذكرة' : 'Download Ticket'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleShare}
              className="flex-1 gap-2 h-12 border-2"
            >
              <Share2 className="h-5 w-5" />
              {isArabic ? 'مشاركة' : 'Share'}
            </Button>
          </div>

          {/* Email Notice */}
          <div 
            className="flex items-center gap-3 p-4 glass-card rounded-2xl mb-8 animate-slide-up" 
            style={{ animationDelay: '0.4s' }}
          >
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-accent" />
            </div>
            <p className="text-sm text-muted-foreground">
              {isArabic 
                ? `تم إرسال تأكيد الحجز والتذاكر إلى ${booking.customer_email}`
                : `Confirmation and tickets have been sent to ${booking.customer_email}`}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <Link to="/my-tickets">
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 border-2">
                <Ticket className="h-5 w-5" />
                {isArabic ? 'عرض تذاكري' : 'View My Tickets'}
              </Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="ghost" className="w-full sm:w-auto gap-2">
                <Home className="h-5 w-5" />
                {isArabic ? 'العودة للرئيسية' : 'Back to Home'}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />

      {/* Confetti Animation Styles */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ConfirmationPage;
