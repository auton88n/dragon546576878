import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, LogIn, AlertCircle, Home, Shield } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import PoweredByAYN from '@/components/shared/PoweredByAYN';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const createLoginSchema = (isArabic: boolean) => z.object({
  email: z.string()
    .email(isArabic ? 'البريد الإلكتروني غير صالح' : 'Invalid email address'),
  password: z.string()
    .min(6, isArabic ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { setSession, setUser, setRole, setLoading } = useAuthStore();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(createLoginSchema(isArabic)),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError(isArabic ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password');
        } else {
          setError(signInError.message);
        }
        return;
      }

      if (!data.user || !data.session) {
        setError(isArabic ? 'حدث خطأ في تسجيل الدخول' : 'Login error occurred');
        return;
      }

      // Check if user has a staff role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      if (roleError || !roleData) {
        await supabase.auth.signOut();
        setError(isArabic ? 'غير مصرح لك بالدخول. هذه الصفحة للموظفين فقط.' : 'Unauthorized. This page is for staff only.');
        return;
      }

      // Set auth state
      setSession(data.session);
      setUser(data.user);
      setRole(roleData.role);
      setLoading(false);

      // Navigate based on role
      if (roleData.role === 'scanner') {
        navigate('/scan');
      } else {
        navigate(from);
      }

    } catch (err) {
      console.error('Login error:', err);
      setError(isArabic ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top bar with language switcher */}
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>

      <main className="flex-1 flex items-center justify-center pb-8 px-4 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-4 md:left-10 w-48 md:w-64 h-48 md:h-64 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-4 md:right-10 w-64 md:w-80 h-64 md:h-80 bg-primary/10 rounded-full blur-3xl" />
        </div>

        <Card className="w-full max-w-md glass-card border-accent/20 relative z-10">
          <CardHeader className="text-center space-y-4 pb-2 p-4 md:p-6">
            <div className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center border border-accent/20">
              <span className="icon-wrapper">
                <Shield className="h-8 w-8 md:h-10 md:w-10 text-accent" aria-hidden="true" />
              </span>
            </div>
            <div>
              <CardTitle className="text-xl md:text-2xl font-bold text-foreground">
                {isArabic ? 'تسجيل دخول الموظفين' : 'Staff Login'}
              </CardTitle>
              <CardDescription className="mt-2 text-sm md:text-base">
                {isArabic 
                  ? 'أدخل بيانات الاعتماد الخاصة بك للوصول إلى لوحة التحكم'
                  : 'Enter your credentials to access the dashboard'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 md:space-y-6 pt-4 p-4 md:p-6">
            {error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                <span className="icon-wrapper">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                </span>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-foreground text-sm md:text-base">
                        <span className="icon-wrapper">
                          <Mail className="h-4 w-4 text-accent" aria-hidden="true" />
                        </span>
                        {isArabic ? 'البريد الإلكتروني' : 'Email'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="staff@almufaijer.com"
                          className="h-12 bg-background/50 border-border/50 focus:border-accent transition-colors"
                          dir="ltr"
                          autoComplete="email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-foreground text-sm md:text-base">
                        <span className="icon-wrapper">
                          <Lock className="h-4 w-4 text-accent" aria-hidden="true" />
                        </span>
                        {isArabic ? 'كلمة المرور' : 'Password'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="h-12 bg-background/50 border-border/50 focus:border-accent transition-colors"
                          dir="ltr"
                          autoComplete="current-password"
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                      {isArabic ? 'جاري الدخول...' : 'Signing in...'}
                    </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="icon-wrapper">
                          <LogIn className="h-5 w-5" aria-hidden="true" />
                        </span>
                        {isArabic ? 'تسجيل الدخول' : 'Sign In'}
                      </span>
                    )}
                </Button>
              </form>
            </Form>

            <div className="text-center pt-4 border-t border-accent/10">
              <p className="text-xs md:text-sm text-muted-foreground mb-4 flex items-center justify-center gap-2">
                <span className="icon-wrapper">
                  <Shield className="h-4 w-4" aria-hidden="true" />
                </span>
                {isArabic 
                  ? 'هذه الصفحة مخصصة للموظفين فقط'
                  : 'This page is for staff members only'}
              </p>
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2 hover:bg-accent/10 transition-colors">
                  <span className="icon-wrapper">
                    <Home className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {isArabic ? 'العودة للرئيسية' : 'Back to Home'}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      <PoweredByAYN />
    </div>
  );
};

export default LoginPage;
