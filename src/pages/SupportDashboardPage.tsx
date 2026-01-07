import { useState, lazy, Suspense, useEffect } from 'react';
import { Mail, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StaffHeader from '@/components/shared/StaffHeader';
import PoweredByAYN from '@/components/shared/PoweredByAYN';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ContactSubmissionsPanel = lazy(() => import('@/components/admin/ContactSubmissionsPanel'));

const SupportDashboardPage = () => {
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const [soundEnabled, setSoundEnabled] = useState(true);
  const queryClient = useQueryClient();

  // Real-time subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('support-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact_submissions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['contact-forms-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch count for badge
  const { data: contactFormsCount = 0 } = useQuery({
    queryKey: ['contact-forms-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('contact_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'unread');
      return count || 0;
    },
    refetchInterval: 30000,
  });

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <StaffHeader 
        title="Customer Support" 
        titleAr="دعم العملاء" 
      />

      <main className="flex-1 pt-20 pb-4 px-3 sm:px-4 md:px-6">
        <div className="container px-0 max-w-6xl mx-auto">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
            <Card className="glass-card border-accent/20">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{contactFormsCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? 'رسائل غير مقروءة' : 'Unread Forms'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-accent/20">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${soundEnabled ? 'bg-primary/20' : 'bg-muted'} flex items-center justify-center`}>
                      {soundEnabled ? (
                        <Volume2 className="h-5 w-5 text-primary" />
                      ) : (
                        <VolumeX className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {isArabic ? 'التنبيهات' : 'Alerts'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {soundEnabled 
                          ? (isArabic ? 'مفعّلة' : 'Enabled') 
                          : (isArabic ? 'معطّلة' : 'Disabled')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="h-8 px-2"
                  >
                    {soundEnabled 
                      ? (isArabic ? 'كتم' : 'Mute') 
                      : (isArabic ? 'تفعيل' : 'Enable')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card className="glass-card-gold border-0">
            <CardHeader className="border-b border-border/50 p-4 md:p-6">
              <CardTitle className="flex items-center gap-3 text-lg md:text-xl rtl:flex-row-reverse rtl:justify-end">
                <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
                  <Mail className="h-5 w-5 text-foreground" />
                </div>
                <span className="text-foreground">
                  {isArabic ? 'نماذج التواصل' : 'Contact Forms'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <ContactSubmissionsPanel />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </main>

      <PoweredByAYN className="border-t border-border" />
    </div>
  );
};

export default SupportDashboardPage;
