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
import DateTimePicker from '@/components/booking/DateTimePicker';
import VisitorInfoForm from '@/components/booking/VisitorInfoForm';
import OrderSummary from '@/components/booking/OrderSummary';
import PaymentForm from '@/components/booking/PaymentForm';
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
    if (step < 4 && canProceed()) {
      setStep((step + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3 | 4);
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

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return <TicketSelector />;
      case 2:
        return <DateTimePicker />;
      case 3:
        return <VisitorInfoForm />;
      case 4:
        return <PaymentForm onPaymentComplete={handlePaymentComplete} isProcessing={isProcessing} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-24 pb-12">
        <div className="container">
          {/* Step Indicator */}
          <div className="max-w-3xl mx-auto mb-8">
            <StepIndicator currentStep={step} />
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Step Content */}
            <div className="lg:col-span-2">
              <div className="glass-card rounded-3xl p-6 md:p-8">
                {renderStepContent()}

                {/* Navigation Buttons */}
                {step < 4 && (
                  <div className="flex justify-between mt-10 pt-6 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleBack}
                      disabled={step === 1}
                      className="gap-2 rounded-xl border-2 px-6"
                    >
                      {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                      {isArabic ? 'السابق' : 'Back'}
                    </Button>
                    
                    <Button
                      size="lg"
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="gap-2 rounded-xl gradient-bg text-white border-0 px-8 glow-hover"
                    >
                      {isArabic ? 'التالي' : 'Continue'}
                      {isRTL ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
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
