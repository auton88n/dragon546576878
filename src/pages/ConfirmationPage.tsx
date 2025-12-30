import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import QRCode from 'qrcode';
import { 
  CheckCircle, Download, Calendar, Clock, Users, Mail, 
  Ticket, Home, MapPin, Sparkles, Share2, RefreshCw, QrCode
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { resendConfirmationEmail } from '@/lib/emailService';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

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
  confirmation_email_sent: boolean;
}

interface TicketDetails {
  id: string;
  ticket_code: string;
  ticket_type: string;
  qr_code_url: string | null;
  qr_code_data: string;
  is_used: boolean;
}

const ConfirmationPage = () => {
  const { bookingId } = useParams();
  const { toast } = useToast();
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [tickets, setTickets] = useState<TicketDetails[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(true);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setError('Booking ID not found');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch booking
        const { data, error: fetchError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Booking not found');

        setBooking(data);

        // Fetch tickets for this booking
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('tickets')
          .select('*')
          .eq('booking_id', bookingId);

        if (ticketsError) {
          console.error('Error fetching tickets:', ticketsError);
        } else {
          setTickets(ticketsData || []);
        }

        // Generate a summary QR code for the booking
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
            dark: '#3D2E1F',
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

  const handleDownloadTicket = async () => {
    if (!booking) return;

    // Create a canvas with the full ticket design
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 900;
    const height = 1400;
    canvas.width = width;
    canvas.height = height;

    // Background with subtle gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#FAF8F5');
    bgGradient.addColorStop(1, '#F0EBE3');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative top bar
    ctx.fillStyle = '#C9A86C';
    ctx.fillRect(0, 0, width, 8);

    // Header section with gradient
    const headerGradient = ctx.createLinearGradient(0, 8, 0, 180);
    headerGradient.addColorStop(0, '#8B7355');
    headerGradient.addColorStop(1, '#5C4A3A');
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 8, width, 172);

    // Header text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px Tajawal, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(isArabic ? 'سوق المفيجر' : 'Souq Almufaijer', width / 2, 80);
    
    ctx.fillStyle = '#C9A86C';
    ctx.font = '18px Tajawal, Arial';
    ctx.fillText(isArabic ? 'تذكرة دخول' : 'ENTRY TICKET', width / 2, 115);
    
    // Decorative line
    ctx.strokeStyle = '#C9A86C';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width/2 - 80, 135);
    ctx.lineTo(width/2 + 80, 135);
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '14px Tajawal, Arial';
    ctx.fillText(isArabic ? 'التراث الأصيل' : 'Authentic Heritage', width / 2, 160);

    // Booking reference card
    const refCardY = 210;
    ctx.fillStyle = '#C9A86C';
    roundRect(ctx, 60, refCardY, width - 120, 100, 16);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = isArabic ? 'right' : 'left';
    ctx.fillText(isArabic ? 'رقم الحجز' : 'BOOKING REFERENCE', isArabic ? width - 90 : 90, refCardY + 35);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px Courier New, monospace';
    ctx.fillText(booking.booking_reference, isArabic ? width - 90 : 90, refCardY + 75);

    // Details section
    const detailsY = 350;
    ctx.fillStyle = '#3D2E1F';
    
    // Guest name
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = '#8B7355';
    ctx.fillText(isArabic ? 'اسم الزائر' : 'GUEST NAME', isArabic ? width - 90 : 90, detailsY);
    ctx.font = 'bold 24px Tajawal, Arial';
    ctx.fillStyle = '#3D2E1F';
    ctx.fillText(booking.customer_name, isArabic ? width - 90 : 90, detailsY + 35);

    // Date
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = '#8B7355';
    ctx.fillText(isArabic ? 'التاريخ' : 'DATE', isArabic ? width - 90 : 90, detailsY + 80);
    ctx.font = 'bold 22px Tajawal, Arial';
    ctx.fillStyle = '#3D2E1F';
    ctx.fillText(format(new Date(booking.visit_date), 'EEEE, d MMMM yyyy', { 
      locale: isArabic ? ar : enUS 
    }), isArabic ? width - 90 : 90, detailsY + 110);

    // Time
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = '#8B7355';
    ctx.fillText(isArabic ? 'الوقت' : 'TIME', isArabic ? width - 90 : 90, detailsY + 155);
    ctx.font = 'bold 22px Tajawal, Arial';
    ctx.fillStyle = '#3D2E1F';
    ctx.fillText(formatTimeDisplay(booking.visit_time), isArabic ? width - 90 : 90, detailsY + 185);

    // Tickets summary card
    const ticketCardY = detailsY + 230;
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 60, ticketCardY, width - 120, 140, 16);
    ctx.fill();
    ctx.strokeStyle = '#E8DED0';
    ctx.lineWidth = 2;
    roundRect(ctx, 60, ticketCardY, width - 120, 140, 16);
    ctx.stroke();
    
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = '#8B7355';
    ctx.fillText(isArabic ? 'التذاكر' : 'TICKETS', isArabic ? width - 90 : 90, ticketCardY + 30);
    
    let ticketYPos = ticketCardY + 55;
    ctx.font = '18px Tajawal, Arial';
    ctx.fillStyle = '#3D2E1F';
    if (booking.adult_count > 0) {
      ctx.fillText(`${isArabic ? 'بالغ' : 'Adult'}: ${booking.adult_count} × ${booking.adult_price} SAR`, isArabic ? width - 90 : 90, ticketYPos);
      ticketYPos += 28;
    }
    if (booking.child_count > 0) {
      ctx.fillText(`${isArabic ? 'طفل' : 'Child'}: ${booking.child_count} × ${booking.child_price} SAR`, isArabic ? width - 90 : 90, ticketYPos);
      ticketYPos += 28;
    }
    if (booking.senior_count && booking.senior_count > 0) {
      ctx.fillText(`${isArabic ? 'كبير السن' : 'Senior'}: ${booking.senior_count} × ${booking.senior_price} SAR`, isArabic ? width - 90 : 90, ticketYPos);
    }

    // Total amount badge
    const totalY = ticketCardY + 170;
    ctx.fillStyle = '#3D2E1F';
    roundRect(ctx, 60, totalY, width - 120, 70, 16);
    ctx.fill();
    
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#C9A86C';
    ctx.fillText(isArabic ? 'المبلغ المدفوع' : 'TOTAL PAID', isArabic ? width - 90 : 90, totalY + 30);
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${booking.total_amount} SAR`, isArabic ? width - 90 : 90, totalY + 58);

    // QR Code section
    const qrSectionY = totalY + 110;
    ctx.textAlign = 'center';
    
    // QR card background
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, width/2 - 150, qrSectionY, 300, 340, 20);
    ctx.fill();
    ctx.strokeStyle = '#C9A86C';
    ctx.lineWidth = 3;
    roundRect(ctx, width/2 - 150, qrSectionY, 300, 340, 20);
    ctx.stroke();
    
    // Inner QR border
    ctx.strokeStyle = '#E8DED0';
    ctx.lineWidth = 2;
    roundRect(ctx, width/2 - 120, qrSectionY + 30, 240, 240, 12);
    ctx.stroke();

    // Draw QR code
    if (qrCodeUrl) {
      const qrImage = new Image();
      qrImage.src = qrCodeUrl;
      await new Promise((resolve) => {
        qrImage.onload = resolve;
      });
      ctx.drawImage(qrImage, width/2 - 100, qrSectionY + 50, 200, 200);
    }

    ctx.fillStyle = '#8B7355';
    ctx.font = 'bold 14px Tajawal, Arial';
    ctx.fillText(isArabic ? 'امسح الرمز عند الدخول' : 'Scan at entrance', width/2, qrSectionY + 300);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#A69888';
    ctx.fillText(isArabic ? 'صالحة ليوم الزيارة فقط' : 'Valid for visit date only', width/2, qrSectionY + 322);

    // Footer
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, height - 80, width, 80);
    
    // Decorative footer line
    ctx.fillStyle = '#C9A86C';
    ctx.fillRect(0, height - 80, width, 4);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Tajawal, Arial';
    ctx.fillText(isArabic ? 'شكراً لزيارتكم سوق المفيجر' : 'Thank you for visiting Souq Almufaijer', width/2, height - 45);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#C9A86C';
    ctx.fillText('almufaijer.com', width/2, height - 22);

    // Download
    const link = document.createElement('a');
    link.download = `${booking.booking_reference}-ticket.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  // Helper function for rounded rectangles
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const handleDownloadSingleTicket = (ticket: TicketDetails) => {
    if (!ticket.qr_code_url) return;
    const link = document.createElement('a');
    link.download = `ticket-${ticket.ticket_code}.png`;
    link.href = ticket.qr_code_url;
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

  const handleResendEmail = async () => {
    if (!booking) return;
    
    setIsResendingEmail(true);
    try {
      const success = await resendConfirmationEmail(booking.id);
      if (success) {
        toast({
          title: isArabic ? 'تم الإرسال' : 'Email Sent',
          description: isArabic 
            ? 'تم إرسال رسالة التأكيد إلى بريدك الإلكتروني'
            : 'Confirmation email has been sent to your email',
        });
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Error resending email:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic 
          ? 'فشل إرسال البريد الإلكتروني. يرجى المحاولة مرة أخرى.'
          : 'Failed to send email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsResendingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
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
      <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <Header />
        <div className="flex-1 flex items-center justify-center pt-20">
          <div className="glass-card-gold rounded-3xl p-8 text-center max-w-md mx-4">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {isArabic ? 'خطأ' : 'Error'}
            </h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link to="/">
              <Button className="btn-gold">
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
    <div className={`min-h-screen flex flex-col bg-background overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />

      {/* Confetti Animation - Heritage colors */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#C9A86C', '#8B7355', '#D4C5B0', '#4A3625', '#F5EDE4'][Math.floor(Math.random() * 5)],
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
              <div className="w-24 h-24 rounded-full gradient-gold flex items-center justify-center animate-scale-in glow-gold">
                <CheckCircle className="h-12 w-12 text-foreground" />
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

          {/* Heritage Style Ticket Card */}
          <div className="relative mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {/* Main Ticket */}
            <div className="glass-card-gold overflow-hidden">
              {/* Ticket Header */}
              <div className="gradient-heritage p-6 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-primary-foreground/30 flex items-center justify-center">
                      <span className="font-arabic font-bold text-lg">سم</span>
                    </div>
                    <div>
                      <div className="font-bold text-lg">
                        {isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}
                      </div>
                      <div className="text-primary-foreground/70 text-sm">
                        {isArabic ? 'تذكرة دخول' : 'Entry Pass'}
                      </div>
                    </div>
                  </div>
                  <Ticket className="h-8 w-8 text-primary-foreground/50" />
                </div>
              </div>

              {/* Ticket Body */}
              <div className="p-6 bg-card">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left Side - Details */}
                  <div className="flex-1 space-y-6">
                    {/* Booking Reference */}
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        {isArabic ? 'رقم الحجز' : 'Booking Reference'}
                      </div>
                      <div className="text-2xl font-bold font-mono text-accent tracking-wider">
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
                      <div className="p-3 bg-white rounded-2xl shadow-inner border-2 border-accent/20">
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
              <div className="bg-secondary/50 p-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Ticket className="h-4 w-4 text-accent" />
                    <span>
                      {isArabic ? 'المبلغ المدفوع:' : 'Amount Paid:'}
                    </span>
                    <span className="font-bold text-accent">
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

          {/* Individual Tickets Section */}
          {tickets.length > 0 && (
            <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.25s' }}>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-accent" />
                {isArabic ? 'التذاكر الفردية' : 'Individual Tickets'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {tickets.map((ticket, index) => (
                  <div 
                    key={ticket.id}
                    className={`glass-card p-3 rounded-xl border text-center ${
                      ticket.is_used 
                        ? 'bg-muted/50 border-muted opacity-60' 
                        : 'border-accent/20'
                    }`}
                  >
                    {ticket.qr_code_url ? (
                      <img 
                        src={ticket.qr_code_url} 
                        alt={`Ticket ${index + 1}`}
                        className="w-full aspect-square rounded-lg mb-2"
                      />
                    ) : (
                      <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center mb-2">
                        <QrCode className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="text-xs font-mono text-muted-foreground truncate mb-1">
                      {ticket.ticket_code}
                    </div>
                    <Badge 
                      variant={ticket.is_used ? 'secondary' : 'outline'} 
                      className="text-[10px]"
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
                        onClick={() => handleDownloadSingleTicket(ticket)}
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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Button 
              onClick={handleDownloadTicket}
              className="flex-1 gap-2 btn-gold h-12"
            >
              <Download className="h-5 w-5" />
              {isArabic ? 'تحميل التذكرة' : 'Download Ticket'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleShare}
              className="flex-1 gap-2 h-12 border-2 border-accent/30 hover:bg-accent/5"
            >
              <Share2 className="h-5 w-5" />
              {isArabic ? 'مشاركة' : 'Share'}
            </Button>
          </div>

          {/* Email Notice with Resend Button */}
          <div 
            className="flex flex-col sm:flex-row items-center gap-3 p-4 glass-card-gold rounded-2xl mb-8 animate-slide-up" 
            style={{ animationDelay: '0.4s' }}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {booking.confirmation_email_sent
                  ? (isArabic 
                      ? `تم إرسال تأكيد الحجز والتذاكر إلى ${booking.customer_email}`
                      : `Confirmation and tickets have been sent to ${booking.customer_email}`)
                  : (isArabic
                      ? `لم يتم إرسال البريد الإلكتروني بعد. يرجى المحاولة مرة أخرى.`
                      : `Email not sent yet. Please try again.`)
                }
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendEmail}
              disabled={isResendingEmail}
              className="gap-2 border-accent/30 hover:bg-accent/5"
            >
              {isResendingEmail ? (
                <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isArabic ? 'إعادة الإرسال' : 'Resend'}
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <Link to="/my-tickets">
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 border-2 border-accent/30 hover:bg-accent/5">
                <Ticket className="h-5 w-5" />
                {isArabic ? 'عرض تذاكري' : 'View My Tickets'}
              </Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="ghost" className="w-full sm:w-auto gap-2 hover:bg-secondary">
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
