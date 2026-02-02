import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { Ticket, MapPin, Mountain, Star, ChevronDown } from 'lucide-react';
const heroImage = '/images/about-hero-tuwayq.webp';

const AboutPage = () => {
  const { t, isRTL, currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Handle autoplay restrictions gracefully
            });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      
      {/* Hero Section - Extended with integrated highlights */}
      <section className="relative min-h-screen flex flex-col">
        {/* Background Image - Optimized */}
        <div className="absolute inset-0">
          <OptimizedImage 
            src={heroImage} 
            alt="Tuwayq Mountains Landscape" 
            className="w-full h-full"
            priority 
          />
        </div>
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        
        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center justify-center pt-24">
          <div className="container text-center">
            <div className="max-w-3xl mx-auto">
              <span className="inline-block text-accent/90 text-sm md:text-base font-medium tracking-widest uppercase mb-4 animate-fade-in">
                {isArabic ? 'اكتشف تراثنا' : 'Discover Our Heritage'}
              </span>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 animate-fade-in">
                {isArabic ? 'المفيجر' : 'Almufaijer'}
              </h1>
              <div className="w-32 h-1 bg-gradient-to-r from-transparent via-accent to-transparent mx-auto mb-6" />
              <p className="text-white/80 text-lg md:text-xl max-w-xl mx-auto animate-fade-in">
                {isArabic 
                  ? 'رحلة إلى قلب التراث السعودي الأصيل في أحضان جبال طويق'
                  : 'A journey to the heart of authentic Saudi heritage in the Tuwayq Mountains'}
              </p>
            </div>
          </div>
        </div>

        {/* Integrated Highlights - Bottom of Hero */}
        <div className="relative z-10 pb-12 pt-8">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {/* Distance */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center transform hover:scale-105 transition-transform duration-300">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/20 mb-3">
                  <MapPin className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">160 km</h3>
                <p className="text-white/70 text-sm">
                  {isArabic ? 'جنوب الرياض' : 'South of Riyadh'}
                </p>
              </div>

              {/* Location */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center transform hover:scale-105 transition-transform duration-300">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/20 mb-3">
                  <Mountain className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {isArabic ? 'جبال طويق' : 'Tuwayq Mountains'}
                </h3>
                <p className="text-white/70 text-sm">
                  {isArabic ? 'موقع استثنائي' : 'Exceptional Location'}
                </p>
              </div>

              {/* Vision */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center transform hover:scale-105 transition-transform duration-300">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/20 mb-3">
                  <Star className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">2030</h3>
                <p className="text-white/70 text-sm">
                  {isArabic ? 'رؤية المملكة' : 'Saudi Vision'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-6 w-6 text-white/50" />
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            
            {/* Title Row */}
            <div className="text-center mb-12">
              <span className="text-accent text-sm font-medium tracking-widest uppercase mb-3 block">
                {isArabic ? 'قصتنا' : 'Our Story'}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {isArabic ? 'تراث حي ومستقبل واعد' : 'Living Heritage, Promising Future'}
              </h2>
              <div className="w-16 h-1 bg-accent rounded-full mx-auto mb-4" />
              <p className="text-accent/80 text-lg font-medium italic">
                {isArabic ? 'ماضينا • حاضرنا • مستقبلنا' : 'Our Past • Our Present • Our Future'}
              </p>
            </div>

            {/* Video Section */}
            <div className="mb-12">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video max-w-4xl mx-auto">
                <video 
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  controls
                  muted
                  playsInline
                  loop
                  preload="metadata"
                >
                  <source 
                    src="https://hekgkfdunwpxqbrotfpn.supabase.co/storage/v1/object/public/videos/souq-almufaijer-video.mp4" 
                    type="video/mp4" 
                  />
                  {isArabic 
                    ? 'متصفحك لا يدعم عرض الفيديو' 
                    : 'Your browser does not support video playback'}
                </video>
              </div>
            </div>

            {/* Story Content Card */}
            <div className="max-w-4xl mx-auto">
              <div className="glass-card p-8 md:p-10 space-y-6">
                {isArabic ? (
                  <>
                    <p className="text-foreground/80 leading-loose text-base md:text-lg">
                      في قلب المملكة العربية السعودية، على بُعد 160 كم جنوب العاصمة الرياض، تقع قرية المفيجر التابعة لمحافظة الحريق. قرية عريقة نابضة بالجمال والأصالة، سُميت بهذا الاسم لتفجُّرها بالعيون والمياه العذبة.
                    </p>
                    <p className="text-foreground/80 leading-loose text-base md:text-lg">
                      محافظة الحريق العريقة والمعروفة كانت - ولا تزال - محل تقدير قادة مملكتنا الحبيبة منذ عهد جلالة الملك المؤسس عبدالعزيز - رحمه الله - وتوارثها أبناؤه البررة الذين ما فتئوا يُولون هذه المحافظة وما يتبعها من قرى ومراكز رعايتهم واهتمامهم.
                    </p>
                    <p className="text-foreground/80 leading-loose text-base md:text-lg">
                      قرية المفيجر النابضة بالجمال والأصالة والوداعة، السخية في عطائها وكرم أهلها وطيبتهم، والمتفردة بموقعها وغنى أرضها.
                    </p>
                    <div className="border-s-4 border-accent ps-6 py-2 bg-accent/5 rounded-e-lg">
                      <p className="text-foreground font-medium leading-loose text-base md:text-lg">
                        من هنا انطلق مشروع سوق المفيجر - مشروع حضاري يستثمر خيرات هذه الأرض المباركة، ويحتفي بإبراز تراث الآباء والأجداد، ليكون فخرًا للمنطقة والوطن.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-foreground/80 leading-loose text-base md:text-lg">
                      In the heart of Saudi Arabia, 160 km south of Riyadh, lies Almufaijer Village in Al-Hariq Governorate. A historic village pulsing with beauty and authenticity, named after its abundant springs and freshwater.
                    </p>
                    <p className="text-foreground/80 leading-loose text-base md:text-lg">
                      Al-Hariq Governorate has been cherished by the Kingdom's leaders since the era of King Abdulaziz. His successors have continued to bestow their care upon the governorate and its villages.
                    </p>
                    <p className="text-foreground/80 leading-loose text-base md:text-lg">
                      Almufaijer Village - a place of beauty, authenticity, and tranquility. Generous in its offerings, blessed by the warmth of its people, and distinguished by its unique location and fertile land.
                    </p>
                    <div className="border-s-4 border-accent ps-6 py-2 bg-accent/5 rounded-e-lg">
                      <p className="text-foreground font-medium leading-loose text-base md:text-lg">
                        From here, Souq Almufaijer was born - a cultural endeavor that harnesses the treasures of this blessed land, celebrates the heritage of our ancestors, and brings pride to the region and the nation.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section - Compact elegant banner */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-foreground via-foreground/95 to-foreground relative overflow-hidden">
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C9A86C' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2.5l3 3.5-3 3.5z'/%3E%3C/g%3E%3C/svg%3E")` 
          }} />
        </div>
        
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 bg-accent/20 px-6 py-2 rounded-full mb-6">
              <span className="text-accent font-bold text-xl">2030</span>
              <div className="w-[1px] h-5 bg-accent/50" />
              <span className="text-background/80 text-sm font-medium">
                {isArabic ? 'رؤية المملكة' : 'Saudi Vision'}
              </span>
            </div>
            
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-background mb-6">
              {isArabic ? 'رؤيتنا' : 'Our Vision'}
            </h2>
            
            <p className="text-background/70 text-base md:text-lg leading-relaxed max-w-3xl mx-auto">
              {isArabic 
                ? 'مشروع حضاري تنموي استثماري، يحتفي بإبراز تراث الآباء والأجداد، ويُسهم في بناء الوطن عبر منظومة من الأنشطة والفعاليات السياحية والترفيهية المتميزة والفريدة من نوعها. نسعى لنكون جزءًا من رؤية المملكة 2030 التي تستهدف استقبال 100 مليون زائر.'
                : 'A cultural, developmental, and investment endeavor celebrating the heritage of our forefathers, contributing to the nation\'s growth through exceptional tourism and entertainment experiences. We aspire to be an integral part of Saudi Vision 2030, which aims to welcome 100 million visitors.'}
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-background relative">
        <div className="container text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {isArabic ? 'ابدأ رحلتك التراثية' : 'Start Your Heritage Journey'}
            </h2>
            <p className="text-foreground/60 text-lg mb-8">
              {isArabic 
                ? 'احجز تذكرتك الآن واستمتع بتجربة لا تُنسى'
                : 'Book your ticket now and enjoy an unforgettable experience'}
            </p>
            <Link to="/book">
              <Button className="btn-gold text-lg px-10 py-7 glow-gold-hover">
                <Ticket className="h-5 w-5 me-2" />
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

export default AboutPage;
