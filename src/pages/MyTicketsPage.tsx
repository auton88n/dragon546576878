import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Search, Ticket, Calendar, Clock, QrCode } from 'lucide-react';
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
  const { currentLanguage } = useLanguage();
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-12">
        <div className="container max-w-2xl">
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Ticket className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isArabic ? 'تذاكري' : 'My Tickets'}
            </h1>
            <p className="text-muted-foreground">
              {isArabic 
                ? 'أدخل بريدك الإلكتروني لعرض تذاكرك'
                : 'Enter your email to view your tickets'}
            </p>
          </div>

          {/* Email Search Form */}
          <Card className="mb-8 border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5 text-primary" />
                {isArabic ? 'البحث عن التذاكر' : 'Search Tickets'}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? 'أدخل البريد الإلكتروني الذي استخدمته للحجز'
                  : 'Enter the email you used for booking'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-primary" />
                          {isArabic ? 'البريد الإلكتروني' : 'Email Address'}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="example@email.com"
                            className="h-12 text-base"
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
                    className="w-full h-12"
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-primary" />
                  {isArabic ? 'نتائج البحث' : 'Search Results'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <Ticket className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {isArabic ? 'لم يتم العثور على تذاكر' : 'No Tickets Found'}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {isArabic 
                        ? 'لا توجد تذاكر مرتبطة بهذا البريد الإلكتروني'
                        : 'No tickets are associated with this email'}
                    </p>
                    <Button variant="outline" asChild>
                      <a href="/book">
                        <Calendar className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                        {isArabic ? 'احجز زيارة جديدة' : 'Book a New Visit'}
                      </a>
                    </Button>
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
            <div className="text-center text-muted-foreground">
              <p className="mb-4">
                {isArabic 
                  ? 'لم تحجز بعد؟'
                  : "Haven't booked yet?"}
              </p>
              <Button variant="outline" asChild>
                <a href="/book" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {isArabic ? 'احجز زيارتك الآن' : 'Book Your Visit Now'}
                </a>
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MyTicketsPage;
