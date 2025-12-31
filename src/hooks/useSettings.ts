import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TicketPricing {
  adult: number;
  child: number;
  senior: number;
}

export interface OperatingHours {
  openTime: string;
  closeTime: string;
  closedDays: number[]; // 0 = Sunday, 5 = Friday, etc.
  timeSlotInterval: number; // in minutes
}

export interface SiteSettings {
  ticketPricing: TicketPricing;
  operatingHours: OperatingHours;
  maxTicketsPerBooking: number;
  advanceBookingDays: number;
  sameDayCutoffHour: number;
}

const defaultSettings: SiteSettings = {
  ticketPricing: {
    adult: 40,
    child: 25,
    senior: 0,
  },
  operatingHours: {
    openTime: '09:00',
    closeTime: '18:00',
    closedDays: [5], // Friday
    timeSlotInterval: 60,
  },
  maxTicketsPerBooking: 10,
  advanceBookingDays: 30,
  sameDayCutoffHour: 14,
};

export const useSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'ticket_pricing',
          'operating_hours',
          'max_tickets_per_booking',
          'advance_booking_days',
          'same_day_cutoff_hour',
        ]);

      if (error) throw error;

      if (data && data.length > 0) {
        const settingsMap: Record<string, any> = {};
        data.forEach((item) => {
          settingsMap[item.setting_key] = item.setting_value;
        });

        const dbOperatingHours = settingsMap['operating_hours'];
        setSettings({
          ticketPricing: { ...defaultSettings.ticketPricing, ...settingsMap['ticket_pricing'] },
          operatingHours: {
            ...defaultSettings.operatingHours,
            ...dbOperatingHours,
            closedDays: dbOperatingHours?.closedDays ?? defaultSettings.operatingHours.closedDays,
          },
          maxTicketsPerBooking: settingsMap['max_tickets_per_booking'] ?? defaultSettings.maxTicketsPerBooking,
          advanceBookingDays: settingsMap['advance_booking_days'] ?? defaultSettings.advanceBookingDays,
          sameDayCutoffHour: settingsMap['same_day_cutoff_hour'] ?? defaultSettings.sameDayCutoffHour,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: SiteSettings): Promise<boolean> => {
    setSaving(true);
    try {
      const settingsToSave = [
        { key: 'ticket_pricing', value: newSettings.ticketPricing, cat: 'pricing' },
        { key: 'operating_hours', value: newSettings.operatingHours, cat: 'operations' },
        { key: 'max_tickets_per_booking', value: newSettings.maxTicketsPerBooking, cat: 'booking' },
        { key: 'advance_booking_days', value: newSettings.advanceBookingDays, cat: 'booking' },
        { key: 'same_day_cutoff_hour', value: newSettings.sameDayCutoffHour, cat: 'booking' },
      ];

      for (const item of settingsToSave) {
        const { error } = await supabase
          .from('settings')
          .upsert({
            setting_key: item.key,
            setting_value: item.value as any,
            category: item.cat,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      setSettings(newSettings);
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, loading, saving, saveSettings, refetch: fetchSettings };
};
