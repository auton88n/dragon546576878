import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OperatingHours {
  openTime: string;
  closeTime: string;
  closedDays: number[]; // 0 = Sunday, 5 = Friday, etc.
  timeSlotInterval: number; // in minutes
}

export interface EventPeriod {
  startDate: string; // Format: YYYY-MM-DD
  endDate: string;   // Format: YYYY-MM-DD
  enabled: boolean;  // Whether to restrict to this period
}

export interface SiteSettings {
  operatingHours: OperatingHours;
  eventPeriod: EventPeriod;
  maxTicketsPerBooking: number;
  advanceBookingDays: number;
  sameDayCutoffHour: number;
}

const defaultSettings: SiteSettings = {
  operatingHours: {
    openTime: '15:00',
    closeTime: '00:00',
    closedDays: [], // Open daily including Friday
    timeSlotInterval: 60,
  },
  eventPeriod: {
    startDate: '2026-01-07',
    endDate: '2026-01-16',
    enabled: true,
  },
  maxTicketsPerBooking: 10,
  advanceBookingDays: 30,
  sameDayCutoffHour: 14,
};

const fetchSettingsFromDB = async (): Promise<SiteSettings> => {
  const { data, error } = await supabase
    .from('settings')
    .select('setting_key, setting_value')
    .in('setting_key', [
      'operating_hours',
      'event_period',
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
    const dbEventPeriod = settingsMap['event_period'];
    
    return {
      operatingHours: {
        ...defaultSettings.operatingHours,
        ...dbOperatingHours,
        closedDays: dbOperatingHours?.closedDays ?? defaultSettings.operatingHours.closedDays,
      },
      eventPeriod: {
        ...defaultSettings.eventPeriod,
        ...dbEventPeriod,
      },
      maxTicketsPerBooking: settingsMap['max_tickets_per_booking'] ?? defaultSettings.maxTicketsPerBooking,
      advanceBookingDays: settingsMap['advance_booking_days'] ?? defaultSettings.advanceBookingDays,
      sameDayCutoffHour: settingsMap['same_day_cutoff_hour'] ?? defaultSettings.sameDayCutoffHour,
    };
  }

  return defaultSettings;
};

const saveSettingsToDB = async (newSettings: SiteSettings): Promise<void> => {
  const settingsToSave = [
    { key: 'operating_hours', value: newSettings.operatingHours, cat: 'operations' },
    { key: 'event_period', value: newSettings.eventPeriod, cat: 'booking' },
    { key: 'max_tickets_per_booking', value: newSettings.maxTicketsPerBooking, cat: 'booking' },
    { key: 'advance_booking_days', value: newSettings.advanceBookingDays, cat: 'booking' },
    { key: 'same_day_cutoff_hour', value: newSettings.sameDayCutoffHour, cat: 'booking' },
  ];

  for (const item of settingsToSave) {
    const { error } = await supabase
      .from('settings')
      .upsert(
        {
          setting_key: item.key,
          setting_value: item.value as any,
          category: item.cat,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'setting_key' }
      );

    if (error) throw error;
  }
};

export function useSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['settings'] as const,
    queryFn: fetchSettingsFromDB,
    staleTime: 5 * 60 * 1000, // 5 minutes - settings rarely change
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when tab regains focus
  });

  const settingsMutation = useMutation({
    mutationFn: saveSettingsToDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const saveSettings = async (newSettings: SiteSettings): Promise<boolean> => {
    try {
      await settingsMutation.mutateAsync(newSettings);
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  };

  return {
    settings: settingsQuery.data ?? defaultSettings,
    loading: settingsQuery.isLoading,
    saving: settingsMutation.isPending,
    saveSettings,
    refetch: settingsQuery.refetch,
  };
}
