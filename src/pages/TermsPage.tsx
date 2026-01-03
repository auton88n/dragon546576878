import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { FileText, AlertTriangle, Calendar, Clock, Mail, Phone, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsPage = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <Header />
      
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[280px] max-h-[400px] bg-foreground overflow-hidden">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/90 via-foreground to-foreground" />
        
        {/* Hero Content - positioned at bottom */}
        <div className="absolute inset-0 flex items-end justify-center pb-8 md:pb-10">
          <div className="text-center px-4">
            <div className="inline-block backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-8 py-6 shadow-2xl">
              <div className="flex items-center justify-center gap-4 mb-2">
                <FileText className="h-8 w-8 text-accent" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                  {isArabic ? 'سياسة الاستبدال والشروط' : 'Exchange Policy & Terms'}
                </h1>
              </div>
              <p className="text-white/70 text-sm md:text-base">
                {isArabic 
                  ? 'آخر تحديث: 3 يناير 2026'
                  : 'Last Updated: January 3, 2026'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-grow py-12">
        <div className="container max-w-4xl">
          <div className="space-y-10">

            {/* No Refund Policy */}
            <section className="p-6 bg-destructive/10 border border-destructive/30 rounded-2xl">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-8 w-8 text-destructive shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-bold text-destructive mb-3">
                    {isArabic ? 'سياسة عدم الاسترجاع' : 'No Refund Policy'}
                  </h2>
                  <p className="text-foreground font-medium">
                    {isArabic 
                      ? 'لا يوجد استرجاع لقيمة التذكرة نهائياً. جميع مبيعات التذاكر نهائية ولا يمكن استرجاع قيمتها المالية تحت أي ظرف من الظروف.'
                      : 'No refunds on ticket purchases under any circumstances. All ticket sales are final and non-refundable. The ticket price cannot be refunded in cash or credited back to your account under any condition.'}
                  </p>
                </div>
              </div>
            </section>

            {/* Exchange Policy */}
            <section className="p-6 bg-accent/10 border border-accent/30 rounded-2xl">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3">
                <Calendar className="h-6 w-6 text-accent" />
                {isArabic ? 'سياسة استبدال تاريخ الزيارة' : 'Visit Date Exchange Policy'}
              </h2>
              
              <p className="text-foreground mb-4 font-medium">
                {isArabic 
                  ? 'يمكنك استبدال تاريخ زيارتك بشرط واحد فقط:'
                  : 'You may exchange your visit date with one strict condition:'}
              </p>
              
              <div className="p-4 bg-accent/20 rounded-xl mb-6">
                <p className="text-foreground font-semibold text-center">
                  {isArabic 
                    ? 'التواصل معنا عبر نموذج الموقع الإلكتروني قبل 3 أيام على الأقل من موعد الزيارة الأصلي'
                    : 'Contact us through the website contact form at least 3 days before your original visit date'}
                </p>
              </div>

              <h3 className="font-semibold text-foreground mb-3">
                {isArabic ? 'شروط الاستبدال:' : 'Exchange Terms:'}
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                {(isArabic ? [
                  'يجب التواصل معنا قبل 72 ساعة (3 أيام كاملة) كحد أدنى من تاريخ الزيارة',
                  'التواصل عبر نموذج الموقع الإلكتروني الرسمي فقط',
                  'الاستبدال متاح لمرة واحدة فقط لكل تذكرة',
                  'الاستبدال حسب توفر المواعيد',
                  'الاستبدال الأول مجاني بدون أي رسوم',
                  'في حالة التواصل بعد 3 أيام، تُعتبر التذكرة منتهية الصلاحية'
                ] : [
                  'You must contact us at least 72 hours (3 full days) before your visit date',
                  'Contact must be made through the official website contact form only',
                  'Exchange is available once only per ticket',
                  'Exchange subject to date availability',
                  'First exchange is free with no fees',
                  'If you contact us after the 3-day deadline, the ticket is considered expired'
                ]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Official Contact Channel */}
            <section className="p-6 bg-primary/10 border border-primary/30 rounded-2xl">
              <h2 className="text-xl font-bold text-foreground mb-4">
                {isArabic ? 'قناة التواصل الرسمية الوحيدة' : 'The Only Official Contact Channel'}
              </h2>
              
              <div className="p-4 bg-background rounded-xl border-2 border-accent mb-4">
                <p className="font-mono text-accent text-center font-bold">
                  <Link to="/contact" className="hover:underline">
                    https://almufaijer.com/contact
                  </Link>
                </p>
              </div>
              
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <p className="text-amber-700 dark:text-amber-400 font-medium text-sm">
                  <strong>{isArabic ? 'تنبيه هام:' : 'Important Notice:'}</strong>{' '}
                  {isArabic 
                    ? 'هذه هي القناة الرسمية الوحيدة المعتمدة. أي تواصل عبر قنوات أخرى (واتساب، مكالمات هاتفية، بريد إلكتروني، حسابات شخصية، أو صفحات غير موثقة) لن يُعتمد ولن يُقبل طلب الاستبدال.'
                    : 'This is the ONLY approved official channel for communication. Any contact through other channels (WhatsApp, phone calls, email, personal accounts, or unverified pages) will NOT be accepted and exchange requests will be rejected.'}
                </p>
              </div>
            </section>

            {/* How to Request Exchange */}
            <section className="p-6 border border-border rounded-2xl">
              <h2 className="text-xl font-bold text-foreground mb-6">
                {isArabic ? 'كيفية طلب الاستبدال' : 'How to Request an Exchange'}
              </h2>

              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full gradient-gold text-foreground flex items-center justify-center font-bold shrink-0">1</div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {isArabic ? 'تقديم الطلب (قبل 3 أيام من الموعد)' : 'Submit Request (3 Days Before Visit)'}
                    </h3>
                    <ul className="text-muted-foreground text-sm space-y-1">
                      <li>{isArabic ? 'ادخل على الموقع' : 'Visit the website'}: <Link to="/contact" className="text-accent hover:underline">almufaijer.com/contact</Link></li>
                      <li>{isArabic ? 'املأ نموذج التواصل بالمعلومات المطلوبة' : 'Fill out the contact form with required information'}</li>
                      <li>{isArabic ? 'تأكد من الإرسال خلال ساعات العمل الرسمية' : 'Ensure submission is made during official business hours'}</li>
                    </ul>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full gradient-gold text-foreground flex items-center justify-center font-bold shrink-0">2</div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {isArabic ? 'المعلومات المطلوبة' : 'Required Information'}
                    </h3>
                    <ul className="text-muted-foreground text-sm space-y-1">
                      <li>• {isArabic ? 'رقم الحجز (Booking ID)' : 'Booking ID'}</li>
                      <li>• {isArabic ? 'الاسم الكامل كما هو مسجل في الحجز' : 'Full name as registered in booking'}</li>
                      <li>• {isArabic ? 'رقم الجوال المسجل في الحجز' : 'Mobile number as registered in booking'}</li>
                      <li>• {isArabic ? 'البريد الإلكتروني المسجل في الحجز' : 'Email address as registered in booking'}</li>
                      <li>• {isArabic ? 'التاريخ الأصلي للزيارة' : 'Original visit date'}</li>
                      <li>• {isArabic ? 'التاريخ الجديد المطلوب' : 'Requested new date'}</li>
                    </ul>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full gradient-gold text-foreground flex items-center justify-center font-bold shrink-0">3</div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {isArabic ? 'انتظار الرد الرسمي' : 'Wait for Official Response'}
                    </h3>
                    <ul className="text-muted-foreground text-sm space-y-1">
                      <li>• {isArabic ? 'سنراجع طلبك خلال 24 ساعة عمل' : 'We will review your request within 24 business hours'}</li>
                      <li>• {isArabic ? 'سنرسل تأكيداً رسمياً عبر بريدك الإلكتروني المسجل' : 'We will send official confirmation via your registered email address'}</li>
                      <li>• {isArabic ? 'عند الموافقة، سنرسل لك تذكرة جديدة بالتاريخ المعدّل' : 'Upon approval, we will send you a new ticket with the modified date'}</li>
                    </ul>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full gradient-gold text-foreground flex items-center justify-center font-bold shrink-0">4</div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {isArabic ? 'التأكيد النهائي' : 'Final Confirmation'}
                    </h3>
                    <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                      {isArabic 
                        ? 'تنبيه: الاستبدال غير مؤكد حتى تستلم رسالة تأكيد رسمية عبر بريدك الإلكتروني. لا تعتمد على أي تأكيد شفهي أو غير موثق كتابياً.'
                        : 'Notice: Exchange is not confirmed until you receive an official confirmation message via email. Do not rely on any verbal or undocumented confirmations.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Non-Exchangeable Cases */}
            <section className="p-6 bg-destructive/5 border border-destructive/20 rounded-2xl">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3">
                <XCircle className="h-6 w-6 text-destructive" />
                {isArabic ? 'حالات عدم قبول الاستبدال' : 'Non-Exchangeable Cases'}
              </h2>
              
              <p className="text-muted-foreground mb-4">
                {isArabic ? 'لا يمكن استبدال التذكرة في الحالات التالية:' : 'Tickets CANNOT be exchanged in the following cases:'}
              </p>
              
              <ul className="space-y-2 text-muted-foreground">
                {(isArabic ? [
                  'التواصل بعد انقضاء مدة 3 أيام من الموعد الأصلي',
                  'التواصل عبر أي قناة غير نموذج الموقع الرسمي',
                  'التذكرة المستخدمة (تم مسحها ضوئياً عند الدخول)',
                  'بعد انتهاء تاريخ الزيارة الأصلي',
                  'عدم الحضور (No-Show) بدون تواصل مسبق',
                  'التذكرة التي سبق استبدالها (الاستبدال لمرة واحدة فقط)',
                  'التذاكر الترويجية أو المجانية (إلا إذا نُص على خلاف ذلك)',
                  'عدم تقديم المعلومات المطلوبة كاملة',
                  'الطلبات المرسلة خارج ساعات العمل (تُعالج في يوم العمل التالي)'
                ] : [
                  'Contact made after the 3-day deadline from original date',
                  'Contact made through any channel other than the official website form',
                  'Ticket already used (scanned at entry)',
                  'After the original visit date has passed',
                  'No-show without prior contact',
                  'Ticket already exchanged once (one exchange only)',
                  'Promotional or complimentary tickets (unless stated otherwise)',
                  'Incomplete information provided',
                  'Requests submitted outside business hours (processed next business day)'
                ]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Important Notes */}
            <section className="p-6 border border-border rounded-2xl">
              <h2 className="text-xl font-bold text-foreground mb-4">
                {isArabic ? 'ملاحظات مهمة' : 'Important Notes'}
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-foreground mb-3">
                    {isArabic ? 'معلومات أساسية:' : 'Essential Information:'}
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• {isArabic ? 'لا يوجد استرجاع مالي تحت أي ظرف' : 'No monetary refund under any circumstances'}</li>
                    <li>• {isArabic ? 'الاستبدال خدمة مجانية لمرة واحدة فقط' : 'Exchange is a free one-time service'}</li>
                    <li>• {isArabic ? 'الالتزام بموعد 3 أيام شرط إلزامي' : 'The 3-day advance notice is mandatory'}</li>
                    <li>• {isArabic ? 'التواصل عبر نموذج الموقع فقط' : 'Contact through website form only'}</li>
                    <li>• {isArabic ? 'التاريخ الجديد حسب التوفر' : 'New date subject to availability'}</li>
                    <li>• {isArabic ? 'جميع الأوقات بتوقيت المملكة' : 'All times in Saudi Arabia Time Zone'}</li>
                    <li>• {isArabic ? '3 أيام = 72 ساعة كاملة قبل الموعد' : '3 days = 72 full hours before visit date'}</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-accent" />
                    {isArabic ? 'ساعات العمل الرسمية:' : 'Official Business Hours:'}
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• {isArabic ? 'السبت - الخميس: 9:00 صباحاً - 6:00 مساءً' : 'Saturday - Thursday: 9:00 AM - 6:00 PM'}</li>
                    <li>• {isArabic ? 'الجمعة: مغلق' : 'Friday: Closed'}</li>
                    <li className="text-xs text-muted-foreground/70">
                      {isArabic 
                        ? 'الطلبات خارج هذه الأوقات تُعالج في يوم العمل التالي'
                        : 'Requests outside these hours are processed the next business day'}
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Disclaimer */}
            <section className="p-6 bg-muted/50 border border-border rounded-2xl">
              <h2 className="text-xl font-bold text-foreground mb-4">
                {isArabic ? 'إخلاء المسؤولية' : 'Disclaimer'}
              </h2>
              
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• {isArabic 
                  ? 'سوق المفيجر غير مسؤول عن طلبات الاستبدال المرسلة عبر قنوات غير رسمية'
                  : 'Souq Almufaijer is not responsible for exchange requests sent through unofficial channels'}</li>
                <li>• {isArabic 
                  ? 'سوق المفيجر غير مسؤول عن أي تأكيدات شفهية غير موثقة رسمياً'
                  : 'Souq Almufaijer is not responsible for any verbal confirmations not officially documented'}</li>
                <li>• {isArabic 
                  ? 'الاستبدال غير مضمون حتى استلام تأكيد رسمي مكتوب عبر البريد الإلكتروني'
                  : 'Exchange is not guaranteed until official written confirmation is received via email'}</li>
                <li>• {isArabic 
                  ? 'في حالة النزاعات، تُطبق الأنظمة السارية في المملكة العربية السعودية'
                  : 'In case of disputes, Saudi Arabian laws apply'}</li>
                <li>• {isArabic 
                  ? 'يحق لسوق المفيجر تعديل هذه السياسة في أي وقت مع إخطار العملاء'
                  : 'Souq Almufaijer reserves the right to modify this policy at any time with customer notification'}</li>
                <li>• {isArabic 
                  ? 'قرار الإدارة نهائي في جميع حالات الاستبدال'
                  : "Management decision is final for all exchange cases"}</li>
              </ul>
            </section>

            {/* Contact Information */}
            <section className="p-6 bg-accent/10 border border-accent/30 rounded-2xl">
              <h2 className="text-xl font-bold text-foreground mb-4">
                {isArabic ? 'معلومات التواصل الرسمية' : 'Official Contact Information'}
              </h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-background rounded-xl border-2 border-accent">
                  <p className="text-center">
                    <span className="text-sm text-muted-foreground block mb-1">
                      {isArabic ? 'القناة المعتمدة الوحيدة:' : 'The Only Approved Channel:'}
                    </span>
                    <Link to="/contact" className="font-mono text-accent font-bold text-lg hover:underline">
                      https://almufaijer.com/contact
                    </Link>
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Clock className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">{isArabic ? 'ساعات العمل' : 'Business Hours'}</p>
                      <p>{isArabic ? 'السبت - الخميس: 9:00 ص - 6:00 م' : 'Sat - Thu: 9:00 AM - 6:00 PM'}</p>
                      <p>{isArabic ? 'الجمعة: مغلق' : 'Friday: Closed'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <MapPin className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">{isArabic ? 'العنوان' : 'Address'}</p>
                      <p>{isArabic 
                        ? 'قرية المفيجر، محافظة الحريق، 160 كم جنوب الرياض'
                        : 'Almufaijer Village, Al-Hariq, 160 km South of Riyadh'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
                <p className="text-destructive font-medium text-sm text-center">
                  <strong>{isArabic ? 'تحذير مهم:' : 'Important Warning:'}</strong><br />
                  {isArabic 
                    ? 'نموذج التواصل هو القناة الرسمية الوحيدة المعتمدة. أي معلومات أو قنوات تواصل أخرى تُعتبر غير معتمدة.'
                    : 'The contact form is the ONLY approved official channel. Any other contact information or channels are considered unofficial.'}
                </p>
              </div>
            </section>

            {/* Thank you */}
            <div className="text-center py-8 text-muted-foreground">
              <p>
                {isArabic 
                  ? 'نشكركم لاختياركم سوق المفيجر ونتطلع لاستقبالكم قريباً'
                  : 'Thank you for choosing Souq Almufaijer. We look forward to welcoming you soon.'}
              </p>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsPage;
