import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import LanguageSwitcher from './LanguageSwitcher';
import { Button } from '@/components/ui/button';

interface StaffHeaderProps {
  title: string;
  titleAr: string;
}

const StaffHeader = ({ title, titleAr }: StaffHeaderProps) => {
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
        {/* Title */}
        <h1 className="text-lg md:text-xl font-bold text-foreground">
          {isArabic ? titleAr : title}
        </h1>

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
