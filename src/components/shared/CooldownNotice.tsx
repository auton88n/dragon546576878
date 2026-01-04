import { Clock } from 'lucide-react';

interface CooldownNoticeProps {
  remainingMinutes: number;
  isArabic: boolean;
}

const CooldownNotice = ({ remainingMinutes, isArabic }: CooldownNoticeProps) => (
  <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg text-center">
    <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
    <h3 className="font-semibold text-amber-900 mb-2">
      {isArabic ? 'يرجى الانتظار' : 'Please Wait'}
    </h3>
    <p className="text-amber-800">
      {isArabic 
        ? `يرجى الانتظار ${remainingMinutes} دقيقة قبل الإرسال مرة أخرى`
        : `Please wait ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} before submitting again`}
    </p>
    <p className="text-amber-600 text-sm mt-2">
      {isArabic
        ? 'هذا للحماية من الرسائل المزعجة'
        : 'This helps us prevent spam'}
    </p>
  </div>
);

export default CooldownNotice;
