import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, MapPin, Users, Landmark, Heart, Calendar, Star, Sparkles } from 'lucide-react';

const Index = () => {
  const { t, currentLanguage: language } = useLanguage();
  const isArabic = language === 'ar';

  const features = [
    {
      icon: Landmark,
      titleAr: 'تراث أصيل',
      titleEn: 'Authentic Heritage',
      descAr: 'استمتع بتجربة تراثية سعودية أصيلة في أجواء تاريخية فريدة',
      descEn: 'Experience authentic Saudi heritage in a unique historical atmosphere',
    },
    {
      icon: Users,
      titleAr: 'جولات إرشادية',
      titleEn: 'Guided Tours',
      descAr: 'مرشدون خبراء يأخذونك في رحلة عبر التاريخ والثقافة',
      descEn: 'Expert guides take you on a journey through history and culture',
    },
    {
      icon: Heart,
      titleAr: 'صديق للعائلات',
      titleEn: 'Family Friendly',
      descAr: 'أنشطة ممتعة لجميع أفراد العائلة من جميع الأعمار',
      descEn: 'Fun activities for all family members of all ages',
    },
  ];

  const operatingHours = [
    { dayAr: 'السبت', dayEn: 'Saturday', hoursAr: '٩:٠٠ ص - ٦:٠٠ م', hoursEn: '9:00 AM - 6:00 PM' },
    { dayAr: 'الأحد', dayEn: 'Sunday', hoursAr: '٩:٠٠ ص - ٦:٠٠ م', hoursEn: '9:00 AM - 6:00 PM' },
    { dayAr: 'الإثنين', dayEn: 'Monday', hoursAr: '٩:٠٠ ص - ٦:٠٠ م', hoursEn: '9:00 AM - 6:00 PM' },
    { dayAr: 'الثلاثاء', dayEn: 'Tuesday', hoursAr: '٩:٠٠ ص - ٦:٠٠ م', hoursEn: '9:00 AM - 6:00 PM' },
    { dayAr: 'الأربعاء', dayEn: 'Wednesday', hoursAr: '٩:٠٠ ص - ٦:٠٠ م', hoursEn: '9:00 AM - 6:00 PM' },
    { dayAr: 'الخميس', dayEn: 'Thursday', hoursAr: '٩:٠٠ ص - ٦:٠٠ م', hoursEn: '9:00 AM - 6:00 PM' },
    { dayAr: 'الجمعة', dayEn: 'Friday', hoursAr: 'مغلق', hoursEn: 'Closed', closed: true },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Hero Section - Modern Design with Heritage Image */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=2000&q=80')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-accent/80 via-accent/60 to-accent/90" />
        
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 border border-primary/30 rounded-full animate-pulse opacity-50" />
        <div className="absolute bottom-40 right-20 w-32 h-32 border border-secondary/30 rounded-full animate-pulse opacity-30" />
        <Sparkles className="absolute top-32 right-16 h-8 w-8 text-secondary/40 animate-pulse" />
        <Star className="absolute bottom-24 left-24 h-6 w-6 text-primary/40 animate-pulse" />

        <div className="container relative z-10 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 backdrop-blur-sm border border-secondary/30">
              <Landmark className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium text-secondary">
                {isArabic ? 'موقع تراثي سعودي' : 'Saudi Heritage Site'}
              </span>
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-secondary leading-tight drop-shadow-lg">
                {isArabic ? (
                  <>مرحباً بكم في<br /><span className="text-primary-foreground">سوق المفيجر</span></>
                ) : (
                  <>Welcome to<br /><span className="text-primary-foreground">Souq Almufaijer</span></>
                )}
              </h1>
              <p className="text-xl md:text-2xl text-secondary/90 max-w-2xl mx-auto leading-relaxed">
                {isArabic
                  ? 'اكتشف جمال التراث السعودي الأصيل في رحلة عبر الزمن إلى أجواء الماضي العريق'
                  : 'Discover the beauty of authentic Saudi heritage on a journey through time to the glorious past'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/book">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto text-lg px-10 py-7 gap-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-primary hover:bg-primary/90"
                >
                  <Calendar className="h-5 w-5" />
                  {t('home.hero.cta')}
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full sm:w-auto text-lg px-10 py-7 gap-3 border-secondary/50 text-secondary hover:bg-secondary/10 hover:text-secondary backdrop-blur-sm transition-all duration-300"
              >
                <MapPin className="h-5 w-5" />
                {isArabic ? 'موقعنا' : 'Our Location'}
              </Button>
            </div>

            {/* Quick Info Pills */}
            <div className="flex flex-wrap justify-center gap-4 pt-8">
              <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-secondary/10 backdrop-blur-sm border border-secondary/20">
                <Clock className="h-4 w-4 text-secondary" />
                <span className="text-secondary/90 font-medium">{isArabic ? 'يوميًا ٩ ص - ٦ م' : 'Daily 9 AM - 6 PM'}</span>
              </div>
              <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-secondary/10 backdrop-blur-sm border border-secondary/20">
                <MapPin className="h-4 w-4 text-secondary" />
                <span className="text-secondary/90 font-medium">{isArabic ? 'الرياض' : 'Riyadh'}</span>
              </div>
              <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-secondary/10 backdrop-blur-sm border border-secondary/20">
                <Star className="h-4 w-4 text-secondary" />
                <span className="text-secondary/90 font-medium">{isArabic ? 'تجربة فريدة' : 'Unique Experience'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-secondary/50 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-secondary/70 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section - Modern Cards */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/10 to-transparent" />
        
        <div className="container relative z-10">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              {isArabic ? 'مميزاتنا' : 'Our Features'}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              {isArabic ? 'لماذا تزورنا؟' : 'Why Visit Us?'}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {isArabic
                ? 'نقدم لكم تجربة فريدة تجمع بين الأصالة والضيافة السعودية'
                : 'We offer a unique experience combining authenticity and Saudi hospitality'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="group border-none shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-card/80 backdrop-blur-sm overflow-hidden"
              >
                <CardContent className="p-8 text-center space-y-6 relative">
                  {/* Decorative gradient */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                    <feature.icon className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">
                    {isArabic ? feature.titleAr : feature.titleEn}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {isArabic ? feature.descAr : feature.descEn}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Operating Hours Section - Modern Design */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-background to-secondary/20">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                {isArabic ? 'مواعيد الزيارة' : 'Visit Schedule'}
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 flex items-center justify-center gap-4">
                <Clock className="h-10 w-10 text-primary" />
                {isArabic ? 'ساعات العمل' : 'Operating Hours'}
              </h2>
            </div>

            <Card className="shadow-2xl border-none bg-card/90 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                {operatingHours.map((item, index) => (
                  <div
                    key={index}
                    className={`flex justify-between items-center px-8 py-5 border-b border-border/30 last:border-0 hover:bg-secondary/10 transition-colors ${
                      item.closed ? 'bg-destructive/5' : ''
                    }`}
                  >
                    <span className="font-semibold text-lg">
                      {isArabic ? item.dayAr : item.dayEn}
                    </span>
                    <span className={`font-medium text-lg ${item.closed ? 'text-destructive' : 'text-primary'}`}>
                      {isArabic ? item.hoursAr : item.hoursEn}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section - Modern Gradient */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        {/* Background with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary" />
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFFFFF' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        <div className="container relative z-10 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <Sparkles className="h-12 w-12 text-secondary/80 mx-auto" />
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground">
              {isArabic ? 'احجز زيارتك اليوم' : 'Book Your Visit Today'}
            </h2>
            <p className="text-xl md:text-2xl text-secondary/90 leading-relaxed">
              {isArabic
                ? 'انضم إلينا في رحلة استكشافية لا تُنسى عبر تراث المملكة العربية السعودية'
                : 'Join us on an unforgettable exploratory journey through Saudi heritage'}
            </p>
            <Link to="/book">
              <Button 
                size="lg" 
                className="text-xl px-12 py-8 mt-6 shadow-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-secondary text-accent hover:bg-secondary/90"
              >
                <Calendar className="h-6 w-6 mr-3 rtl:mr-0 rtl:ml-3" />
                {t('home.hero.cta')}
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
