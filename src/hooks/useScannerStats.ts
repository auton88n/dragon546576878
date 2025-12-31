import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ScannerStat {
  scannerId: string;
  scannerName: string;
  scansToday: number;
  lastScanTime: string | null;
}

const THROTTLE_MS = 2000;

export const useScannerStats = () => {
  const [scannerStats, setScannerStats] = useState<ScannerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);

  const fetchStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;

      // Get today's scans with scanner info
      const { data: scans, error } = await supabase
        .from('scan_logs')
        .select('scanner_user_id, scan_timestamp, scan_result')
        .gte('scan_timestamp', startOfDay)
        .lte('scan_timestamp', endOfDay)
        .eq('scan_result', 'valid');

      if (error) throw error;

      // Get unique scanner IDs
      const scannerIds = [...new Set(scans?.map(s => s.scanner_user_id).filter(Boolean) as string[])];

      if (scannerIds.length === 0) {
        setScannerStats([]);
        return;
      }

      // Fetch scanner profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', scannerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Aggregate stats per scanner
      const statsMap = new Map<string, { count: number; lastScan: string | null }>();
      
      scans?.forEach(scan => {
        if (!scan.scanner_user_id) return;
        const current = statsMap.get(scan.scanner_user_id) || { count: 0, lastScan: null };
        current.count++;
        if (!current.lastScan || (scan.scan_timestamp && scan.scan_timestamp > current.lastScan)) {
          current.lastScan = scan.scan_timestamp;
        }
        statsMap.set(scan.scanner_user_id, current);
      });

      // Build sorted leaderboard
      const leaderboard: ScannerStat[] = Array.from(statsMap.entries())
        .map(([scannerId, data]) => ({
          scannerId,
          scannerName: profileMap.get(scannerId) || 'Unknown',
          scansToday: data.count,
          lastScanTime: data.lastScan,
        }))
        .sort((a, b) => b.scansToday - a.scansToday);

      setScannerStats(leaderboard);
    } catch (error) {
      console.error('Error fetching scanner stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const throttledFetch = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchRef.current > THROTTLE_MS) {
      lastFetchRef.current = now;
      fetchStats();
    }
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const channel = supabase
      .channel('scanner-stats')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scan_logs' },
        throttledFetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [throttledFetch]);

  return { scannerStats, loading, refetch: fetchStats };
};
