import { useState, lazy, Suspense, useEffect } from 'react';
import { MessageSquare, Mail, Headphones, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StaffHeader from '@/components/shared/StaffHeader';
import PoweredByAYN from '@/components/shared/PoweredByAYN';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const LiveSupportPanel = lazy(() => import('@/components/admin/LiveSupportPanel'));
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
        { event: '*', schema: 'public', table: 'support_conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['live-chat-count'] });
        }
      )
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

  // Fetch counts for badges
  const { data: liveChatCount = 0 } = useQuery({
    queryKey: ['live-chat-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('support_conversations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'transferred']);
      return count || 0;
    },
    refetchInterval: 30000,
  });

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

  const totalPending = liveChatCount + contactFormsCount;

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <StaffHeader 
        title="Customer Support" 
        titleAr="دعم العملاء" 
      />

      <main className="flex-1 pt-20 pb-4 px-3 sm:px-4 md:px-6">
        <div className="container px-0 max-w-6xl mx-auto">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <Card className="glass-card border-accent/20">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{liveChatCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? 'محادثات نشطة' : 'Active Chats'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Headphones className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalPending}</p>
                    <p className="text-xs text-muted-foreground">
                      {isArabic ? 'إجمالي المعلق' : 'Total Pending'}
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

          {/* Main Content with Tabs */}
          <Card className="glass-card-gold border-0">
            <CardHeader className="border-b border-border/50 p-4 md:p-6">
              <CardTitle className="flex items-center gap-3 text-lg md:text-xl rtl:flex-row-reverse rtl:justify-end">
                <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
                  <Headphones className="h-5 w-5 text-foreground" />
                </div>
                <span className="text-foreground">
                  {isArabic ? 'مركز دعم العملاء' : 'Customer Support Center'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <Tabs defaultValue="live-chat" className="space-y-4">
                <TabsList className="glass-card p-1 h-auto">
                  <TabsTrigger 
                    value="live-chat" 
                    className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-4 py-2 rounded-lg transition-all"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {isArabic ? 'المحادثات المباشرة' : 'Live Chat'}
                    {liveChatCount > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                        {liveChatCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="contact-forms" 
                    className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-4 py-2 rounded-lg transition-all"
                  >
                    <Mail className="h-4 w-4" />
                    {isArabic ? 'نماذج التواصل' : 'Contact Forms'}
                    {contactFormsCount > 0 && (
                      <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                        {contactFormsCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="live-chat" className="animate-fade-in mt-4">
                  <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                    <LiveSupportPanel soundEnabled={soundEnabled} />
                  </Suspense>
                </TabsContent>

                <TabsContent value="contact-forms" className="animate-fade-in mt-4">
                  <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                    <ContactSubmissionsPanel />
                  </Suspense>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      <PoweredByAYN className="border-t border-border" />
    </div>
  );
};

export default SupportDashboardPage;
