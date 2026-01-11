import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, subWeeks, startOfDay, endOfDay, parseISO, format } from 'date-fns';

interface CampaignStats {
  campaign_id: string;
  campaign_name: string;
  scan_count: number;
}

interface DestinationStats {
  destination: string;
  count: number;
  percentage: number;
}

interface RecentScan {
  id: string;
  campaign_id: string;
  campaign_name: string;
  destination: string;
  scanned_at: string;
  user_agent: string | null;
  device_type: string;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface MarketingAnalytics {
  totalScans: number;
  thisWeekScans: number;
  lastWeekScans: number;
  todayScans: number;
  weeklyChange: number;
  campaignStats: CampaignStats[];
  destinationStats: DestinationStats[];
  recentScans: RecentScan[];
}

// Parse user agent to determine device type
const parseDeviceType = (userAgent: string | null): string => {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iPhone/iPad';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac')) return 'Mac';
  if (ua.includes('linux')) return 'Linux';
  return 'Other';
};

export const useMarketingAnalytics = (dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['marketing-analytics', dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: async (): Promise<MarketingAnalytics> => {
      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 0 });
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      // Build date filter if provided
      const dateFilterStart = dateRange?.start ? dateRange.start.toISOString() : null;
      const dateFilterEnd = dateRange?.end ? endOfDay(dateRange.end).toISOString() : null;

      // Total scans (filtered by date range if provided)
      let totalQuery = supabase
        .from('marketing_qr_scans')
        .select('*', { count: 'exact', head: true });
      
      if (dateFilterStart) totalQuery = totalQuery.gte('scanned_at', dateFilterStart);
      if (dateFilterEnd) totalQuery = totalQuery.lte('scanned_at', dateFilterEnd);
      
      const { count: totalScans } = await totalQuery;

      // This week scans
      const { count: thisWeekScans } = await supabase
        .from('marketing_qr_scans')
        .select('*', { count: 'exact', head: true })
        .gte('scanned_at', thisWeekStart.toISOString());

      // Last week scans
      const { count: lastWeekScans } = await supabase
        .from('marketing_qr_scans')
        .select('*', { count: 'exact', head: true })
        .gte('scanned_at', lastWeekStart.toISOString())
        .lt('scanned_at', thisWeekStart.toISOString());

      // Today scans
      const { count: todayScans } = await supabase
        .from('marketing_qr_scans')
        .select('*', { count: 'exact', head: true })
        .gte('scanned_at', todayStart.toISOString())
        .lte('scanned_at', todayEnd.toISOString());

      // Calculate weekly change percentage
      const weeklyChange = lastWeekScans && lastWeekScans > 0
        ? Math.round(((thisWeekScans || 0) - lastWeekScans) / lastWeekScans * 100)
        : thisWeekScans && thisWeekScans > 0 ? 100 : 0;

      // Get all scans for aggregation (with date filter)
      let allScansQuery = supabase
        .from('marketing_qr_scans')
        .select('campaign_id, campaign_name, destination');
      
      if (dateFilterStart) allScansQuery = allScansQuery.gte('scanned_at', dateFilterStart);
      if (dateFilterEnd) allScansQuery = allScansQuery.lte('scanned_at', dateFilterEnd);
      
      const { data: allScans } = await allScansQuery;

      // Get recent scans (last 20)
      let recentScansQuery = supabase
        .from('marketing_qr_scans')
        .select('id, campaign_id, campaign_name, destination, scanned_at, user_agent')
        .order('scanned_at', { ascending: false })
        .limit(20);
      
      if (dateFilterStart) recentScansQuery = recentScansQuery.gte('scanned_at', dateFilterStart);
      if (dateFilterEnd) recentScansQuery = recentScansQuery.lte('scanned_at', dateFilterEnd);
      
      const { data: recentScansData } = await recentScansQuery;

      // Aggregate campaign stats
      const campaignMap = new Map<string, { name: string; count: number }>();
      const destinationMap = new Map<string, number>();

      (allScans || []).forEach((scan) => {
        // Campaign aggregation
        const existing = campaignMap.get(scan.campaign_id);
        if (existing) {
          existing.count++;
        } else {
          campaignMap.set(scan.campaign_id, {
            name: scan.campaign_name,
            count: 1,
          });
        }

        // Destination aggregation
        const destCount = destinationMap.get(scan.destination) || 0;
        destinationMap.set(scan.destination, destCount + 1);
      });

      // Convert campaign map to sorted array
      const campaignStats: CampaignStats[] = Array.from(campaignMap.entries())
        .map(([campaign_id, { name, count }]) => ({
          campaign_id,
          campaign_name: name,
          scan_count: count,
        }))
        .sort((a, b) => b.scan_count - a.scan_count)
        .slice(0, 10); // Top 10 campaigns

      // Convert destination map to array with percentages
      const total = totalScans || 1;
      const destinationStats: DestinationStats[] = Array.from(destinationMap.entries())
        .map(([destination, count]) => ({
          destination,
          count,
          percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      // Process recent scans with device type
      const recentScans: RecentScan[] = (recentScansData || []).map((scan) => ({
        id: scan.id,
        campaign_id: scan.campaign_id,
        campaign_name: scan.campaign_name,
        destination: scan.destination,
        scanned_at: scan.scanned_at,
        user_agent: scan.user_agent,
        device_type: parseDeviceType(scan.user_agent),
      }));

      return {
        totalScans: totalScans || 0,
        thisWeekScans: thisWeekScans || 0,
        lastWeekScans: lastWeekScans || 0,
        todayScans: todayScans || 0,
        weeklyChange,
        campaignStats,
        destinationStats,
        recentScans,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
