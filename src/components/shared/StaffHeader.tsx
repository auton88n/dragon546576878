import { LogOut, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import LanguageSwitcher from './LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StaffHeaderProps {
  title: string;
  titleAr: string;
  isOnline?: boolean;
  isSyncing?: boolean;
  queueCount?: number;
}

const StaffHeader = ({ title, titleAr, isOnline = true, isSyncing = false, queueCount = 0 }: StaffHeaderProps) => {
  const navigate = useNavigate();
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { reset } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    reset();
    navigate('/login');
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="container flex items-center justify-between h-16 px-4">
        {/* Title with Status */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-xl font-bold text-foreground">
            {isArabic ? titleAr : title}
          </h1>
          
          {/* Online/Offline Status Badge */}
          <Badge 
            variant={isOnline ? "outline" : "destructive"} 
            className={cn(
              "gap-1.5 px-2 py-1 text-xs",
              isOnline 
                ? "border-green-500/50 text-green-600 bg-green-500/10" 
                : "border-destructive/50"
            )}
          >
            {isSyncing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : isOnline ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">
              {isSyncing 
                ? (isArabic ? 'مزامنة...' : 'Syncing...') 
                : isOnline 
                  ? (isArabic ? 'متصل' : 'Online') 
                  : (isArabic ? 'غير متصل' : 'Offline')
              }
            </span>
          </Badge>
          
          {/* Queue Count Badge */}
          {queueCount > 0 && (
            <Badge 
              variant="outline" 
              className="gap-1 px-2 py-1 text-xs border-amber-500/50 text-amber-600 bg-amber-500/10"
            >
              <span className="font-semibold">{queueCount}</span>
              <span className="hidden sm:inline">
                {isArabic ? 'في الانتظار' : 'queued'}
              </span>
            </Badge>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 md:gap-3 rtl:flex-row-reverse">
          <LanguageSwitcher />
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2 border-accent/30 hover:bg-accent/5 text-xs md:text-sm rtl:flex-row-reverse"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isArabic ? 'تسجيل الخروج' : 'Logout'}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default StaffHeader;
