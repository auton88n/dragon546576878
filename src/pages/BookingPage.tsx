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
    visitTime, 
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
          visit_time: visitTime!,
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
          visitTime: visitTime!,
          adultCount: tickets.adult,
          childCount: tickets.child,
          seniorCount: 0,
        });

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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-24 pb-12">
        <div className="container max-w-5xl">
          {/* Page Title */}
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {isArabic ? 'احجز تذكرتك' : 'Book Your Ticket'}
            </h1>
          </div>

          {/* Step Indicator */}
          <div className="mb-8">
            <StepIndicator currentStep={step as 1 | 2} />
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Step Content */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl border border-border p-6">
                {step === 1 && <TicketSelector />}
                {step === 2 && (
                  <DetailsAndPayment 
                    onPaymentComplete={handlePaymentComplete} 
                    isProcessing={isProcessing} 
                  />
                )}

                {/* Navigation Button for Step 1 */}
                {step === 1 && (
                  <div className="mt-8 pt-6 border-t border-border">
                    <Button
                      size="lg"
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="w-full h-12 text-base rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground disabled:bg-secondary disabled:text-muted-foreground"
                    >
                      {isArabic ? 'التالي' : 'Continue'}
                      {isRTL ? <ArrowLeft className="h-4 w-4 mr-2" /> : <ArrowRight className="h-4 w-4 ml-2" />}
                    </Button>
                  </div>
                )}

                {/* Back Button for Step 2 */}
                {step === 2 && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isRTL ? <ArrowRight className="h-4 w-4 ml-2" /> : <ArrowLeft className="h-4 w-4 mr-2" />}
                      {isArabic ? 'رجوع' : 'Back'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <OrderSummary />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingPage;
