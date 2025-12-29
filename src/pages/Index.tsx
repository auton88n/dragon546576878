import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, MapPin, Users, Landmark, Heart, Calendar } from 'lucide-react';

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

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/30 to-accent/20" />
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%238B6F47' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="container relative z-10 py-20">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                {isArabic ? (
                  <>مرحباً بكم في<br /><span className="text-primary">سوق المفيجر</span></>
                ) : (
                  <>Welcome to<br /><span className="text-primary">Souq Almufaijer</span></>
                )}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                {isArabic
                  ? 'اكتشف جمال التراث السعودي الأصيل في رحلة عبر الزمن إلى أجواء الماضي العريق'
                  : 'Discover the beauty of authentic Saudi heritage on a journey through time to the glorious past'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/book">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 gap-2">
                  <Calendar className="h-5 w-5" />
                  {t('home.bookNow')}
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8 py-6 gap-2">
                <MapPin className="h-5 w-5" />
                {isArabic ? 'موقعنا' : 'Our Location'}
              </Button>
            </div>

            {/* Quick Info */}
            <div className="flex flex-wrap justify-center gap-6 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>{isArabic ? 'يوميًا ٩ ص - ٦ م' : 'Daily 9 AM - 6 PM'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{isArabic ? 'الرياض' : 'Riyadh'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isArabic ? 'لماذا تزورنا؟' : 'Why Visit Us?'}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {isArabic
                ? 'نقدم لكم تجربة فريدة تجمع بين الأصالة والضيافة السعودية'
                : 'We offer a unique experience combining authenticity and Saudi hospitality'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="heritage-card border-none">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {isArabic ? feature.titleAr : feature.titleEn}
                  </h3>
                  <p className="text-muted-foreground">
                    {isArabic ? feature.descAr : feature.descEn}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Operating Hours Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
                <Clock className="h-8 w-8 text-primary" />
                {isArabic ? 'ساعات العمل' : 'Operating Hours'}
              </h2>
            </div>

            <Card className="heritage-card">
              <CardContent className="p-6">
                <div className="space-y-3">
                  {operatingHours.map((item, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center py-3 border-b border-border/50 last:border-0 ${
                        item.closed ? 'text-muted-foreground' : ''
                      }`}
                    >
                      <span className="font-medium">
                        {isArabic ? item.dayAr : item.dayEn}
                      </span>
                      <span className={item.closed ? 'text-destructive' : 'text-primary font-medium'}>
                        {isArabic ? item.hoursAr : item.hoursEn}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              {isArabic ? 'احجز زيارتك اليوم' : 'Book Your Visit Today'}
            </h2>
            <p className="text-primary-foreground/80 text-lg">
              {isArabic
                ? 'انضم إلينا في رحلة استكشافية لا تُنسى عبر تراث المملكة العربية السعودية'
                : 'Join us on an unforgettable exploratory journey through Saudi heritage'}
            </p>
            <Link to="/book">
              <Button 
                size="lg" 
                variant="secondary"
                className="text-lg px-8 py-6 mt-4"
              >
                {t('home.bookNow')}
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
