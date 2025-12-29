import { useState } from 'react';
import { CreditCard, Lock, Shield } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingStore } from '@/stores/bookingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface PaymentFormProps {
  onPaymentComplete: (paymentId: string) => void;
  isProcessing: boolean;
}

const PaymentForm = ({ onPaymentComplete, isProcessing }: PaymentFormProps) => {
  const { t, currentLanguage } = useLanguage();
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
    // Placeholder - Geidea integration will be added here
    // For now, simulate a successful payment
    const mockPaymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    onPaymentComplete(mockPaymentId);
  };

  const isFormValid = 
    cardNumber.replace(/\s/g, '').length === 16 &&
    expiryDate.length === 5 &&
    cvv.length >= 3 &&
    cardName.length >= 3;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {t('booking.payment')}
        </h2>
        <p className="text-muted-foreground">
          {isArabic ? 'أدخل تفاصيل بطاقتك للدفع' : 'Enter your card details to pay'}
        </p>
      </div>

      {/* Amount Display */}
      <div className="text-center p-6 bg-primary/10 rounded-xl border border-primary/20">
        <p className="text-sm text-muted-foreground mb-1">
          {isArabic ? 'المبلغ المطلوب' : 'Amount Due'}
        </p>
        <p className="text-4xl font-bold text-primary">
          {totalAmount} <span className="text-lg">{isArabic ? 'ر.س' : 'SAR'}</span>
        </p>
      </div>

      <Card className="border-2">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Card Number */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                {isArabic ? 'رقم البطاقة' : 'Card Number'}
              </Label>
              <Input
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                className="h-12 text-base font-mono"
                dir="ltr"
              />
            </div>

            {/* Cardholder Name */}
            <div className="space-y-2">
              <Label>{isArabic ? 'الاسم على البطاقة' : 'Name on Card'}</Label>
              <Input
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder={isArabic ? 'الاسم كما يظهر على البطاقة' : 'Name as it appears on card'}
                className="h-12 text-base"
              />
            </div>

            {/* Expiry & CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? 'تاريخ الانتهاء' : 'Expiry Date'}</Label>
                <Input
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                  placeholder="MM/YY"
                  className="h-12 text-base font-mono"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'رمز الأمان' : 'CVV'}</Label>
                <Input
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  type="password"
                  className="h-12 text-base font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>
                {isArabic 
                  ? 'معلومات بطاقتك محمية بتشفير SSL'
                  : 'Your card information is protected with SSL encryption'}
              </span>
            </div>

            {/* Pay Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full h-14 text-lg"
              disabled={!isFormValid || isProcessing}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {isArabic ? 'جاري المعالجة...' : 'Processing...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {isArabic ? `ادفع ${totalAmount} ر.س` : `Pay ${totalAmount} SAR`}
                </span>
              )}
            </Button>
          </form>

          {/* Placeholder Notice */}
          <p className="text-xs text-center text-muted-foreground mt-4 p-2 bg-warning/10 rounded border border-warning/20">
            {isArabic 
              ? '⚠️ هذا نموذج تجريبي - سيتم دمج بوابة Geidea للدفع قريباً'
              : '⚠️ This is a demo form - Geidea payment gateway integration coming soon'}
          </p>
        </CardContent>
      </Card>

      {/* Payment Badges */}
      <div className="flex justify-center gap-4 text-muted-foreground">
        <div className="flex items-center gap-1 text-sm">
          <Shield className="h-4 w-4" />
          <span>{isArabic ? 'دفع آمن' : 'Secure Payment'}</span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Lock className="h-4 w-4" />
          <span>{isArabic ? 'تشفير SSL' : 'SSL Encrypted'}</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;
