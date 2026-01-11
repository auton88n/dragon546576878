import { useState, useEffect, useMemo } from 'react';
import { Settings, Clock, Calendar, Save, RefreshCw, CalendarRange, RotateCcw, Settings2, Users, Package, Megaphone, Wrench, Crown, Trash2, Database, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettings, SiteSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import TestQRGenerator from './TestQRGenerator';
import TestEmployeeBadgeGenerator from './TestEmployeeBadgeGenerator';
import PackagesManager from './PackagesManager';
import AttractionsManager from './AttractionsManager';
import StaffManager from './StaffManager';
import EmployeesManager from './EmployeesManager';
import { HoursAnnouncementPanel } from './HoursAnnouncementPanel';
import VIPOutreachPanel from './VIPOutreachPanel';
import MarketingQRGenerator from './MarketingQRGenerator';

// Database Maintenance Card Component
const DatabaseMaintenanceCard = ({ isArabic, onCleanupComplete }: { isArabic: boolean; onCleanupComplete?: () => void }) => {
  const [cleaning, setCleaning] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [daysToClean, setDaysToClean] = useState(1);
  const [result, setResult] = useState<{ deleted_count: number; cutoff_date: string } | null>(null);
  const { toast } = useToast();

  const handlePreview = async () => {
    setPreviewing(true);
    setPreviewCount(null);
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToClean);
      
      const { count, error } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'pending')
        .neq('booking_status', 'cancelled')
        .lt('created_at', cutoffDate.toISOString());
      
      if (error) throw error;
      setPreviewCount(count ?? 0);
      setShowConfirmDialog(true);
    } catch (err) {
      console.error('Preview error:', err);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في معاينة البيانات' : 'Failed to preview data',
        variant: 'destructive',
      });
    } finally {
      setPreviewing(false);
    }
  };

  const handleCleanup = async () => {
    setShowConfirmDialog(false);
    setCleaning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-abandoned-bookings', {
        body: { daysOld: daysToClean }
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: isArabic ? 'تم التنظيف' : 'Cleanup Complete',
        description: isArabic 
          ? `تم حذف ${data.deleted_count} حجز مهجور`
          : `Deleted ${data.deleted_count} abandoned booking(s)`,
      });

      // Refresh stats after successful cleanup
      if (data.deleted_count > 0 && onCleanupComplete) {
        onCleanupComplete();
      }
    } catch (err) {
      console.error('Cleanup error:', err);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في تنظيف قاعدة البيانات' : 'Failed to cleanup database',
        variant: 'destructive',
      });
    } finally {
      setCleaning(false);
    }
  };

  const getDaysLabel = (days: number) => {
    if (isArabic) {
      return days === 1 ? '١ يوم' : days === 2 ? '٢ يوم' : '٣ أيام';
    }
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  return (
    <>
      <Card className="glass-card border-accent/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base rtl:flex-row-reverse rtl:justify-end">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Database className="h-4 w-4 text-red-600" />
            </div>
            {isArabic ? 'صيانة قاعدة البيانات' : 'Database Maintenance'}
          </CardTitle>
          <CardDescription className="text-start rtl:text-right">
            {isArabic 
              ? 'إزالة الحجوزات المعلقة القديمة التي لم تكتمل' 
              : 'Remove old pending bookings that were never completed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            {/* Days Selector */}
            <div className="flex items-center gap-3 rtl:flex-row-reverse">
              <Label className="text-muted-foreground whitespace-nowrap">
                {isArabic ? 'حذف الحجوزات الأقدم من:' : 'Delete bookings older than:'}
              </Label>
              <Select value={daysToClean.toString()} onValueChange={(v) => setDaysToClean(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{isArabic ? '١ يوم' : '1 day'}</SelectItem>
                  <SelectItem value="2">{isArabic ? '٢ يوم' : '2 days'}</SelectItem>
                  <SelectItem value="3">{isArabic ? '٣ أيام' : '3 days'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Warning for 1 day */}
            {daysToClean === 1 && (
              <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded-lg text-start rtl:text-right">
                {isArabic 
                  ? '⚠️ تحذير: سيؤدي هذا إلى حذف معظم الحجوزات المعلقة'
                  : '⚠️ Warning: This will delete most pending bookings'}
              </p>
            )}

            {/* Action Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rtl:sm:flex-row-reverse">
              <Button
                variant="destructive"
                onClick={handlePreview}
                disabled={cleaning || previewing}
                className="gap-2"
              >
                {(cleaning || previewing) ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {isArabic 
                  ? `تنظيف الحجوزات المهجورة (${getDaysLabel(daysToClean)}+)` 
                  : `Cleanup Abandoned Bookings (${daysToClean}+ day${daysToClean > 1 ? 's' : ''})`}
              </Button>
              
              {result && (
                <div className="text-sm text-muted-foreground">
                  {isArabic 
                    ? `تم حذف ${result.deleted_count} حجز`
                    : `${result.deleted_count} booking(s) deleted`}
                </div>
              )}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground text-start rtl:text-right">
            {isArabic 
              ? `هذا الإجراء يحذف الحجوزات المعلقة الأقدم من ${getDaysLabel(daysToClean)} وسجلات الدفع والتذاكر المرتبطة بها.`
              : `This action deletes pending bookings older than ${daysToClean} day${daysToClean > 1 ? 's' : ''} along with their payment logs and tickets.`}
          </p>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={isArabic ? 'text-right' : ''}>
              {isArabic ? 'تأكيد الحذف' : 'Confirm Deletion'}
            </AlertDialogTitle>
            <AlertDialogDescription className={isArabic ? 'text-right' : ''}>
              {previewCount === 0
                ? (isArabic 
                    ? 'لا توجد حجوزات معلقة للحذف.'
                    : 'No pending bookings to delete.')
                : (isArabic 
                    ? `سيتم حذف ${previewCount} حجز معلق نهائياً. هذا الإجراء لا يمكن التراجع عنه.`
                    : `This will permanently delete ${previewCount} pending booking(s). This action cannot be undone.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isArabic ? 'flex-row-reverse gap-2' : ''}>
            <AlertDialogCancel>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            {previewCount !== 0 && (
              <AlertDialogAction
                onClick={handleCleanup}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isArabic ? 'حذف' : 'Delete'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
interface SettingsPanelProps {
  onStatsRefresh?: () => void;
}

const SettingsPanel = ({ onStatsRefresh }: SettingsPanelProps): JSX.Element => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { toast } = useToast();
  const { settings, loading, saving, saveSettings, refetch } = useSettings();

  // Initialize formData as null until settings are loaded
  const [formData, setFormData] = useState<SiteSettings | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize form data only once when settings are loaded
  useEffect(() => {
    if (!loading && settings && !initialized) {
      setFormData(settings);
      setInitialized(true);
    }
  }, [settings, loading, initialized]);

  // Detect unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!formData || !settings) return false;
    return JSON.stringify(formData) !== JSON.stringify(settings);
  }, [formData, settings]);

  // Reset form to DB values
  const handleReset = () => {
    setFormData(settings);
    toast({
      title: isArabic ? 'تم إعادة التعيين' : 'Reset',
      description: isArabic ? 'تمت استعادة القيم المحفوظة' : 'Restored saved values',
    });
  };

  const handleSave = async () => {
    if (!formData) return;
    const success = await saveSettings(formData);
    if (success) {
      toast({
        title: isArabic ? 'تم الحفظ' : 'Settings Saved',
        description: isArabic ? 'تم حفظ الإعدادات بنجاح' : 'Settings have been updated successfully',
      });
    } else {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في حفظ الإعدادات' : 'Failed to save settings',
        variant: 'destructive',
      });
    }
  };

  const tabs = [
    { id: 'general', labelAr: 'الإعدادات العامة', labelEn: 'General', icon: Settings2 },
    { id: 'users', labelAr: 'المستخدمين', labelEn: 'Users', icon: Users },
    { id: 'packages', labelAr: 'الباقات والفعاليات', labelEn: 'Packages', icon: Package },
    { id: 'marketing', labelAr: 'التسويق', labelEn: 'Marketing', icon: QrCode },
    { id: 'announcements', labelAr: 'الإعلانات', labelEn: 'Announcements', icon: Megaphone },
    { id: 'vip', labelAr: 'الدعوات الخاصة', labelEn: 'VIP Outreach', icon: Crown },
    { id: 'developer', labelAr: 'أدوات المطور', labelEn: 'Developer', icon: Wrench },
  ];

  // Show loading skeleton until settings are loaded AND formData is initialized
  if (loading || !formData) {
    return (
      <Card className="glass-card border-accent/20">
        <CardHeader>
          <Skeleton className="h-6 w-32 bg-accent/10" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full bg-accent/10" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-accent/20 overflow-hidden">
      <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-accent/5 to-transparent rtl:bg-gradient-to-l p-4 md:p-6">
        <CardTitle className="flex items-center gap-3 text-foreground rtl:flex-row-reverse rtl:justify-end">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <Settings className="h-4 w-4 md:h-5 md:w-5 text-accent" />
          </div>
          {isArabic ? 'الإعدادات' : 'Settings'}
        </CardTitle>
        <CardDescription className="text-start rtl:text-right">
          {isArabic ? 'إدارة ساعات العمل وقواعد الحجز والمحتوى' : 'Manage operating hours, booking rules, and content'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full justify-start gap-0.5 bg-accent/5 p-1 rounded-xl overflow-x-auto flex-nowrap h-auto mb-6 scrollbar-hide">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-1 px-2 md:px-3 py-1.5 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg text-[11px] md:text-xs shrink-0"
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isArabic ? tab.labelAr : tab.labelEn}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-6 mt-0">
            {/* Operating Hours */}
            <div className="glass-card rounded-xl p-4 md:p-6 border border-accent/10">
              <h3 className="font-semibold mb-4 md:mb-6 flex items-center gap-3 text-foreground rtl:flex-row-reverse rtl:justify-end text-sm md:text-base">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600" />
                </div>
                {isArabic ? 'ساعات العمل' : 'Operating Hours'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 rtl:[direction:rtl]">
                <div className="space-y-2 text-start">
                  <Label className="text-muted-foreground">{isArabic ? 'وقت الافتتاح' : 'Opening Time'}</Label>
                  <Input
                    type="time"
                    value={formData.operatingHours.openTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operatingHours: { ...formData.operatingHours, openTime: e.target.value },
                      })
                    }
                    className="bg-background/50 border-border/50 focus:border-accent transition-colors"
                  />
                </div>
                <div className="space-y-2 text-start">
                  <Label className="text-muted-foreground">{isArabic ? 'وقت الإغلاق' : 'Closing Time'}</Label>
                  <Input
                    type="time"
                    value={formData.operatingHours.closeTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operatingHours: { ...formData.operatingHours, closeTime: e.target.value },
                      })
                    }
                    className="bg-background/50 border-border/50 focus:border-accent transition-colors"
                  />
                </div>
                <div className="space-y-2 text-start">
                  <Label className="text-muted-foreground">{isArabic ? 'فترة الفتحة (دقيقة)' : 'Time Slot (minutes)'}</Label>
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    value={formData.operatingHours.timeSlotInterval}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operatingHours: { ...formData.operatingHours, timeSlotInterval: Number(e.target.value) },
                      })
                    }
                    className="bg-background/50 border-border/50 focus:border-accent transition-colors text-start"
                  />
                </div>
              </div>
            </div>

            {/* Event Period */}
            <div className="glass-card rounded-xl p-4 md:p-6 border border-accent/10">
              <h3 className="font-semibold mb-4 md:mb-6 flex items-center gap-3 text-foreground rtl:flex-row-reverse rtl:justify-end text-sm md:text-base">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CalendarRange className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-600" />
                </div>
                {isArabic ? 'فترة الفعالية' : 'Event Period'}
              </h3>
              
              {/* Enable Toggle */}
              <div className="flex items-center justify-between mb-6 p-4 rounded-lg bg-background/50 border border-border/50 rtl:flex-row-reverse">
                <div className="text-start rtl:text-right">
                  <Label className="text-foreground font-medium">
                    {isArabic ? 'تفعيل فترة الفعالية' : 'Enable Event Period'}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isArabic 
                      ? 'يقيد الحجوزات بالتواريخ المحددة فقط' 
                      : 'Restricts bookings to specific dates only'}
                  </p>
                </div>
                <Switch
                  checked={formData.eventPeriod?.enabled ?? false}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      eventPeriod: { ...formData.eventPeriod, enabled: checked },
                    })
                  }
                />
              </div>

              {/* Date Pickers */}
              <div className={cn(
                "grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 rtl:[direction:rtl]",
                !formData.eventPeriod?.enabled && "opacity-50 pointer-events-none"
              )}>
                <div className="space-y-2 text-start">
                  <Label className="text-muted-foreground">{isArabic ? 'تاريخ البداية' : 'Start Date'}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background/50 border-border/50",
                          !formData.eventPeriod?.startDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                        {formData.eventPeriod?.startDate
                          ? format(parseISO(formData.eventPeriod.startDate), 'PPP', { locale: isArabic ? ar : enUS })
                          : (isArabic ? 'اختر التاريخ' : 'Pick a date')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={formData.eventPeriod?.startDate ? parseISO(formData.eventPeriod.startDate) : undefined}
                        onSelect={(date) =>
                          date && setFormData({
                            ...formData,
                            eventPeriod: { ...formData.eventPeriod, startDate: format(date, 'yyyy-MM-dd') },
                          })
                        }
                        locale={isArabic ? ar : enUS}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2 text-start">
                  <Label className="text-muted-foreground">{isArabic ? 'تاريخ النهاية' : 'End Date'}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background/50 border-border/50",
                          !formData.eventPeriod?.endDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                        {formData.eventPeriod?.endDate
                          ? format(parseISO(formData.eventPeriod.endDate), 'PPP', { locale: isArabic ? ar : enUS })
                          : (isArabic ? 'اختر التاريخ' : 'Pick a date')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={formData.eventPeriod?.endDate ? parseISO(formData.eventPeriod.endDate) : undefined}
                        onSelect={(date) =>
                          date && setFormData({
                            ...formData,
                            eventPeriod: { ...formData.eventPeriod, endDate: format(date, 'yyyy-MM-dd') },
                          })
                        }
                        locale={isArabic ? ar : enUS}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Period Summary */}
              {formData.eventPeriod?.enabled && formData.eventPeriod?.startDate && formData.eventPeriod?.endDate && (
                <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-start rtl:text-right">
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                    ✓ {differenceInDays(parseISO(formData.eventPeriod.endDate), parseISO(formData.eventPeriod.startDate)) + 1} {isArabic ? 'يوم (جميع الأيام مفتوحة خلال الفعالية)' : 'days (all days open during event)'}
                  </p>
                </div>
              )}
            </div>

            {/* Booking Rules */}
            <div className="glass-card rounded-xl p-4 md:p-6 border border-accent/10">
              <h3 className="font-semibold mb-4 md:mb-6 flex items-center gap-3 text-foreground rtl:flex-row-reverse rtl:justify-end text-sm md:text-base">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-600" />
                </div>
                {isArabic ? 'قواعد الحجز' : 'Booking Rules'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 rtl:[direction:rtl]">
                <div className="space-y-2 text-start">
                  <Label className="text-muted-foreground">{isArabic ? 'الحد الأقصى للتذاكر' : 'Max Tickets per Booking'}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.maxTicketsPerBooking}
                    onChange={(e) =>
                      setFormData({ ...formData, maxTicketsPerBooking: Number(e.target.value) })
                    }
                    className="bg-background/50 border-border/50 focus:border-accent transition-colors text-start"
                  />
                </div>
                <div className="space-y-2 text-start">
                  <Label className="text-muted-foreground">{isArabic ? 'أيام الحجز المسبق' : 'Advance Booking Days'}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.advanceBookingDays}
                    onChange={(e) =>
                      setFormData({ ...formData, advanceBookingDays: Number(e.target.value) })
                    }
                    className="bg-background/50 border-border/50 focus:border-accent transition-colors text-start"
                  />
                </div>
                <div className="space-y-2 text-start">
                  <Label className="text-muted-foreground">{isArabic ? 'قطع الحجز في نفس اليوم (ساعة)' : 'Same-Day Cutoff Hour'}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={formData.sameDayCutoffHour}
                    onChange={(e) =>
                      setFormData({ ...formData, sameDayCutoffHour: Number(e.target.value) })
                    }
                    className="bg-background/50 border-border/50 focus:border-accent transition-colors text-start"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-end rtl:sm:justify-start gap-3 pt-4">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 px-3 py-1">
                  {isArabic ? 'تغييرات غير محفوظة' : 'Unsaved Changes'}
                </Badge>
              )}
              <div className="flex gap-3 w-full sm:w-auto">
                <Button 
                  variant="outline"
                  onClick={handleReset} 
                  disabled={saving || !hasUnsavedChanges}
                  className="gap-2 px-4 py-4 md:py-6 rounded-xl flex-1 sm:flex-initial"
                >
                  <RotateCcw className="h-4 w-4" />
                  {isArabic ? 'إعادة تعيين' : 'Reset'}
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !hasUnsavedChanges} 
                  className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-6 md:px-8 py-4 md:py-6 text-base md:text-lg rounded-xl shadow-lg hover:shadow-xl transition-all flex-1 sm:flex-initial"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 md:h-5 md:w-5" />
                  )}
                  {isArabic ? 'حفظ الإعدادات' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6 mt-0">
            <StaffManager />
            <EmployeesManager />
          </TabsContent>

          {/* Packages Tab */}
          <TabsContent value="packages" className="space-y-6 mt-0">
            <PackagesManager />
            <AttractionsManager />
          </TabsContent>

          {/* Marketing Tab */}
          <TabsContent value="marketing" className="space-y-6 mt-0">
            <MarketingQRGenerator />
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-6 mt-0">
            <HoursAnnouncementPanel />
          </TabsContent>

          {/* VIP Outreach Tab */}
          <TabsContent value="vip" className="space-y-6 mt-0">
            <VIPOutreachPanel />
          </TabsContent>

          {/* Developer Tab */}
          <TabsContent value="developer" className="space-y-6 mt-0">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium flex items-center gap-2 rtl:flex-row-reverse">
                <Wrench className="h-4 w-4" />
                {isArabic ? 'هذه الأدوات للاختبار فقط - لا تستخدمها في بيئة الإنتاج' : 'These tools are for testing only - do not use in production'}
              </p>
            </div>
            
            {/* Database Maintenance */}
            <DatabaseMaintenanceCard isArabic={isArabic} onCleanupComplete={onStatsRefresh} />
            
            <TestQRGenerator />
            <TestEmployeeBadgeGenerator />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SettingsPanel;
