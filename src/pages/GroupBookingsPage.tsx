import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Users, Calendar as CalendarIcon, DollarSign, Headphones, UtensilsCrossed, Building2, CheckCircle, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import CooldownNotice from '@/components/shared/CooldownNotice';
const groupBookingSchema = z.object({
  organization_name: z.string().min(3, 'Organization name must be at least 3 characters').max(100),
  contact_person: z.string().min(3, 'Contact person name must be at least 3 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  group_size: z.number().min(20, 'Minimum group size is 20 people'),
  preferred_dates: z.array(z.date()).min(1, 'Please select at least one preferred date'),
  group_type: z.string().min(1, 'Please select a group type'),
  special_requirements: z.string().optional()
});
type GroupBookingForm = z.infer<typeof groupBookingSchema>;
const GroupBookingsPage = () => {
  const {
    t,
    isRTL,
    currentLanguage
  } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const [formData, setFormData] = useState<Partial<GroupBookingForm>>({
    organization_name: '',
    contact_person: '',
    email: '',
    phone: '',
    group_size: 20,
    preferred_dates: [],
    group_type: '',
    special_requirements: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [cooldownMinutes, setCooldownMinutes] = useState<number | null>(null);
  const benefits = [{
    icon: DollarSign,
    titleEn: 'Special Group Pricing',
    titleAr: 'أسعار خاصة للمجموعات',
    descEn: 'Competitive rates for groups of 20+',
    descAr: 'أسعار تنافسية للمجموعات من 20+ شخص'
  }, {
    icon: CalendarIcon,
    titleEn: 'Flexible Payment Options',
    titleAr: 'خيارات دفع مرنة',
    descEn: 'Convenient payment plans available',
    descAr: 'خطط سداد مريحة متاحة'
  }, {
    icon: Headphones,
    titleEn: 'Dedicated Coordinator',
    titleAr: 'منسق مخصص',
    descEn: 'Personal support throughout your visit',
    descAr: 'دعم شخصي طوال زيارتكم'
  }, {
    icon: MapPin,
    titleEn: 'Custom Itineraries',
    titleAr: 'برامج مخصصة',
    descEn: 'Tailored experiences for your group',
    descAr: 'تجارب مصممة خصيصاً لمجموعتكم'
  }, {
    icon: UtensilsCrossed,
    titleEn: 'Catering Services',
    titleAr: 'خدمات الضيافة',
    descEn: 'Traditional refreshments available',
    descAr: 'ضيافة تقليدية متاحة'
  }];
  const groupTypes = [{
    value: 'corporate',
    labelEn: 'Corporate Visit',
    labelAr: 'زيارة شركات'
  }, {
    value: 'school',
    labelEn: 'School Trip',
    labelAr: 'رحلة مدرسية'
  }, {
    value: 'tour_group',
    labelEn: 'Tour Group',
    labelAr: 'مجموعة سياحية'
  }, {
    value: 'government',
    labelEn: 'Government/Institution',
    labelAr: 'جهة حكومية'
  }, {
    value: 'private_event',
    labelEn: 'Private Event',
    labelAr: 'مناسبة خاصة'
  }, {
    value: 'other',
    labelEn: 'Other',
    labelAr: 'أخرى'
  }];
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Honeypot check - silently "succeed" for bots
    if (honeypot) {
      setIsSuccess(true);
      return;
    }

    try {
      const validatedData = groupBookingSchema.parse({
        ...formData,
        group_size: Number(formData.group_size)
      });
      setIsSubmitting(true);

      const response = await fetch(
        'https://hekgkfdunwpxqbrotfpn.supabase.co/functions/v1/submit-group-booking',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_name: validatedData.organization_name,
            contact_person: validatedData.contact_person,
            email: validatedData.email,
            phone: validatedData.phone,
            group_size: validatedData.group_size,
            preferred_dates: validatedData.preferred_dates.map(d => d.toISOString()),
            group_type: validatedData.group_type,
            special_requirements: validatedData.special_requirements || null
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setCooldownMinutes(60);
          return;
        }
        throw new Error(result.error || 'Failed to submit');
      }

      setIsSuccess(true);
      toast.success(isArabic ? 'تم إرسال طلبكم بنجاح!' : 'Your request has been submitted successfully!');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error('Error submitting group booking request:', error);
        toast.error(isArabic ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  if (isSuccess) {
    return <div className="min-h-screen flex flex-col w-full bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center py-16">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {isArabic ? 'تم استلام طلبكم!' : 'Request Received!'}
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                {isArabic ? 'شكراً لتواصلكم معنا. سيقوم فريقنا بالرد عليكم خلال 24 ساعة.' : 'Thank you for reaching out. Our team will respond within 24 hours.'}
              </p>
              <Button onClick={() => setIsSuccess(false)} className="btn-gold">
                {isArabic ? 'إرسال طلب آخر' : 'Submit Another Request'}
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>;
  }
  return <div className="min-h-screen flex flex-col w-full bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 bg-gradient-to-b from-primary/10 to-background">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%238B7355' fill-opacity='0.4'/%3E%3C/svg%3E")`,
            backgroundSize: '30px 30px'
          }} />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Building2 className="w-5 h-5" />
              <span className="text-sm font-medium">
                {isArabic ? 'للمجموعات 20+ شخص' : 'For Groups of 20+ People'}
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              {isArabic ? 'حجوزات الشركات' : 'Corporate Bookings'}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground">
              {isArabic ? 'هل تخططون لزيارة جماعية؟ دعونا نصمم لكم تجربة استثنائية!' : 'Planning a group visit? Let us create a custom experience for you!'}
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 max-w-6xl mx-auto">
            {benefits.map((benefit, index) => <Card key={index} className="bg-card border-border/50 hover:shadow-lg transition-shadow min-w-0">
                <CardContent className="p-3 lg:p-4 text-center">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 lg:mb-3">
                    <benefit.icon className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xs lg:text-sm text-foreground mb-1">
                    {isArabic ? benefit.titleAr : benefit.titleEn}
                  </h3>
                  <p className="text-[10px] lg:text-xs text-muted-foreground leading-tight">
                    {isArabic ? benefit.descAr : benefit.descEn}
                  </p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                {isArabic ? 'طلب عرض سعر' : 'Request a Quote'}
              </h2>
              <p className="text-muted-foreground">
                {isArabic ? 'املأ النموذج أدناه وسنتواصل معكم خلال 24 ساعة' : 'Fill out the form below and we\'ll get back to you within 24 hours'}
              </p>
            </div>

            <Card className="bg-card border-border/50 shadow-xl">
              <CardContent className="p-5 sm:p-6 lg:p-8">
                {cooldownMinutes !== null ? <CooldownNotice remainingMinutes={cooldownMinutes} isArabic={isArabic} /> : <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Error Summary Banner */}
                    {Object.keys(errors).length > 0 && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                        <p className="text-destructive font-medium text-sm mb-2">
                          {isArabic ? 'يرجى تصحيح الأخطاء التالية:' : 'Please fix the following errors:'}
                        </p>
                        <ul className="text-sm text-destructive/80 list-disc list-inside">
                          {Object.values(errors).map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Honeypot - invisible to humans */}
                    <input type="text" name="website" autoComplete="off" tabIndex={-1} value={honeypot} onChange={e => setHoneypot(e.target.value)} className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true" />

                    {/* Organization Name */}
                    <div className="space-y-2">
                      <Label htmlFor="organization_name">
                        {isArabic ? 'اسم المنظمة / الشركة' : 'Organization Name'} *
                      </Label>
                      <Input id="organization_name" value={formData.organization_name} onChange={e => setFormData({
                    ...formData,
                    organization_name: e.target.value
                  })} placeholder={isArabic ? 'شركة المثال' : 'Example Company'} className={errors.organization_name ? 'border-destructive' : ''} />
                      {errors.organization_name && <p className="text-sm text-destructive">{errors.organization_name}</p>}
                    </div>

                    {/* Contact Person */}
                    <div className="space-y-2">
                      <Label htmlFor="contact_person">
                        {isArabic ? 'اسم المسؤول' : 'Contact Person'} *
                      </Label>
                      <Input id="contact_person" value={formData.contact_person} onChange={e => setFormData({
                    ...formData,
                    contact_person: e.target.value
                  })} placeholder={isArabic ? 'محمد أحمد' : 'John Doe'} className={errors.contact_person ? 'border-destructive' : ''} />
                      {errors.contact_person && <p className="text-sm text-destructive">{errors.contact_person}</p>}
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          {isArabic ? 'البريد الإلكتروني' : 'Email'} *
                        </Label>
                        <Input id="email" type="email" value={formData.email} onChange={e => setFormData({
                      ...formData,
                      email: e.target.value
                    })} placeholder="email@example.com" className={errors.email ? 'border-destructive' : ''} />
                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">
                          {isArabic ? 'رقم الهاتف' : 'Phone'} *
                        </Label>
                        <Input id="phone" type="tel" value={formData.phone} onChange={e => setFormData({
                      ...formData,
                      phone: e.target.value
                    })} placeholder="+966 5X XXX XXXX" className={errors.phone ? 'border-destructive' : ''} />
                        {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                      </div>
                    </div>

                    {/* Group Size */}
                    <div className="space-y-2">
                      <Label htmlFor="group_size">
                        {isArabic ? 'عدد الأشخاص' : 'Group Size'} *
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input id="group_size" type="number" min={20} value={formData.group_size} onChange={e => setFormData({
                      ...formData,
                      group_size: parseInt(e.target.value) || 20
                    })} className={cn("w-32", errors.group_size ? 'border-destructive' : '')} />
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {isArabic ? 'شخص (الحد الأدنى 20)' : 'people (minimum 20)'}
                        </span>
                      </div>
                      {errors.group_size && <p className="text-sm text-destructive">{errors.group_size}</p>}
                    </div>

                    {/* Preferred Dates */}
                    <div className="space-y-2">
                      <Label>
                        {isArabic ? 'التواريخ المفضلة' : 'Preferred Date(s)'} *
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-start font-normal", !formData.preferred_dates?.length && "text-muted-foreground", errors.preferred_dates ? 'border-destructive' : '')}>
                            <CalendarIcon className="me-2 h-4 w-4" />
                            {formData.preferred_dates?.length ? formData.preferred_dates.map(d => format(d, 'PP', {
                          locale: isArabic ? ar : enUS
                        })).join(', ') : isArabic ? 'اختر التواريخ' : 'Select dates'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="multiple" selected={formData.preferred_dates} onSelect={dates => setFormData({
                        ...formData,
                        preferred_dates: dates || []
                      })} disabled={date => date < new Date()} locale={isArabic ? ar : enUS} initialFocus />
                        </PopoverContent>
                      </Popover>
                      {errors.preferred_dates && <p className="text-sm text-destructive">{errors.preferred_dates}</p>}
                    </div>

                    {/* Group Type */}
                    <div className="space-y-3">
                      <Label>
                        {isArabic ? 'نوع المجموعة' : 'Group Type'} *
                      </Label>
                      <RadioGroup value={formData.group_type} onValueChange={value => setFormData({
                    ...formData,
                    group_type: value
                  })} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {groupTypes.map(type => <div key={type.value} className="flex items-center space-x-2 rtl:space-x-reverse">
                            <RadioGroupItem value={type.value} id={type.value} />
                            <Label htmlFor={type.value} className="font-normal cursor-pointer">
                              {isArabic ? type.labelAr : type.labelEn}
                            </Label>
                          </div>)}
                      </RadioGroup>
                      {errors.group_type && <p className="text-sm text-destructive">{errors.group_type}</p>}
                    </div>

                    {/* Special Requirements */}
                    <div className="space-y-2">
                      <Label htmlFor="special_requirements">
                        {isArabic ? 'متطلبات خاصة' : 'Special Requirements'}
                      </Label>
                      <Textarea id="special_requirements" value={formData.special_requirements} onChange={e => setFormData({
                    ...formData,
                    special_requirements: e.target.value
                  })} placeholder={isArabic ? 'مثال: خدمات الضيافة، النقل، مرشد خاص، فترة زمنية محددة...' : 'Examples: Catering, transportation, private guide, specific time slot...'} rows={4} />
                    </div>

                    <Button type="submit" className="w-full btn-gold h-12 text-lg" disabled={isSubmitting}>
                      {isSubmitting ? isArabic ? 'جاري الإرسال...' : 'Submitting...' : isArabic ? 'إرسال الطلب' : 'Submit Request'}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      {isArabic ? 'سنرد عليكم خلال 24 ساعة' : "We'll respond within 24 hours"}
                    </p>

                    
                  </form>}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
};
export default GroupBookingsPage;