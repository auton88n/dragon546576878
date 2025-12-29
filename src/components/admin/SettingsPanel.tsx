import { useState, useEffect } from 'react';
import { Settings, DollarSign, Clock, Calendar, Save, RefreshCw } from 'lucide-react';
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
    const closedDays = formData.operatingHours.closedDays.includes(day)
      ? formData.operatingHours.closedDays.filter((d) => d !== day)
      : [...formData.operatingHours.closedDays, day];
    
    setFormData({
      ...formData,
      operatingHours: { ...formData.operatingHours, closedDays },
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          {isArabic ? 'الإعدادات' : 'Settings'}
        </CardTitle>
        <CardDescription>
          {isArabic ? 'إدارة أسعار التذاكر وساعات العمل' : 'Manage ticket prices and operating hours'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ticket Pricing */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {isArabic ? 'أسعار التذاكر (ر.س)' : 'Ticket Prices (SAR)'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{isArabic ? 'بالغ' : 'Adult'}</Label>
              <Input
                type="number"
                min="0"
                value={formData.ticketPricing.adult}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ticketPricing: { ...formData.ticketPricing, adult: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div>
              <Label>{isArabic ? 'طفل' : 'Child'}</Label>
              <Input
                type="number"
                min="0"
                value={formData.ticketPricing.child}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ticketPricing: { ...formData.ticketPricing, child: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div>
              <Label>{isArabic ? 'كبير السن' : 'Senior'}</Label>
              <Input
                type="number"
                min="0"
                value={formData.ticketPricing.senior}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ticketPricing: { ...formData.ticketPricing, senior: Number(e.target.value) },
                  })
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Operating Hours */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {isArabic ? 'ساعات العمل' : 'Operating Hours'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label>{isArabic ? 'وقت الافتتاح' : 'Opening Time'}</Label>
              <Input
                type="time"
                value={formData.operatingHours.openTime}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    operatingHours: { ...formData.operatingHours, openTime: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <Label>{isArabic ? 'وقت الإغلاق' : 'Closing Time'}</Label>
              <Input
                type="time"
                value={formData.operatingHours.closeTime}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    operatingHours: { ...formData.operatingHours, closeTime: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <Label>{isArabic ? 'فترة الفتحة (دقيقة)' : 'Time Slot (minutes)'}</Label>
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
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">{isArabic ? 'أيام الإغلاق' : 'Closed Days'}</Label>
            <div className="flex flex-wrap gap-3">
              {daysOfWeek.map((day) => (
                <div key={day.value} className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={formData.operatingHours.closedDays.includes(day.value)}
                    onCheckedChange={() => toggleClosedDay(day.value)}
                  />
                  <label
                    htmlFor={`day-${day.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {isArabic ? day.labelAr : day.labelEn}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Booking Rules */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {isArabic ? 'قواعد الحجز' : 'Booking Rules'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{isArabic ? 'الحد الأقصى للتذاكر' : 'Max Tickets per Booking'}</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={formData.maxTicketsPerBooking}
                onChange={(e) =>
                  setFormData({ ...formData, maxTicketsPerBooking: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>{isArabic ? 'أيام الحجز المسبق' : 'Advance Booking Days'}</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={formData.advanceBookingDays}
                onChange={(e) =>
                  setFormData({ ...formData, advanceBookingDays: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>{isArabic ? 'قطع الحجز في نفس اليوم (ساعة)' : 'Same-Day Cutoff Hour'}</Label>
              <Input
                type="number"
                min="0"
                max="23"
                value={formData.sameDayCutoffHour}
                onChange={(e) =>
                  setFormData({ ...formData, sameDayCutoffHour: Number(e.target.value) })
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isArabic ? 'حفظ الإعدادات' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SettingsPanel;
