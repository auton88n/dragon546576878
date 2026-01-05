import { useState, useEffect, useCallback } from 'react';
import { markTicketAsUsed, logScanAttempt, type TicketValidationResult } from '@/lib/ticketService';
import { safeLocalStorage } from '@/lib/safeStorage';

interface QueuedScan {
  id: string;
  ticketId: string;
  ticketCode: string;
  status: TicketValidationResult['status'];
  scannerId?: string;
  deviceInfo?: string;
  timestamp: number;
}

const STORAGE_KEY = 'offline_scan_queue';

export const useOfflineScanQueue = (userId?: string) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedScan[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load queue from localStorage on mount
  useEffect(() => {
    const stored = safeLocalStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse offline queue:', e);
      }
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }, [queue]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Add a scan to the offline queue
  const addToQueue = useCallback((
    ticketId: string,
    ticketCode: string,
    status: TicketValidationResult['status'],
    deviceInfo?: string
  ) => {
    const queuedScan: QueuedScan = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ticketId,
      ticketCode,
      status,
      scannerId: userId,
      deviceInfo,
      timestamp: Date.now(),
    };

    setQueue(prev => [...prev, queuedScan]);
    return queuedScan.id;
  }, [userId]);

  // Process a single queued scan
  const processScan = async (scan: QueuedScan): Promise<boolean> => {
    try {
      // Mark ticket as used if it was valid
      if (scan.status === 'valid') {
        await markTicketAsUsed(scan.ticketId, scan.scannerId, 'main_entrance');
      }
      
      // Log the scan attempt
      await logScanAttempt(
        scan.ticketId,
        scan.status,
        scan.scannerId,
        scan.deviceInfo
      );
      
      return true;
    } catch (err) {
      console.error('Failed to process queued scan:', err);
      return false;
    }
  };

  // Sync all queued scans
  const syncQueue = useCallback(async () => {
    if (!isOnline || queue.length === 0 || isSyncing) return;

    setIsSyncing(true);
    const processedIds: string[] = [];

    for (const scan of queue) {
      const success = await processScan(scan);
      if (success) {
        processedIds.push(scan.id);
      }
    }

    // Remove successfully processed scans
    setQueue(prev => prev.filter(s => !processedIds.includes(s.id)));
    setIsSyncing(false);

    return processedIds.length;
  }, [isOnline, queue, isSyncing]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      syncQueue();
    }
  }, [isOnline, queue.length, syncQueue]);

  // Clear the queue
  const clearQueue = useCallback(() => {
    setQueue([]);
    safeLocalStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    isOnline,
    queue,
    queueLength: queue.length,
    isSyncing,
    addToQueue,
    syncQueue,
    clearQueue,
  };
};