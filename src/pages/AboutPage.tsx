import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { Ticket, Target, Compass, MapPin, Mountain, Users } from 'lucide-react';
import heroImage from '@/assets/about-hero-tuwayq.jpg';

const AboutPage = () => {
  const { t, isRTL, currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      
      {/* Hero Section with Full Background */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        {/* Overlay */}
        <div className="hero-overlay" />
        
        {/* Content */}
        <div className="relative z-10 container text-center py-32">
          <div className="hero-glass inline-block px-8 py-10 md:px-16 md:py-14 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              {t('about.title')}
            </h1>
            <div className="w-24 h-1 bg-accent mx-auto rounded-full mb-4" />
            <p className="text-white/80 text-lg md:text-xl max-w-xl mx-auto">
              {isArabic 
                ? 'اكتشف قصة تراثنا العريق في قلب جبال طويق'
                : 'Discover our rich heritage story in the heart of Tuwayq Mountains'}
            </p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-float">
          <div className="w-6 h-10 rounded-full border-2 border-white/50 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/70 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-12 bg-secondary/30">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Distance */}
            <div className="glass-card-gold p-6 text-center animate-slide-up">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/20 mb-4">
                <MapPin className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-3xl font-bold text-accent mb-1">160 km</h3>
              <p className="text-foreground/70 text-sm">
                {isArabic ? 'جنوب الرياض' : 'South of Riyadh'}
              </p>
            </div>

            {/* Location */}
            <div className="glass-card-gold p-6 text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/20 mb-4">
                <Mountain className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">
                {isArabic ? 'جبال طويق' : 'Tuwayq Mountains'}
              </h3>
              <p className="text-foreground/70 text-sm">
                {isArabic ? 'موقع استثنائي' : 'Exceptional Location'}
              </p>
            </div>

            {/* Vision */}
            <div className="glass-card-gold p-6 text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/20 mb-4">
                <Users className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-3xl font-bold text-accent mb-1">2030</h3>
              <p className="text-foreground/70 text-sm">
                {isArabic ? 'رؤية المملكة' : 'Saudi Vision'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 md:py-28 bg-background relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-20 start-10 w-32 h-32 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 end-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container relative">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-accent mb-4">
              <div className="w-8 h-[1px] bg-accent" />
              <Compass className="h-5 w-5" />
              <div className="w-8 h-[1px] bg-accent" />
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {isArabic ? 'قصتنا' : 'Our Story'}
            </h2>
            <p className="text-accent text-lg font-medium">
              {isArabic 
                ? 'سوق المفيجر: تراث حي ومستقبل واعد'
                : 'Souq Almufaijer: Living Heritage, Promising Future'}
            </p>
          </div>

          {/* Story Content */}
          <div className="max-w-4xl mx-auto space-y-6">
            {isArabic ? (
              <>
                <div className="glass-card p-6 md:p-8 border-s-4 border-accent">
                  <p className="text-foreground/80 leading-loose text-base md:text-lg">
                    في قلب المملكة العربية السعودية، على بُعد 160 كم جنوب العاصمة الرياض، تقع قرية المفيجر التابعة لمحافظة الحريق. قرية عريقة نابضة بالجمال والأصالة، سُميت بهذا الاسم لتفجرها بالعيون والمياه العذبة.
                  </p>
                </div>
                <div className="glass-card p-6 md:p-8">
                  <p className="text-foreground/80 leading-loose text-base md:text-lg">
                    في ناحية من نواحي مملكتنا الغالية، وعلى بُعد 160 كم جنوب العاصمة الرياض، تقع محافظة الحريق التابعة لمنطقة الرياض. المحافظة العريقة والمعروفة، والتي كانت ـ وما تزال ـ محل تقدير قادة مملكتنا الحبيبة منذ عهد جلالة الملك المؤسس رحمه الله، وحتى أبناؤه البررة الذين ما فتؤوا يولون هذه المحافظة وما يتبعها من قرى ومراكز عنايتهم المشهودة.
                  </p>
                </div>
                <div className="glass-card p-6 md:p-8">
                  <p className="text-foreground/80 leading-loose text-base md:text-lg">
                    وهناك بالقرب من محافظة الحريق تقع إحدى أبرز القرى والمراكز التابعة لها، وهي قرية (المفيجر). القرية النابضة بالجمال والأصالة والوداعة.. السخية في عطائها وكرم وطيبة أهلها، والمتفردة بموقعها وغنى أرضها.
                  </p>
                </div>
                <div className="glass-card-gold p-6 md:p-8 border-e-4 border-accent">
                  <p className="text-foreground/80 leading-loose text-base md:text-lg">
                    من هنا انطلق مشروع سوق المفيجر - مشروع حضاري يستثمر خيرات هذه الأرض المباركة، ويحتفي بإبراز تراث الآباء والأجداد، ليكون فخراً للمنطقة والوطن.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="glass-card p-6 md:p-8 border-s-4 border-accent">
                  <p className="text-foreground/80 leading-loose text-base md:text-lg">
                    In the heart of Saudi Arabia, 160 km south of Riyadh, lies Almufaijer village in Al-Hariq Governorate. A historic village pulsing with beauty and authenticity, named for its abundant springs and fresh water.
                  </p>
                </div>
                <div className="glass-card p-6 md:p-8">
                  <p className="text-foreground/80 leading-loose text-base md:text-lg">
                    Al-Hariq Governorate has been esteemed by Saudi Arabia's leaders since King Abdulaziz, with continued care from his successors for the governorate and its villages.
                  </p>
                </div>
                <div className="glass-card p-6 md:p-8">
                  <p className="text-foreground/80 leading-loose text-base md:text-lg">
                    Near Al-Hariq lies Almufaijer village - a place of beauty, authenticity, and tranquility, generous in its offerings and the kindness of its people, distinguished by its location and rich land.
                  </p>
                </div>
                <div className="glass-card-gold p-6 md:p-8 border-e-4 border-accent">
                  <p className="text-foreground/80 leading-loose text-base md:text-lg">
                    From here emerged Souq Almufaijer - a cultural endeavor investing in this blessed land's treasures, celebrating our ancestors' heritage, and bringing pride to the region and nation.
                  </p>
                </div>
              </>
            )}

            {/* Tagline */}
            <div className="text-center pt-8">
              <div className="inline-flex items-center gap-4">
                <div className="w-12 h-[1px] bg-accent/50" />
                <p className="text-accent font-bold text-xl md:text-2xl">
                  {isArabic ? 'ماضينا • حاضرنا • مستقبلنا' : 'Our Past • Our Present • Our Future'}
                </p>
                <div className="w-12 h-[1px] bg-accent/50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/50 via-secondary/30 to-background" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%238B7355' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
          }} />
        </div>
        
        <div className="container relative">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-accent mb-4">
                <div className="w-8 h-[1px] bg-accent" />
                <Target className="h-5 w-5" />
                <div className="w-8 h-[1px] bg-accent" />
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                {isArabic ? 'رؤيتنا' : 'Our Vision'}
              </h2>
            </div>

            <div className="glass-card-gold p-8 md:p-12 text-center relative overflow-hidden">
              {/* Decorative corner */}
              <div className="absolute top-0 end-0 w-20 h-20 bg-accent/10 rounded-bl-full" />
              <div className="absolute bottom-0 start-0 w-16 h-16 bg-accent/10 rounded-tr-full" />
              
              {isArabic ? (
                <>
                  <p className="text-foreground/80 leading-loose text-base md:text-lg mb-6">
                    مشروع حضاري تنموي استثماري، يحتفي بإبراز تراث الآباء والأجداد، ويسهم في بناء الوطن عبر منظومة من الأنشطة والفعاليات السياحية والترفيهية المتميزة والفريدة من نوعها.
                  </p>
                  <p className="text-foreground/80 leading-loose text-base md:text-lg">
                    نسعى لنكون جزءاً من رؤية المملكة 2030، المستهدفة لاستقبال 100 مليون زائر بحلول عام 2030.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-foreground/80 leading-loose text-base md:text-lg mb-6">
                    A cultural, developmental, and investment project celebrating our ancestors' heritage, contributing to the nation's development through unique tourism and entertainment activities.
                  </p>
                  <p className="text-foreground/80 leading-loose text-base md:text-lg">
                    We strive to be part of Saudi Vision 2030, targeting 100 million visitors by 2030.
                  </p>
                </>
              )}

              {/* Vision 2030 Badge */}
              <div className="mt-10 inline-flex items-center gap-4 bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 px-8 py-4 rounded-full border border-accent/30">
                <span className="text-accent font-bold text-2xl md:text-3xl">2030</span>
                <div className="w-[1px] h-8 bg-accent/30" />
                <span className="text-foreground/70 text-base md:text-lg font-medium">
                  {isArabic ? 'رؤية المملكة' : 'Saudi Vision'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        {/* Background with pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/95 to-foreground" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")` 
          }} />
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-10 start-10 w-20 h-20 bg-accent/10 rounded-full blur-2xl animate-float" />
        <div className="absolute bottom-10 end-10 w-24 h-24 bg-accent/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
        
        <div className="container relative text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-background mb-6">
            {isArabic ? 'ابدأ رحلتك التراثية' : 'Start Your Heritage Journey'}
          </h2>
          <p className="text-background/70 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            {isArabic 
              ? 'احجز تذكرتك الآن واستمتع بتجربة لا تُنسى في سوق المفيجر'
              : 'Book your ticket now and enjoy an unforgettable experience at Souq Almufaijer'}
          </p>
          <Link to="/book">
            <Button className="btn-gold text-lg px-10 py-7 glow-gold-hover">
              <Ticket className="h-5 w-5 me-2" />
              {t('home.hero.cta')}
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
