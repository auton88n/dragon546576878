import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ScannerStat {
  scannerId: string;
  scannerName: string;
  scansToday: number;
  lastScanTime: string | null;
}

const THROTTLE_MS = 2000;

const fetchScannerStats = async (): Promise<ScannerStat[]> => {
  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const { data: scans, error } = await supabase
    .from('scan_logs')
    .select('scanner_user_id, scan_timestamp, scan_result')
    .gte('scan_timestamp', startOfDay)
    .lte('scan_timestamp', endOfDay)
    .eq('scan_result', 'valid');

  if (error) throw error;

  const scannerIds = [...new Set(scans?.map(s => s.scanner_user_id).filter(Boolean) as string[])];

  if (scannerIds.length === 0) {
    return [];
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', scannerIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

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

  return Array.from(statsMap.entries())
    .map(([scannerId, data]) => ({
      scannerId,
      scannerName: profileMap.get(scannerId) || 'Unknown',
      scansToday: data.count,
      lastScanTime: data.lastScan,
    }))
    .sort((a, b) => b.scansToday - a.scansToday);
};

export const useScannerStats = () => {
  const queryClient = useQueryClient();
  const lastFetchRef = useRef<number>(0);

  const { data: scannerStats, isLoading: loading, refetch } = useQuery({
    queryKey: ['scanner-stats'],
    queryFn: fetchScannerStats,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const throttledRefetch = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchRef.current > THROTTLE_MS) {
      lastFetchRef.current = now;
      queryClient.invalidateQueries({ queryKey: ['scanner-stats'] });
    }
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel('scanner-stats-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scan_logs' },
        throttledRefetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [throttledRefetch]);

  return { scannerStats: scannerStats || [], loading, refetch };
};
