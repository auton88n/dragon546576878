import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, subWeeks } from 'date-fns';

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

interface MarketingAnalytics {
  totalScans: number;
  thisWeekScans: number;
  lastWeekScans: number;
  weeklyChange: number;
  campaignStats: CampaignStats[];
  destinationStats: DestinationStats[];
}

export const useMarketingAnalytics = () => {
  return useQuery({
    queryKey: ['marketing-analytics'],
    queryFn: async (): Promise<MarketingAnalytics> => {
      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 0 });
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });

      // Total scans
      const { count: totalScans } = await supabase
        .from('marketing_qr_scans')
        .select('*', { count: 'exact', head: true });

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

      // Calculate weekly change percentage
      const weeklyChange = lastWeekScans && lastWeekScans > 0
        ? Math.round(((thisWeekScans || 0) - lastWeekScans) / lastWeekScans * 100)
        : thisWeekScans && thisWeekScans > 0 ? 100 : 0;

      // Campaign stats - get all scans and aggregate
      const { data: allScans } = await supabase
        .from('marketing_qr_scans')
        .select('campaign_id, campaign_name, destination');

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

      return {
        totalScans: totalScans || 0,
        thisWeekScans: thisWeekScans || 0,
        lastWeekScans: lastWeekScans || 0,
        weeklyChange,
        campaignStats,
        destinationStats,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
