import { useState, useMemo } from 'react';
import { Search, Ticket, FileText, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface FAQItem {
  id: string;
  question: { en: string; ar: string };
  answer: { en: string; ar: string };
  category: string;
}

const faqData: FAQItem[] = [
  // Booking & Reservations
  {
    id: 'booking-1',
    category: 'booking',
    question: {
      en: 'How do I book tickets?',
      ar: 'كيف أحجز التذاكر؟'
    },
    answer: {
      en: 'Click "Book Tickets" in the menu, select your ticket type and quantity, choose your preferred date and time, enter your details, and complete the payment. You\'ll receive a confirmation email with your QR codes.',
      ar: 'اضغط على "احجز مكانك" في القائمة، اختر نوع التذكرة والكمية، اختر التاريخ والوقت المفضل، أدخل بياناتك، وأكمل الدفع. ستتلقى بريداً إلكترونياً بالتأكيد مع رموز QR.'
    }
  },
  {
    id: 'booking-2',
    category: 'booking',
    question: {
      en: 'Can I change my booking date?',
      ar: 'هل يمكنني تغيير تاريخ حجزي؟'
    },
    answer: {
      en: 'Yes, you can exchange your ticket for a different date if you contact us at least 3 days before your original visit date. Please note that all ticket sales are final and no refunds are available. Contact our support team via the Contact page with your booking reference to request a date exchange.',
      ar: 'نعم، يمكنك استبدال تذكرتك بتاريخ مختلف إذا تواصلت معنا قبل ٣ أيام على الأقل من تاريخ زيارتك الأصلي. يرجى ملاحظة أن جميع مبيعات التذاكر نهائية ولا يتوفر استرداد. تواصل مع فريق الدعم عبر صفحة التواصل مع رقم الحجز لطلب استبدال التاريخ.'
    }
  },
  {
    id: 'booking-3',
    category: 'booking',
    question: {
      en: 'How many tickets can I book at once?',
      ar: 'كم عدد التذاكر التي يمكنني حجزها مرة واحدة؟'
    },
    answer: {
      en: 'You can book up to 10 tickets per booking. For larger groups (20+ people), please use our Corporate Bookings page for special group rates.',
      ar: 'يمكنك حجز حتى ١٠ تذاكر لكل حجز. للمجموعات الكبيرة (٢٠+ شخص)، يرجى استخدام صفحة حجوزات الشركات للحصول على أسعار خاصة.'
    }
  },
  {
    id: 'booking-4',
    category: 'booking',
    question: {
      en: 'Do children need tickets?',
      ar: 'هل يحتاج الأطفال إلى تذاكر؟'
    },
    answer: {
      en: 'Children under 12 years old need a child ticket at a reduced rate. Children under 3 years old enter free with an adult.',
      ar: 'الأطفال أقل من ١٢ سنة يحتاجون تذكرة طفل بسعر مخفض. الأطفال أقل من ٣ سنوات يدخلون مجاناً مع شخص بالغ.'
    }
  },
  // Tickets & QR Codes
  {
    id: 'tickets-1',
    category: 'tickets',
    question: {
      en: "I didn't receive my confirmation email",
      ar: 'لم أستلم بريد التأكيد الإلكتروني'
    },
    answer: {
      en: 'Please check your spam/junk folder. If you still can\'t find it, go to "My Tickets" page and enter the email you used for booking to retrieve your tickets.',
      ar: 'يرجى التحقق من مجلد البريد العشوائي. إذا لم تجده، اذهب إلى صفحة "تذاكري" وأدخل البريد الإلكتروني الذي استخدمته للحجز لاسترجاع تذاكرك.'
    }
  },
  {
    id: 'tickets-2',
    category: 'tickets',
    question: {
      en: 'How do I download my QR code?',
      ar: 'كيف أحمّل رمز QR الخاص بي؟'
    },
    answer: {
      en: 'You can download your QR code from the confirmation email or from the "My Tickets" page. Click on the download button next to each ticket.',
      ar: 'يمكنك تحميل رمز QR من البريد الإلكتروني للتأكيد أو من صفحة "تذاكري". اضغط على زر التحميل بجانب كل تذكرة.'
    }
  },
  {
    id: 'tickets-3',
    category: 'tickets',
    question: {
      en: 'What if my QR code won\'t scan?',
      ar: 'ماذا لو لم يتم مسح رمز QR الخاص بي؟'
    },
    answer: {
      en: 'Make sure your screen brightness is high and the QR code is clearly visible. Our staff can also look up your booking using your reference number or email.',
      ar: 'تأكد من أن سطوع الشاشة مرتفع وأن رمز QR واضح. يمكن لموظفينا أيضاً البحث عن حجزك باستخدام رقم المرجع أو البريد الإلكتروني.'
    }
  },
  // Payments & Refunds
  {
    id: 'payments-1',
    category: 'payments',
    question: {
      en: 'What payment methods do you accept?',
      ar: 'ما هي طرق الدفع التي تقبلونها؟'
    },
    answer: {
      en: 'We accept Visa, Mastercard, and mada debit cards. All payments are processed securely through our payment gateway.',
      ar: 'نقبل فيزا، ماستركارد، وبطاقات مدى. جميع المدفوعات تتم بشكل آمن من خلال بوابة الدفع الخاصة بنا.'
    }
  },
  {
    id: 'payments-2',
    category: 'payments',
    question: {
      en: 'My payment failed. What should I do?',
      ar: 'فشل الدفع. ماذا أفعل؟'
    },
    answer: {
      en: 'Please try again with a different card or check with your bank. If the issue persists, contact our support team for assistance.',
      ar: 'يرجى المحاولة مرة أخرى ببطاقة مختلفة أو التحقق مع البنك. إذا استمرت المشكلة، تواصل مع فريق الدعم للمساعدة.'
    }
  },
  {
    id: 'payments-3',
    category: 'payments',
    question: {
      en: 'What is your refund policy?',
      ar: 'ما هي سياسة الاسترداد؟'
    },
    answer: {
      en: 'All ticket sales are final and non-refundable. However, you may exchange your ticket for a different date if you notify us at least 3 days before your scheduled visit. For date exchanges, please contact our support team via the Contact page with your booking reference.',
      ar: 'جميع مبيعات التذاكر نهائية وغير قابلة للاسترداد. ومع ذلك، يمكنك استبدال تذكرتك بتاريخ مختلف إذا أبلغتنا قبل ٣ أيام على الأقل من موعد زيارتك. لاستبدال التاريخ، يرجى التواصل مع فريق الدعم عبر صفحة التواصل مع رقم الحجز.'
    }
  },
  {
    id: 'payments-4',
    category: 'payments',
    question: {
      en: 'What happens if I miss my visit date?',
      ar: 'ماذا يحدث إذا فاتني موعد زيارتي؟'
    },
    answer: {
      en: 'If you miss your scheduled visit date without contacting us at least 3 days in advance, your ticket will expire and no refund or exchange will be available. We recommend setting a reminder for your visit date.',
      ar: 'إذا فاتك موعد زيارتك المحدد دون التواصل معنا قبل ٣ أيام على الأقل، ستنتهي صلاحية تذكرتك ولن يتوفر استرداد أو استبدال. ننصح بضبط تذكير لموعد زيارتك.'
    }
  },
  // Visiting Information
  {
    id: 'visiting-1',
    category: 'visiting',
    question: {
      en: 'What are your opening hours?',
      ar: 'ما هي ساعات العمل؟'
    },
    answer: {
      en: 'We are open Saturday to Thursday from 9:00 AM to 6:00 PM. Last entry is at 5:00 PM. We are closed on Fridays.',
      ar: 'نحن مفتوحون من السبت إلى الخميس من ٩:٠٠ صباحاً إلى ٦:٠٠ مساءً. آخر دخول في ٥:٠٠ مساءً. مغلقون يوم الجمعة.'
    }
  },
  {
    id: 'visiting-2',
    category: 'visiting',
    question: {
      en: 'Where are you located?',
      ar: 'أين موقعكم؟'
    },
    answer: {
      en: 'Souq Almufaijer is located in Almufaijer, Saudi Arabia. You can find directions on Google Maps by searching "Souq Almufaijer".',
      ar: 'يقع سوق المفيجر في المفيجر، المملكة العربية السعودية. يمكنك العثور على الاتجاهات على خرائط جوجل بالبحث عن "سوق المفيجر".'
    }
  },
  {
    id: 'visiting-3',
    category: 'visiting',
    question: {
      en: 'Is the venue wheelchair accessible?',
      ar: 'هل الموقع مناسب لذوي الاحتياجات الخاصة؟'
    },
    answer: {
      en: 'Yes, our heritage site is accessible for visitors with mobility needs. Please inform our staff upon arrival for any special assistance.',
      ar: 'نعم، موقعنا التراثي مجهز لذوي الاحتياجات الخاصة. يرجى إبلاغ موظفينا عند الوصول لأي مساعدة خاصة.'
    }
  },
  {
    id: 'visiting-4',
    category: 'visiting',
    question: {
      en: 'What should I bring?',
      ar: 'ماذا يجب أن أحضر؟'
    },
    answer: {
      en: 'Bring your QR code ticket (printed or on phone), comfortable walking shoes, and a camera for photos. Water bottles are recommended, especially during summer.',
      ar: 'أحضر تذكرة رمز QR (مطبوعة أو على الهاتف)، أحذية مريحة للمشي، وكاميرا للصور. ينصح بإحضار زجاجات ماء، خاصة في الصيف.'
    }
  },
  // Technical Support
  {
    id: 'technical-1',
    category: 'technical',
    question: {
      en: 'The website is not working properly',
      ar: 'الموقع لا يعمل بشكل صحيح'
    },
    answer: {
      en: 'Please try refreshing the page or clearing your browser cache. If the issue persists, try using a different browser or contact our support team.',
      ar: 'يرجى تحديث الصفحة أو مسح ذاكرة التخزين المؤقت للمتصفح. إذا استمرت المشكلة، جرب متصفحاً آخر أو تواصل مع فريق الدعم.'
    }
  },
];

const categories = [
  { id: 'all', labelEn: 'All Questions', labelAr: 'جميع الأسئلة', icon: HelpCircle },
  { id: 'booking', labelEn: 'Booking & Reservations', labelAr: 'الحجز والحجوزات', icon: Ticket },
  { id: 'tickets', labelEn: 'Tickets & QR Codes', labelAr: 'التذاكر ورموز QR', icon: FileText },
  { id: 'payments', labelEn: 'Payments & Refunds', labelAr: 'الدفع والاسترداد', icon: FileText },
  { id: 'visiting', labelEn: 'Visiting Information', labelAr: 'معلومات الزيارة', icon: FileText },
  { id: 'technical', labelEn: 'Technical Support', labelAr: 'الدعم التقني', icon: HelpCircle },
];

const FAQAccordion = ({ item, isOpen, onToggle, isArabic }: { 
  item: FAQItem; 
  isOpen: boolean; 
  onToggle: () => void;
  isArabic: boolean;
}) => (
  <div className="border border-border rounded-xl overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-5 py-4 flex items-center justify-between text-start bg-card hover:bg-secondary/50 transition-colors"
    >
      <span className="font-medium text-foreground">
        {isArabic ? item.question.ar : item.question.en}
      </span>
      {isOpen ? (
        <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0 ms-2" />
      ) : (
        <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0 ms-2" />
      )}
    </button>
    {isOpen && (
      <div className="px-5 py-4 bg-secondary/30 border-t border-border">
        <p className="text-muted-foreground leading-relaxed">
          {isArabic ? item.answer.ar : item.answer.en}
        </p>
      </div>
    )}
  </div>
);

const SupportPage = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

  const filteredFAQs = useMemo(() => {
    return faqData.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        item.question.en.toLowerCase().includes(searchLower) ||
        item.question.ar.includes(searchQuery) ||
        item.answer.en.toLowerCase().includes(searchLower) ||
        item.answer.ar.includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[280px] max-h-[400px] bg-foreground overflow-hidden">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/90 via-foreground to-foreground" />
        
        {/* Hero Content - centered */}
        <div className="absolute inset-0 flex items-center justify-center pt-16">
          <div className="text-center px-4 w-full max-w-2xl">
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-6 py-6 shadow-2xl">
              <div className="flex items-center justify-center gap-4 mb-3">
                <HelpCircle className="h-8 w-8 text-accent" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                  {isArabic ? 'المساعدة والدعم' : 'Help & Support'}
                </h1>
              </div>
              <p className="text-white/70 text-sm md:text-base mb-5">
                {isArabic 
                  ? 'ابحث عن إجابات لأسئلتك أو تحدث مع فريق الدعم'
                  : 'Find answers to your questions or chat with our support team'}
              </p>
              
              {/* Search Bar - inside card */}
              <div className="relative max-w-md mx-auto">
                <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isArabic ? 'ابحث عن مساعدة...' : 'Search for help...'}
                  className="ps-12 h-12 text-base rounded-xl bg-white shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 py-12">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Categories Sidebar */}
            <aside className="lg:col-span-1">
              <div className="sticky top-24 space-y-2">
                <h2 className="font-semibold text-foreground mb-4">
                  {isArabic ? 'التصنيفات' : 'Categories'}
                </h2>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-start transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80 text-foreground'
                    }`}
                  >
                    <cat.icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">
                      {isArabic ? cat.labelAr : cat.labelEn}
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            {/* FAQ List */}
            <div className="lg:col-span-3 space-y-4">
              <h2 className="font-semibold text-foreground mb-6">
                {isArabic ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
                <span className="text-muted-foreground font-normal ms-2">
                  ({filteredFAQs.length})
                </span>
              </h2>
              
              {filteredFAQs.length === 0 ? (
                <div className="text-center py-12 bg-secondary/30 rounded-xl">
                  <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {isArabic 
                      ? 'لم يتم العثور على نتائج. جرب كلمات بحث مختلفة.'
                      : 'No results found. Try different search terms.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFAQs.map((item) => (
                    <FAQAccordion
                      key={item.id}
                      item={item}
                      isOpen={openFAQ === item.id}
                      onToggle={() => setOpenFAQ(openFAQ === item.id ? null : item.id)}
                      isArabic={isArabic}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <section className="mt-16 pt-12 border-t border-border">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              {isArabic ? 'إجراءات سريعة' : 'Quick Actions'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Link to="/book" className="group">
                <div className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-lg transition-all hover:border-primary/50">
                  <Ticket className="w-10 h-10 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold text-foreground mb-2">
                    {isArabic ? 'احجز تذكرتك' : 'Book Tickets'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? 'احجز زيارتك الآن' : 'Book your visit now'}
                  </p>
                </div>
              </Link>
              <Link to="/my-tickets" className="group">
                <div className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-lg transition-all hover:border-primary/50">
                  <FileText className="w-10 h-10 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold text-foreground mb-2">
                    {isArabic ? 'تذاكري' : 'My Tickets'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? 'عرض تذاكرك' : 'View your tickets'}
                  </p>
                </div>
              </Link>
              <Link to="/contact" className="group">
                <div className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-lg transition-all hover:border-primary/50">
                  <HelpCircle className="w-10 h-10 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold text-foreground mb-2">
                    {isArabic ? 'تواصل معنا' : 'Contact Us'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? 'أرسل لنا رسالة' : 'Send us a message'}
                  </p>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SupportPage;
