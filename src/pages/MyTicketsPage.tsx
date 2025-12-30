import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Mail, Search, Ticket, Calendar } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const createEmailSchema = (isArabic: boolean) => z.object({
  email: z.string()
    .email(isArabic ? 'البريد الإلكتروني غير صالح' : 'Invalid email address'),
});

type EmailFormValues = z.infer<ReturnType<typeof createEmailSchema>>;

const MyTicketsPage = () => {
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(createEmailSchema(isArabic)),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: EmailFormValues) => {
    setIsSearching(true);
    setHasSearched(false);

    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Placeholder - would fetch from database
    setTickets([]);
    setHasSearched(true);
    setIsSearching(false);
  };

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />

      <main className="flex-1 py-12 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="container max-w-2xl relative z-10">
          {/* Page Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 mb-6 border border-accent/20">
              <Ticket className="h-10 w-10 text-accent" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              {isArabic ? 'تذاكري' : 'My Tickets'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {isArabic 
                ? 'أدخل بريدك الإلكتروني لعرض تذاكرك'
                : 'Enter your email to view your tickets'}
            </p>
          </div>

          {/* Email Search Form */}
          <Card className="mb-8 glass-card border-accent/20">
            <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-accent/5 to-transparent">
              <CardTitle className="flex items-center gap-3 text-lg text-foreground">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Search className="h-5 w-5 text-accent" />
                </div>
                {isArabic ? 'البحث عن التذاكر' : 'Search Tickets'}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? 'أدخل البريد الإلكتروني الذي استخدمته للحجز'
                  : 'Enter the email you used for booking'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-foreground">
                          <Mail className="h-4 w-4 text-accent" />
                          {isArabic ? 'البريد الإلكتروني' : 'Email Address'}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="example@email.com"
                            className="h-12 text-base bg-background/50 border-border/50 focus:border-accent transition-colors"
                            dir="ltr"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-lg hover:shadow-xl transition-all"
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                        {isArabic ? 'جاري البحث...' : 'Searching...'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        {isArabic ? 'بحث' : 'Search'}
                      </span>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Results Area */}
          {hasSearched && (
            <Card className="glass-card border-accent/20 animate-fade-in">
              <CardHeader className="border-b border-accent/10">
                <CardTitle className="flex items-center gap-3 text-foreground">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-accent" />
                  </div>
                  {isArabic ? 'نتائج البحث' : 'Search Results'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
                      <Ticket className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {isArabic ? 'لم يتم العثور على تذاكر' : 'No Tickets Found'}
                    </h3>
                    <p className="text-muted-foreground mb-8">
                      {isArabic 
                        ? 'لا توجد تذاكر مرتبطة بهذا البريد الإلكتروني'
                        : 'No tickets are associated with this email'}
                    </p>
                    <Link to="/book">
                      <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                        <Calendar className="h-4 w-4" />
                        {isArabic ? 'احجز زيارة جديدة' : 'Book a New Visit'}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Ticket cards would go here */}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          {!hasSearched && (
            <div className="text-center glass-card p-8 rounded-xl border border-accent/10">
              <p className="text-muted-foreground mb-4 text-lg">
                {isArabic 
                  ? 'لم تحجز بعد؟'
                  : "Haven't booked yet?"}
              </p>
              <Link to="/book">
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 px-8 py-6 text-lg">
                  <Calendar className="h-5 w-5" />
                  {isArabic ? 'احجز زيارتك الآن' : 'Book Your Visit Now'}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MyTicketsPage;
