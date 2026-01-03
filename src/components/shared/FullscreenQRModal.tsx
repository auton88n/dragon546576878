import { useEffect } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface FullscreenQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeUrl: string;
  ticketCode: string;
  guestName?: string;
}

const FullscreenQRModal = ({ isOpen, onClose, qrCodeUrl, ticketCode, guestName }: FullscreenQRModalProps) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  // Try to maximize brightness when modal opens (only works on some devices)
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling when modal is open
      document.body.style.overflow = 'hidden';
      
      // Request wake lock to keep screen on
      if ('wakeLock' in navigator) {
        (navigator as any).wakeLock.request('screen').catch(() => {});
      }
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white cursor-pointer select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isArabic ? 'عرض رمز QR بالحجم الكامل' : 'Fullscreen QR code view'}
    >
      {/* Close button - top right */}
      <button 
        className="absolute top-6 right-6 p-3 rounded-full bg-foreground/10 hover:bg-foreground/20 shadow-lg transition-all"
        onClick={onClose}
        aria-label={isArabic ? 'إغلاق' : 'Close'}
      >
        <X className="h-6 w-6 text-foreground" />
      </button>

      {/* QR Code - Maximum size for easy scanning */}
      <div className="flex flex-col items-center justify-center p-4 w-full max-w-[90vw]">
        {/* QR Code Image - 70% of viewport width, max 500px */}
        <div className="bg-white p-4 rounded-2xl shadow-lg border-4 border-black/10">
          <img 
            src={qrCodeUrl} 
            alt={`QR Code - ${ticketCode}`}
            className="w-[70vw] h-[70vw] max-w-[500px] max-h-[500px] object-contain"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>
        
        {/* Ticket Info - Minimal, high contrast */}
        <div className="mt-6 text-center">
          <div className="text-2xl font-mono font-bold text-black tracking-wider">
            {ticketCode}
          </div>
          {guestName && (
            <div className="mt-2 text-lg text-black/70">
              {guestName}
            </div>
          )}
        </div>

        {/* Tap to close instruction */}
        <div className="mt-8 flex items-center gap-2 text-black/50 text-sm">
          <Maximize2 className="h-4 w-4" />
          <span>
            {isArabic ? 'اضغط في أي مكان للإغلاق' : 'Tap anywhere to close'}
          </span>
        </div>

        {/* Scanning Tips - Brief */}
        <div className="mt-4 text-center text-black/40 text-xs max-w-xs">
          {isArabic 
            ? '💡 للمسح الأسرع: ارفع سطوع الشاشة للحد الأقصى'
            : '💡 For faster scanning: Maximize screen brightness'}
        </div>
      </div>
    </div>
  );
};

export default FullscreenQRModal;
