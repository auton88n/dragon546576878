import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { 
  Clock, MapPin, Landmark, Heart, Calendar, 
  ArrowRight, ArrowLeft, ExternalLink, Users
} from 'lucide-react';

const Index = () => {
  const { currentLanguage: language, isRTL } = useLanguage();
  const isArabic = language === 'ar';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const features = [
    {
      icon: Landmark,
      titleAr: 'التجربة التراثية',
      titleEn: 'Heritage Experience',
      descAr: 'استمتع بتجربة فريدة من التراث السعودي الأصيل',
      descEn: 'Enjoy a unique authentic Saudi heritage experience',
    },
    {
      icon: Users,
      titleAr: 'جولات مرشدة',
      titleEn: 'Guided Tours',
      descAr: 'اكتشف القرية التراثية مع مرشدين متخصصين',
      descEn: 'Discover the heritage village with specialized guides',
    },
    {
      icon: Heart,
      titleAr: 'للعائلات',
      titleEn: 'Family Friendly',
      descAr: 'مناسبة للعائلات مع أنشطة لجميع الأعمار',
      descEn: 'Suitable for families with activities for all ages',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              {isArabic ? 'مرحباً بكم في' : 'Welcome to'}
              <br />
              <span className="text-accent">
                {isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {isArabic
                ? 'تجربة فريدة في قلب جبال طويق الساحرة'
                : 'A unique experience in the enchanting Tuwayq Mountains'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Link to="/book">
                <Button size="lg" className="w-full sm:w-auto text-base px-8 h-12 gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Calendar className="h-5 w-5" />
                  {isArabic ? 'احجز الآن' : 'Book Now'}
                  <ArrowIcon className="h-4 w-4" />
                </Button>
              </Link>
              <a 
                href="https://www.google.com/maps?q=23.612384849872548,46.56436420764147"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 h-12 gap-2">
                  <MapPin className="h-5 w-5" />
                  {isArabic ? 'الموقع' : 'Location'}
                </Button>
              </a>
            </div>

            {/* Quick Info */}
            <div className="flex flex-wrap justify-center gap-6 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">100 {isArabic ? 'ر.س' : 'SAR'}</span>
                <span>{isArabic ? 'للبالغ' : 'Adult'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">50 {isArabic ? 'ر.س' : 'SAR'}</span>
                <span>{isArabic ? 'للطفل' : 'Child'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{isArabic ? '٩ ص - ٦ م' : '9 AM - 6 PM'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-secondary/50">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl border border-border p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-accent text-accent-foreground flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {isArabic ? feature.titleAr : feature.titleEn}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {isArabic ? feature.descAr : feature.descEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hours & Location */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  {isArabic ? 'ساعات العمل' : 'Operating Hours'}
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isArabic ? 'السبت - الخميس' : 'Sat - Thu'}</span>
                    <span className="font-medium text-foreground">{isArabic ? '٩:٠٠ ص - ٦:٠٠ م' : '9:00 AM - 6:00 PM'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isArabic ? 'الجمعة' : 'Friday'}</span>
                    <span className="text-destructive font-medium">{isArabic ? 'مغلق' : 'Closed'}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-accent" />
                  {isArabic ? 'الموقع' : 'Location'}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {isArabic ? 'المفيجر، المملكة العربية السعودية' : 'Almufaijer, Saudi Arabia'}
                </p>
                <a 
                  href="https://www.google.com/maps?q=23.612384849872548,46.56436420764147"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    {isArabic ? 'عرض على الخريطة' : 'View on Map'}
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {isArabic ? 'احجز زيارتك اليوم' : 'Book Your Visit Today'}
          </h2>
          <p className="text-primary-foreground/70 mb-6 max-w-xl mx-auto">
            {isArabic
              ? 'انضم إلينا في رحلة استكشافية لا تُنسى'
              : 'Join us for an unforgettable exploratory journey'}
          </p>
          <Link to="/book">
            <Button size="lg" className="text-base px-8 h-12 bg-accent hover:bg-accent/90 text-accent-foreground">
              <Calendar className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0" />
              {isArabic ? 'احجز الآن' : 'Book Now'}
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
