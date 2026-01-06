import { useState, useEffect, useMemo } from 'react';
import { Settings, Clock, Calendar, Save, RefreshCw, CalendarRange, RotateCcw } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettings, SiteSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import TestQRGenerator from './TestQRGenerator';
import PackagesManager from './PackagesManager';
import AttractionsManager from './AttractionsManager';
import StaffManager from './StaffManager';
import EmployeesManager from './EmployeesManager';

const SettingsPanel = () => {
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

  const daysOfWeek = [
    { value: 0, labelAr: 'الأحد', labelEn: 'Sunday' },
    { value: 1, labelAr: 'الإثنين', labelEn: 'Monday' },
    { value: 2, labelAr: 'الثلاثاء', labelEn: 'Tuesday' },
    { value: 3, labelAr: 'الأربعاء', labelEn: 'Wednesday' },
    { value: 4, labelAr: 'الخميس', labelEn: 'Thursday' },
    { value: 5, labelAr: 'الجمعة', labelEn: 'Friday' },
    { value: 6, labelAr: 'السبت', labelEn: 'Saturday' },
  ];

  const toggleClosedDay = (day: number) => {
    if (!formData) return;
    const currentClosedDays = formData.operatingHours?.closedDays ?? [];
    const closedDays = currentClosedDays.includes(day)
      ? currentClosedDays.filter((d) => d !== day)
      : [...currentClosedDays, day];
    
    setFormData({
      ...formData,
      operatingHours: { ...formData.operatingHours, closedDays },
    });
  };

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
          {isArabic ? 'إدارة ساعات العمل وقواعد الحجز' : 'Manage operating hours and booking rules'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 md:space-y-8 p-4 md:p-6 pt-4 md:pt-6">
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

        <Separator className="my-4" />

        {/* Staff Management */}
        <StaffManager />

        <Separator className="my-4" />

        {/* Employees Manager */}
        <EmployeesManager />

        <Separator className="my-4" />

        {/* Packages Manager */}
        <PackagesManager />

        <Separator className="my-4" />

        {/* Attractions Manager */}
        <AttractionsManager />

        <Separator className="my-4" />

        {/* Test QR Generator */}
        <TestQRGenerator />
      </CardContent>
    </Card>
  );
};

export default SettingsPanel;
