import { useState } from 'react';
import { CreditCard, Lock, Shield, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PaymentFormProps {
  onPaymentComplete: (paymentId: string) => void;
  isProcessing: boolean;
}

const PaymentForm = ({ onPaymentComplete, isProcessing }: PaymentFormProps) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { totalAmount } = useBookingStore();

  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mockPaymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    onPaymentComplete(mockPaymentId);
  };

  const isFormValid = 
    cardNumber.replace(/\s/g, '').length === 16 &&
    expiryDate.length === 5 &&
    cvv.length >= 3 &&
    cardName.length >= 3;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {isArabic ? 'الدفع الآمن' : 'Secure Payment'}
        </h2>
        <p className="text-muted-foreground">
          {isArabic ? 'أكمل عملية الدفع لتأكيد حجزك' : 'Complete payment to confirm your booking'}
        </p>
      </div>

      {/* Amount Display */}
      <div className="glass-card rounded-2xl p-6 text-center animate-slide-up">
        <p className="text-sm text-muted-foreground mb-2">
          {isArabic ? 'المبلغ الإجمالي' : 'Total Amount'}
        </p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-5xl font-bold gradient-text">{totalAmount}</span>
          <span className="text-xl text-muted-foreground">{isArabic ? 'ر.س' : 'SAR'}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card Number */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Label className="flex items-center gap-2 text-base font-medium">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
            {isArabic ? 'رقم البطاقة' : 'Card Number'}
          </Label>
          <Input
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
            className="h-14 text-lg font-mono rounded-xl border-2"
            dir="ltr"
          />
        </div>

        {/* Cardholder Name */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Label className="text-base font-medium">
            {isArabic ? 'الاسم على البطاقة' : 'Name on Card'}
          </Label>
          <Input
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            placeholder={isArabic ? 'الاسم كما يظهر على البطاقة' : 'Name as it appears on card'}
            className="h-14 text-base rounded-xl border-2"
          />
        </div>

        {/* Expiry & CVV */}
        <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="space-y-2">
            <Label className="text-base font-medium">
              {isArabic ? 'تاريخ الانتهاء' : 'Expiry Date'}
            </Label>
            <Input
              value={expiryDate}
              onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
              placeholder="MM/YY"
              className="h-14 text-base font-mono rounded-xl border-2"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">
              {isArabic ? 'رمز الأمان' : 'CVV'}
            </Label>
            <Input
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="•••"
              type="password"
              className="h-14 text-base font-mono rounded-xl border-2"
              dir="ltr"
            />
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-center gap-3 p-4 bg-success/5 rounded-xl border border-success/20 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
            <Lock className="h-5 w-5 text-success" />
          </div>
          <p className="text-sm text-muted-foreground">
            {isArabic 
              ? 'معلومات بطاقتك محمية بتشفير SSL 256-bit'
              : 'Your card information is protected with 256-bit SSL encryption'}
          </p>
        </div>

        {/* Pay Button */}
        <Button
          type="submit"
          size="lg"
          className={cn(
            'w-full h-16 text-lg rounded-xl transition-all duration-300',
            isFormValid && !isProcessing 
              ? 'gradient-bg text-white glow-hover animate-pulse-glow' 
              : 'bg-secondary text-muted-foreground'
          )}
          disabled={!isFormValid || isProcessing}
        >
          {isProcessing ? (
            <span className="flex items-center gap-3">
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              {isArabic ? 'جاري المعالجة...' : 'Processing...'}
            </span>
          ) : (
            <span className="flex items-center gap-3">
              <Shield className="h-6 w-6" />
              {isArabic ? `ادفع ${totalAmount} ر.س` : `Pay ${totalAmount} SAR`}
            </span>
          )}
        </Button>

        {/* Demo Notice */}
        <div className="flex items-center justify-center gap-2 p-3 bg-warning/10 rounded-xl border border-warning/20 text-sm text-warning animate-fade-in">
          <span>⚠️</span>
          <span>
            {isArabic 
              ? 'نموذج تجريبي - بوابة Geidea قريباً'
              : 'Demo form - Geidea integration coming soon'}
          </span>
        </div>
      </form>

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-6 pt-4 animate-fade-in">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="h-5 w-5" />
          <span className="text-sm">{isArabic ? 'دفع آمن' : 'Secure'}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="h-5 w-5" />
          <span className="text-sm">{isArabic ? 'مشفر' : 'Encrypted'}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm">{isArabic ? 'موثوق' : 'Trusted'}</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;
