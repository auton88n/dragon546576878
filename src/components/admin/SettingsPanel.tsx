import { useState, useEffect } from 'react';
import { Settings, Clock, Calendar, Save, RefreshCw } from 'lucide-react';
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
import TestQRGenerator from './TestQRGenerator';
import PackagesManager from './PackagesManager';
import AttractionsManager from './AttractionsManager';
import StaffManager from './StaffManager';

const SettingsPanel = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { toast } = useToast();
  const { settings, loading, saving, saveSettings } = useSettings();

  const [formData, setFormData] = useState<SiteSettings>(settings);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSave = async () => {
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
    const currentClosedDays = formData.operatingHours?.closedDays ?? [];
    const closedDays = currentClosedDays.includes(day)
      ? currentClosedDays.filter((d) => d !== day)
      : [...currentClosedDays, day];
    
    setFormData({
      ...formData,
      operatingHours: { ...formData.operatingHours, closedDays },
    });
  };

  if (loading) {
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6 rtl:[direction:rtl]">
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

          <div className="text-start">
            <Label className="mb-3 block text-muted-foreground">{isArabic ? 'أيام الإغلاق' : 'Closed Days'}</Label>
            <div className="flex flex-wrap gap-3 rtl:[direction:rtl]">
              {daysOfWeek.map((day) => (
                <div 
                  key={day.value} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors cursor-pointer rtl:flex-row-reverse ${
                    (formData.operatingHours?.closedDays ?? []).includes(day.value)
                      ? 'bg-accent/20 border-accent/40'
                      : 'bg-background/50 border-border/50 hover:border-accent/30'
                  }`}
                  onClick={() => toggleClosedDay(day.value)}
                >
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={(formData.operatingHours?.closedDays ?? []).includes(day.value)}
                    onCheckedChange={() => toggleClosedDay(day.value)}
                    className="border-accent data-[state=checked]:bg-accent"
                  />
                  <label
                    htmlFor={`day-${day.value}`}
                    className="text-sm cursor-pointer font-medium"
                  >
                    {isArabic ? day.labelAr : day.labelEn}
                  </label>
                </div>
              ))}
            </div>
          </div>
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
        <div className="flex justify-center sm:justify-end rtl:sm:justify-start pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-6 md:px-8 py-4 md:py-6 text-base md:text-lg rounded-xl shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 md:h-5 md:w-5" />
            )}
            {isArabic ? 'حفظ الإعدادات' : 'Save Settings'}
          </Button>
        </div>

        <Separator className="my-4" />

        {/* Staff Management */}
        <StaffManager />

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
