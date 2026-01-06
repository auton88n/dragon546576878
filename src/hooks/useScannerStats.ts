import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ScannerStat {
  scannerId: string;
  scannerName: string;
  scansCount: number;
  validScans: number;
  lastScanTime: string | null;
}

export type DateRange = 'today' | '7days' | '30days';

const THROTTLE_MS = 2000;

const getDateRange = (range: DateRange): { start: string; end: string } => {
  const now = new Date();
  const end = now.toISOString();
  
  let start: Date;
  switch (range) {
    case '7days':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case '30days':
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      break;
    case 'today':
    default:
      start = new Date(now.toISOString().split('T')[0] + 'T00:00:00.000Z');
      break;
  }
  
  return { start: start.toISOString(), end };
};

const fetchScannerStats = async (range: DateRange): Promise<ScannerStat[]> => {
  const { start, end } = getDateRange(range);

  // Fetch ALL scan attempts (not just valid) to show complete scanner activity
  const { data: scans, error } = await supabase
    .from('scan_logs')
    .select('scanner_user_id, scan_timestamp, scan_result')
    .gte('scan_timestamp', start)
    .lte('scan_timestamp', end);

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

  const statsMap = new Map<string, { count: number; validCount: number; lastScan: string | null }>();
  
  scans?.forEach(scan => {
    if (!scan.scanner_user_id) return;
    const current = statsMap.get(scan.scanner_user_id) || { count: 0, validCount: 0, lastScan: null };
    current.count++;
    if (scan.scan_result === 'valid') {
      current.validCount++;
    }
    if (!current.lastScan || (scan.scan_timestamp && scan.scan_timestamp > current.lastScan)) {
      current.lastScan = scan.scan_timestamp;
    }
    statsMap.set(scan.scanner_user_id, current);
  });

  return Array.from(statsMap.entries())
    .map(([scannerId, data]) => ({
      scannerId,
      scannerName: profileMap.get(scannerId) || 'Unknown',
      scansCount: data.count,
      validScans: data.validCount,
      lastScanTime: data.lastScan,
    }))
    .sort((a, b) => b.scansCount - a.scansCount);
};

export const useScannerStats = (range: DateRange = 'today') => {
  const queryClient = useQueryClient();
  const lastFetchRef = useRef<number>(0);

  const { data: scannerStats, isLoading: loading, refetch } = useQuery({
    queryKey: ['scanner-stats', range],
    queryFn: () => fetchScannerStats(range),
    staleTime: 30000,
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
