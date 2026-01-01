import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
import { supabase } from '@/integrations/supabase/client';
import { generateTicketsForBooking } from '@/lib/ticketService';
import { sendBookingConfirmation } from '@/lib/emailService';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import StepIndicator from '@/components/booking/StepIndicator';
import OptimizedImage from '@/components/shared/OptimizedImage';
import heroImage from '@/assets/hero-heritage.jpg';
import TicketSelector from '@/components/booking/TicketSelector';
import DetailsAndPayment from '@/components/booking/DetailsAndPayment';
import OrderSummary from '@/components/booking/OrderSummary';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const BookingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  
  const { 
    step, 
    setStep, 
    canProceed, 
    tickets, 
    pricing,
    visitDate, 
    customerInfo, 
    totalAmount,
    reset 
  } = useBookingStore();

  const [isProcessing, setIsProcessing] = useState(false);

  const generateBookingReference = () => {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ALM-${year}-${random}`;
  };

  const handleNext = () => {
    if (step === 1 && canProceed()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handlePaymentComplete = async (paymentId: string) => {
    setIsProcessing(true);
    
    try {
      const bookingReference = generateBookingReference();
      
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          booking_reference: bookingReference,
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          special_requests: customerInfo.specialRequests || null,
          visit_date: visitDate!,
          visit_time: '09:00', // Default time - tickets valid all day
          adult_count: tickets.adult,
          child_count: tickets.child,
          senior_count: 0,
          adult_price: pricing.adult,
          child_price: pricing.child,
          senior_price: 0,
          total_amount: totalAmount,
          payment_id: paymentId,
          payment_status: 'completed',
          payment_method: 'card',
          booking_status: 'confirmed',
          language: currentLanguage,
        })
        .select()
        .single();

      if (error) throw error;

      try {
        await generateTicketsForBooking({
          bookingId: booking.id,
          bookingReference: bookingReference,
          visitDate: visitDate!,
          adultCount: tickets.adult,
          childCount: tickets.child,
          seniorCount: 0,
        });

        // Update qr_codes_generated flag
        await supabase
          .from('bookings')
          .update({ qr_codes_generated: true })
          .eq('id', booking.id);

        const emailSent = await sendBookingConfirmation(booking.id);
        if (!emailSent) {
          console.warn('Confirmation email failed to send');
        }
      } catch (ticketError) {
        console.error('Error generating tickets:', ticketError);
      }

      reset();
      navigate(`/confirmation/${booking.id}`);
      
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: isArabic ? 'خطأ في الحجز' : 'Booking Error',
        description: isArabic 
          ? 'حدث خطأ أثناء إنشاء الحجز. يرجى المحاولة مرة أخرى.'
          : 'An error occurred while creating your booking. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />

      {/* Hero Banner */}
      <section className="relative h-[40vh] min-h-[280px] max-h-[400px] overflow-hidden">
        <OptimizedImage
          src={heroImage}
          alt={isArabic ? 'سوق المفيجر التراثي' : 'Souq Almufaijer Heritage'}
          className="absolute inset-0 w-full h-full"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/20" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
        
        {/* Hero Content */}
        <div className="absolute inset-0 flex items-end justify-center pb-16 md:pb-20">
          <div className="text-center px-4">
            <div className="inline-block backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-8 py-6 shadow-2xl">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
                {isArabic ? 'احجز مكانك' : 'Reserve Your Spot'}
              </h1>
              <p className="text-white/80 text-sm md:text-base">
                {isArabic ? 'اتبع الخطوات لإتمام حجزك' : 'Follow the steps to complete your booking'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 pt-4 pb-8 md:pt-6 md:pb-12 px-4 md:px-6">
        <div className="container max-w-5xl px-0">

          {/* Step Indicator */}
          <div className="mb-6 md:mb-10">
            <StepIndicator currentStep={step as 1 | 2} />
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
            {/* Step Content */}
            <div className="lg:col-span-2">
              <div 
                className="glass-card-gold p-4 sm:p-6 md:p-8 transition-all duration-500"
                key={step}
              >
                <div className="animate-fade-in">
                  {step === 1 && <TicketSelector />}
                  {step === 2 && (
                    <DetailsAndPayment 
                      onPaymentComplete={handlePaymentComplete} 
                      isProcessing={isProcessing} 
                    />
                  )}
                </div>

                {/* Navigation Button for Step 1 */}
                {step === 1 && (
                  <div className="mt-8 pt-6 border-t border-border">
                    <Button
                      size="lg"
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="w-full h-12 md:h-14 text-base md:text-lg rounded-xl btn-gold disabled:bg-muted disabled:text-muted-foreground disabled:opacity-50 disabled:shadow-none group"
                    >
                      {isArabic ? 'التالي' : 'Continue'}
                      {isRTL 
                        ? <span className="icon-wrapper"><ArrowLeft className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" aria-hidden="true" /></span>
                        : <span className="icon-wrapper"><ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                      }
                    </Button>
                  </div>
                )}

                {/* Back Button for Step 2 */}
                {step === 2 && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="text-muted-foreground hover:text-foreground group"
                    >
                      {isRTL 
                        ? <span className="icon-wrapper"><ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                        : <span className="icon-wrapper"><ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" aria-hidden="true" /></span>
                      }
                      {isArabic ? 'رجوع' : 'Back'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <OrderSummary />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingPage;
