import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { Clock, MapPin, Landmark, Heart, Calendar, Users, Ticket } from 'lucide-react';
import heroImage from '@/assets/hero-heritage.webp';
import featureHeritage from '@/assets/feature-heritage.webp';
import featureTours from '@/assets/feature-tours.webp';
import featureFamily from '@/assets/feature-family.webp';
const Index = () => {
  const {
    currentLanguage: language,
    isRTL
  } = useLanguage();
  const isArabic = language === 'ar';
  const features = [{
    icon: Landmark,
    image: featureHeritage,
    titleAr: 'التجربة التراثية',
    titleEn: 'Heritage Experience',
    descAr: 'استمتع بتجربة فريدة من التراث السعودي الأصيل',
    descEn: 'Enjoy a unique authentic Saudi heritage experience'
  }, {
    icon: Users,
    image: featureTours,
    titleAr: 'جولات مرشدة',
    titleEn: 'Guided Tours',
    descAr: 'اكتشف القرية التراثية مع مرشدين متخصصين',
    descEn: 'Discover the heritage village with specialized guides'
  }, {
    icon: Heart,
    image: featureFamily,
    titleAr: 'للعائلات',
    titleEn: 'Family Friendly',
    descAr: 'مناسبة للعائلات مع أنشطة لجميع الأعمار',
    descEn: 'Suitable for families with activities for all ages'
  }];
  return <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />

      {/* Hero Section with Background Image */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image - Priority loading for hero (above fold) */}
        <div className="absolute inset-0">
          <OptimizedImage 
            src={heroImage} 
            alt="Souq Almufaijer Heritage Site" 
            className="w-full h-full"
            priority 
          />
          <div className="hero-overlay absolute inset-0" />
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto">
            {/* Glass Card */}
            <div className="hero-glass p-8 md:p-12 text-center">
              {/* Welcome Text */}
              <p className="text-primary/80 text-lg mb-2 opacity-0 animate-slide-up" style={{
              animationDelay: '0.1s',
              animationFillMode: 'forwards'
            }}>
                {isArabic ? 'مرحباً بكم في' : 'Welcome to'}
              </p>
              
              {/* Site Name */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-accent opacity-0 animate-slide-up" style={{
              animationDelay: '0.2s',
              animationFillMode: 'forwards'
            }}>
                {isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}
              </h1>
              
              {/* Tagline */}
              <p className="text-muted-foreground text-lg md:text-xl mb-8 opacity-0 animate-slide-up" style={{
              animationDelay: '0.3s',
              animationFillMode: 'forwards'
            }}>
                {isArabic ? 'تجربة فريدة في قلب جبال طويق الساحرة' : 'A unique experience in the enchanting Tuwayq Mountains'}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 opacity-0 animate-slide-up" style={{
              animationDelay: '0.4s',
              animationFillMode: 'forwards'
            }}>
                <Link to="/book">
                  <Button className="btn-gold text-lg px-8 py-6 w-full sm:w-auto group">
                    <Ticket className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 transition-transform group-hover:scale-110" />
                    {isArabic ? 'احجز زيارتك' : 'Book Your Visit'}
                  </Button>
                </Link>
                <a href="https://maps.app.goo.gl/g4qJ4mM9ZVqg323t8" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="text-lg px-8 py-6 w-full sm:w-auto border-primary/30 hover:bg-primary/5 bg-card/50 transition-all hover:scale-105">
                    <MapPin className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" />
                    {isArabic ? 'الموقع' : 'Location'}
                  </Button>
                </a>
              </div>

              {/* Pricing Pills */}
              <div className="flex flex-wrap justify-center gap-4 opacity-0 animate-slide-up" style={{
              animationDelay: '0.5s',
              animationFillMode: 'forwards'
            }}>
                
                
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section with Images */}
      <section className="py-24 bg-secondary/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
              {isArabic ? 'اكتشف تجربتنا' : 'Discover Our Experience'}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {isArabic ? 'استمتع برحلة عبر الزمن في أحد أجمل المواقع التراثية' : 'Enjoy a journey through time at one of the most beautiful heritage sites'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => <div key={index} className="group glass-card-gold overflow-hidden hover:-translate-y-3 transition-all duration-500" style={{
            animationDelay: `${index * 0.1}s`
          }}>
                {/* Image - Lazy loaded (below fold) */}
                <div className="relative h-48 overflow-hidden">
                  <OptimizedImage 
                    src={feature.image} 
                    alt={isArabic ? feature.titleAr : feature.titleEn} 
                    className="w-full h-full transition-transform duration-500 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                  <div className="absolute bottom-4 left-4 rtl:right-4 rtl:left-auto">
                    <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center glow-gold">
                      <feature.icon className="h-6 w-6 text-foreground" />
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-accent transition-colors">
                    {isArabic ? feature.titleAr : feature.titleEn}
                  </h3>
                  <p className="text-muted-foreground">
                    {isArabic ? feature.descAr : feature.descEn}
                  </p>
                </div>
              </div>)}
          </div>
        </div>
      </section>

      {/* Hours & Location */}
      <section className="py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
              {isArabic ? 'خطط لزيارتك' : 'Plan Your Visit'}
            </h2>
              <p className="text-muted-foreground text-lg">
                {isArabic ? 'ساعات العمل والموقع' : 'Operating Hours & Location'}
              </p>
            </div>

            <div className="glass-card-gold p-8 md:p-12 hover:shadow-2xl transition-shadow duration-500">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Hours */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
                      <Clock className="w-6 h-6 text-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{isArabic ? 'السبت - الخميس' : 'Saturday - Thursday'}</p>
                      <p className="text-accent font-bold">{isArabic ? '٩:٠٠ ص - ٦:٠٠ م' : '9:00 AM - 6:00 PM'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
                      <Clock className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{isArabic ? 'الجمعة' : 'Friday'}</p>
                      <p className="text-destructive font-medium">{isArabic ? 'مغلق' : 'Closed'}</p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex flex-col justify-center">
                  <div className="flex items-start gap-4 mb-6 group">
                    <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
                      <MapPin className="w-6 h-6 text-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">
                        {isArabic ? 'الموقع' : 'Location'}
                      </p>
                      <p className="text-muted-foreground">
                        {isArabic ? 'المفيجر، المملكة العربية السعودية' : 'Almufaijer, Saudi Arabia'}
                      </p>
                    </div>
                  </div>
                  <a href="https://maps.app.goo.gl/g4qJ4mM9ZVqg323t8" target="_blank" rel="noopener noreferrer" className="btn-heritage inline-flex items-center justify-center gap-2 hover:scale-105 transition-transform">
                    <MapPin className="w-5 h-5" />
                    {isArabic ? 'عرض على الخريطة' : 'View on Map'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-heritage text-primary-foreground relative overflow-hidden">
        {/* Decorative Elements - Simplified for performance */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-60 h-60 rounded-full bg-white/10 blur-3xl" />
        </div>
        
        <div className="container text-center relative z-10">
          <h2 className="text-2xl md:text-4xl font-bold mb-4 animate-fade-in">
            {isArabic ? 'احجز زيارتك اليوم' : 'Book Your Visit Today'}
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto text-lg">
            {isArabic ? 'انضم إلينا في رحلة استكشافية لا تُنسى' : 'Join us for an unforgettable exploratory journey'}
          </p>
          <Link to="/book">
            <Button size="lg" className="btn-gold text-lg px-10 py-6 hover:scale-105 transition-transform">
              <Calendar className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0" />
              {isArabic ? 'احجز الآن' : 'Book Now'}
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>;
};
export default Index;
