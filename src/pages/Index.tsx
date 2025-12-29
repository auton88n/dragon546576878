import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { 
  Clock, MapPin, Users, Landmark, Heart, Calendar, 
  ArrowRight, ArrowLeft, Coffee, Building, Palette, 
  TreePine, Sun, Zap, ExternalLink
} from 'lucide-react';

const Index = () => {
  const { t, currentLanguage: language, isRTL } = useLanguage();
  const isArabic = language === 'ar';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const features = [
    {
      icon: Landmark,
      titleAr: 'التجربة التراثية',
      titleEn: 'Heritage Experience',
      descAr: 'استمتع بتجربة فريدة من التراث السعودي الأصيل في قلب جبال طويق',
      descEn: 'Enjoy a unique authentic Saudi heritage experience in the heart of Tuwayq Mountains',
    },
    {
      icon: Users,
      titleAr: 'جولات مرشدة',
      titleEn: 'Guided Tours',
      descAr: 'اكتشف القرية التراثية مع مرشدين متخصصين في التاريخ والثقافة السعودية',
      descEn: 'Discover the heritage village with specialized guides in Saudi history and culture',
    },
    {
      icon: Heart,
      titleAr: 'للعائلات والأطفال',
      titleEn: 'Family Friendly',
      descAr: 'مناسبة للعائلات مع أنشطة وفعاليات متنوعة لجميع الأعمار',
      descEn: 'Suitable for families with diverse activities and events for all ages',
    },
  ];

  const offerings = [
    { icon: Coffee, labelAr: 'المقاهي والمطاعم', labelEn: 'Traditional Cafes' },
    { icon: Building, labelAr: 'الفنادق المتنوعة', labelEn: 'Accommodations' },
    { icon: Landmark, labelAr: 'المتحف التراثي', labelEn: 'Heritage Museum' },
    { icon: Palette, labelAr: 'الحرف اليدوية', labelEn: 'Handicrafts' },
    { icon: TreePine, labelAr: 'بساتين القرية', labelEn: 'Village Orchards' },
    { icon: Sun, labelAr: 'مهرجان الحمضيات', labelEn: 'Citrus Festival' },
    { icon: Zap, labelAr: 'الطاقة المتجددة', labelEn: 'Renewable Energy' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Hero Section - Modern Futuristic */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Grid Pattern Background */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
        
        {/* Gradient Orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="container relative z-10 py-20">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card animate-fade-in">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-medium text-foreground">
                {isArabic ? 'استكشاف طويق' : 'Discover Tuwayq'}
              </span>
            </div>

            <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                {isArabic ? (
                  <>
                    <span className="text-foreground">مرحباً بكم في</span>
                    <br />
                    <span className="gradient-text">سوق المفيجر</span>
                  </>
                ) : (
                  <>
                    <span className="text-foreground">Welcome to</span>
                    <br />
                    <span className="gradient-text">Souq Almufaijer</span>
                  </>
                )}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                {isArabic
                  ? 'تجربة فريدة من "الزمن الجميل" في قلب جبال طويق الساحرة'
                  : 'A unique experience from "the good old days" in the enchanting Tuwayq Mountains'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/book">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto text-lg px-8 py-7 gap-3 gradient-bg text-white glow-hover transition-all duration-300 hover:-translate-y-1 border-0"
                >
                  <Calendar className="h-5 w-5" />
                  {isArabic ? 'احجز زيارتك' : 'Book Your Visit'}
                  <ArrowIcon className="h-5 w-5" />
                </Button>
              </Link>
              <a 
                href={`https://www.google.com/maps?q=23.612384849872548,46.56436420764147`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full sm:w-auto text-lg px-8 py-7 gap-3 border-border/50 hover:border-accent/50 hover:bg-accent/5 transition-all duration-300"
                >
                  <MapPin className="h-5 w-5" />
                  {isArabic ? 'احصل على الاتجاهات' : 'Get Directions'}
                </Button>
              </a>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 pt-12 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="glass-card rounded-2xl p-4 text-center">
                <div className="text-2xl md:text-3xl font-bold gradient-text">100</div>
                <div className="text-sm text-muted-foreground">{isArabic ? 'ريال للبالغ' : 'SAR Adult'}</div>
              </div>
              <div className="glass-card rounded-2xl p-4 text-center">
                <div className="text-2xl md:text-3xl font-bold gradient-text">50</div>
                <div className="text-sm text-muted-foreground">{isArabic ? 'ريال للطفل' : 'SAR Child'}</div>
              </div>
              <div className="glass-card rounded-2xl p-4 text-center">
                <div className="text-2xl md:text-3xl font-bold gradient-text">9-6</div>
                <div className="text-sm text-muted-foreground">{isArabic ? 'ساعات العمل' : 'Open Hours'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-accent/50 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-accent rounded-full" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="container relative z-10">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              <Landmark className="h-4 w-4" />
              {isArabic ? 'ماذا نقدم' : 'What We Offer'}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {isArabic ? 'تجربة لا تُنسى' : 'An Unforgettable Experience'}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {isArabic
                ? 'سوق المفيجر مشروع سياحي متكامل يقدم تجربة مميزة ومثيرة'
                : 'Souq Almufaijer is a comprehensive tourism project offering a distinctive experience'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group glass-card rounded-3xl p-8 hover:border-accent/30 transition-all duration-500 hover:-translate-y-2"
              >
                <div className="space-y-6">
                  <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">
                    {isArabic ? feature.titleAr : feature.titleEn}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {isArabic ? feature.descAr : feature.descEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About / Vision Section */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/10 to-transparent" />
        
        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent text-sm font-medium">
                {isArabic ? 'رؤية 2030' : 'Vision 2030'}
              </span>
              <h2 className="text-4xl md:text-5xl font-bold">
                {isArabic ? 'رؤيتنا' : 'Our Vision'}
              </h2>
              <div className="space-y-6 text-primary-foreground/80 text-lg leading-relaxed">
                <p>
                  {isArabic
                    ? 'عززت المملكة مكانتها كوجهة سياحية عالمية، عبر تنفيذ مبادرات في مجالات الآثار والثقافة والتعليم والفنون، للحفاظ على تراث المملكة الغني وجمالها الطبيعي.'
                    : 'Saudi Arabia has strengthened its position as a global tourist destination through initiatives in archaeology, culture, education, and arts, preserving the Kingdom\'s rich heritage and natural beauty.'}
                </p>
                <p>
                  {isArabic
                    ? 'نعمل على بناء جسور التواصل بين المملكة وشعبها والعالم من خلال قطاع السياحة والثقافة، ليتمتع الزوار من مختلف دول العالم بتجربة فريدة.'
                    : 'We work to build bridges between the Kingdom, its people, and the world through tourism and culture, allowing visitors from around the globe to enjoy a unique experience.'}
                </p>
              </div>
              <div className="text-accent text-xl font-semibold">
                {isArabic ? '100 مليون زائر بحلول 2030' : '100 Million Visitors by 2030'}
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {offerings.map((item, index) => (
                <div
                  key={index}
                  className="bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10 rounded-2xl p-4 text-center hover:bg-primary-foreground/10 transition-colors"
                >
                  <item.icon className="h-8 w-8 text-accent mx-auto mb-3" />
                  <span className="text-sm font-medium text-primary-foreground">
                    {isArabic ? item.labelAr : item.labelEn}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Operating Hours */}
      <section className="py-24">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
                <Clock className="h-4 w-4" />
                {isArabic ? 'مواعيد الزيارة' : 'Visit Hours'}
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground">
                {isArabic ? 'ساعات العمل' : 'Operating Hours'}
              </h2>
            </div>

            <div className="glass-card rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-border/50 flex items-center justify-between">
                <span className="font-semibold text-lg">{isArabic ? 'السبت - الخميس' : 'Saturday - Thursday'}</span>
                <span className="px-4 py-2 rounded-full bg-success/10 text-success font-medium">
                  {isArabic ? '٩:٠٠ ص - ٦:٠٠ م' : '9:00 AM - 6:00 PM'}
                </span>
              </div>
              <div className="p-6 flex items-center justify-between">
                <span className="font-semibold text-lg">{isArabic ? 'الجمعة' : 'Friday'}</span>
                <span className="px-4 py-2 rounded-full bg-destructive/10 text-destructive font-medium">
                  {isArabic ? 'مغلق' : 'Closed'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section className="py-24 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              <MapPin className="h-4 w-4" />
              {isArabic ? 'الموقع' : 'Location'}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {isArabic ? 'زورونا' : 'Visit Us'}
            </h2>
            <p className="text-xl text-muted-foreground">
              {isArabic ? 'المفيجر 16561، المملكة العربية السعودية' : 'Almufaijer 16561, Kingdom of Saudi Arabia'}
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="glass-card rounded-3xl overflow-hidden">
              <div className="aspect-video relative bg-muted">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3630.123!2d46.56436420764147!3d23.612384849872548!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDM2JzQ0LjYiTiA0NsKwMzMnNTEuNyJF!5e0!3m2!1sen!2ssa!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0"
                />
              </div>
              <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h3 className="font-semibold text-lg">{isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}</h3>
                  <p className="text-muted-foreground">{isArabic ? 'المفيجر، المملكة العربية السعودية' : 'Almufaijer, Saudi Arabia'}</p>
                </div>
                <a 
                  href={`https://www.google.com/maps?q=23.612384849872548,46.56436420764147`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="gap-2 gradient-bg text-white border-0">
                    <ExternalLink className="h-4 w-4" />
                    {isArabic ? 'احصل على الاتجاهات' : 'Get Directions'}
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg" />
        <div className="absolute inset-0 grid-pattern opacity-20" />
        
        <div className="container relative z-10 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">
              {isArabic ? 'احجز زيارتك اليوم' : 'Book Your Visit Today'}
            </h2>
            <p className="text-xl md:text-2xl text-white/80 leading-relaxed">
              {isArabic
                ? 'انضم إلينا في رحلة استكشافية لا تُنسى عبر تراث المملكة العربية السعودية'
                : 'Join us on an unforgettable exploratory journey through Saudi heritage'}
            </p>
            <Link to="/book">
              <Button 
                size="lg" 
                className="text-xl px-12 py-8 mt-4 bg-white text-primary hover:bg-white/90 transition-all duration-300 hover:-translate-y-1 shadow-2xl"
              >
                <Calendar className="h-6 w-6 mr-3 rtl:mr-0 rtl:ml-3" />
                {isArabic ? 'احجز الآن' : 'Book Now'}
                <ArrowIcon className="h-5 w-5 ml-2 rtl:ml-0 rtl:mr-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
