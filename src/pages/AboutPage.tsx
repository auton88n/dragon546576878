import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { Ticket, Target, Compass } from 'lucide-react';

const AboutPage = () => {
  const { t, isRTL, currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 md:pt-28 pb-16 bg-gradient-to-b from-secondary via-background to-background">
        <div className="container">
          <div className="text-center py-16 md:py-20">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
              {t('about.title')}
            </h1>
            <div className="w-24 h-1 bg-accent mx-auto rounded-full" />
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-accent mb-4">
              <Compass className="h-5 w-5" />
              <span className="text-sm font-medium uppercase tracking-wider">
                {isArabic ? 'قصتنا' : 'Our Story'}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-relaxed">
              {isArabic 
                ? 'سوق المفيجر: تراث حي ومستقبل واعد'
                : 'Souq Almufaijer: Living Heritage, Promising Future'}
            </h2>
          </div>

          {/* Story Content - Single Column based on language */}
          <div className="max-w-4xl mx-auto">
            <div className="glass-card-gold p-8 md:p-10">
              {isArabic ? (
                <>
                  <p className="text-foreground/80 leading-loose text-base md:text-lg">
                    في قلب المملكة العربية السعودية، على بُعد 160 كم جنوب العاصمة الرياض، تقع قرية المفيجر التابعة لمحافظة الحريق. قرية عريقة نابضة بالجمال والأصالة، سُميت بهذا الاسم لتفجرها بالعيون والمياه العذبة.
                  </p>
                  <p className="text-foreground/80 leading-loose text-base md:text-lg mt-6">
                    في ناحية من نواحي مملكتنا الغالية، وعلى بُعد 160 كم جنوب العاصمة الرياض، تقع محافظة الحريق التابعة لمنطقة الرياض. المحافظة العريقة والمعروفة، والتي كانت ـ وما تزال ـ محل تقدير قادة مملكتنا الحبيبة منذ عهد جلالة الملك المؤسس رحمه الله، وحتى أبناؤه البررة الذين ما فتؤوا يولون هذه المحافظة وما يتبعها من قرى ومراكز عنايتهم المشهودة.
                  </p>
                  <p className="text-foreground/80 leading-loose text-base md:text-lg mt-6">
                    وهناك بالقرب من محافظة الحريق تقع إحدى أبرز القرى والمراكز التابعة لها، وهي قرية (المفيجر). القرية النابضة بالجمال والأصالة والوداعة.. السخية في عطائها وكرم وطيبة أهلها، والمتفردة بموقعها وغنى أرضها.
                  </p>
                  <p className="text-foreground/80 leading-loose text-base md:text-lg mt-6">
                    من هنا انطلق مشروع سوق المفيجر - مشروع حضاري يستثمر خيرات هذه الأرض المباركة، ويحتفي بإبراز تراث الآباء والأجداد، ليكون فخراً للمنطقة والوطن.
                  </p>
                  <p className="text-accent font-bold text-xl mt-8 text-center">
                    ماضينا • حاضرنا • مستقبلنا
                  </p>
                </>
              ) : (
                <>
                  <p className="text-foreground/80 leading-loose text-base md:text-lg">
                    In the heart of Saudi Arabia, 160 km south of Riyadh, lies Almufaijer village in Al-Hariq Governorate. A historic village pulsing with beauty and authenticity, named for its abundant springs and fresh water.
                  </p>
                  <p className="text-foreground/80 leading-loose text-base md:text-lg mt-6">
                    Al-Hariq Governorate has been esteemed by Saudi Arabia's leaders since King Abdulaziz, with continued care from his successors for the governorate and its villages.
                  </p>
                  <p className="text-foreground/80 leading-loose text-base md:text-lg mt-6">
                    Near Al-Hariq lies Almufaijer village - a place of beauty, authenticity, and tranquility, generous in its offerings and the kindness of its people, distinguished by its location and rich land.
                  </p>
                  <p className="text-foreground/80 leading-loose text-base md:text-lg mt-6">
                    From here emerged Souq Almufaijer - a cultural endeavor investing in this blessed land's treasures, celebrating our ancestors' heritage, and bringing pride to the region and nation.
                  </p>
                  <p className="text-accent font-bold text-xl mt-8 text-center">
                    Our Past • Our Present • Our Future
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16 md:py-24 bg-secondary/50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-accent mb-4">
                <Target className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wider">
                  {t('about.vision.title')}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                {isArabic ? 'رؤيتنا' : 'Our Vision'}
              </h2>
            </div>

            <div className="glass-card-gold p-8 md:p-12 text-center">
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
              <div className="mt-10 inline-flex items-center gap-3 bg-accent/10 px-6 py-3 rounded-full">
                <span className="text-accent font-bold text-lg">2030</span>
                <span className="text-foreground/70 text-sm">
                  {isArabic ? 'رؤية المملكة' : 'Saudi Vision'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-foreground to-foreground/90">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-background mb-6">
            {isArabic ? 'ابدأ رحلتك التراثية' : 'Start Your Heritage Journey'}
          </h2>
          <p className="text-background/70 text-lg mb-8 max-w-2xl mx-auto">
            {isArabic 
              ? 'احجز تذكرتك الآن واستمتع بتجربة لا تُنسى في سوق المفيجر'
              : 'Book your ticket now and enjoy an unforgettable experience at Souq Almufaijer'}
          </p>
          <Link to="/book">
            <Button className="btn-gold text-lg px-8 py-6">
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
