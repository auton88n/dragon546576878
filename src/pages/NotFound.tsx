import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, MapPin } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";

const NotFound = () => {
  const location = useLocation();
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      
      <main className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="text-center px-4 relative z-10">
          {/* 404 Number */}
          <div className="mb-8">
            <span className="text-[150px] md:text-[200px] font-bold leading-none bg-gradient-to-br from-accent to-accent/50 bg-clip-text text-transparent">
              404
            </span>
          </div>

          {/* Message */}
          <div className="glass-card p-8 md:p-12 rounded-2xl border border-accent/20 max-w-lg mx-auto">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent/20 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-accent" />
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {isArabic ? 'الصفحة غير موجودة' : 'Page Not Found'}
            </h1>
            
            <p className="text-muted-foreground text-lg mb-8">
              {isArabic 
                ? 'عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها'
                : "Sorry, we couldn't find the page you're looking for"}
            </p>

            <Link to="/">
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
                <Home className="h-5 w-5" />
                {isArabic ? 'العودة للرئيسية' : 'Return to Home'}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
