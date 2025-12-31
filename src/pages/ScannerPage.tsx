import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { QrCode, Camera, CheckCircle, XCircle, AlertTriangle, History, Volume2, VolumeX, Search, Loader2, Wifi, WifiOff, RefreshCw, Check, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuthStore } from '@/stores/authStore';
import { validateTicket, markTicketAsUsed, logScanAttempt, lookupTicket, type TicketValidationResult } from '@/lib/ticketService';
import { useOfflineScanQueue } from '@/hooks/useOfflineScanQueue';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ScanResult {
  timestamp: Date;
  status: TicketValidationResult['status'];
  ticketCode?: string;
  customerName?: string;
  ticketType?: string;
}

// Constants for stability
const RESULT_DISPLAY_TIMEOUT = 2000; // 2 seconds for faster throughput
const DUPLICATE_SCAN_THRESHOLD = 5000; // 5 seconds to prevent duplicate scans
const SCANNER_RESTART_THRESHOLD = 500; // Restart scanner every 500 scans
const STATS_STORAGE_KEY = 'scanner_daily_stats';
const RECENT_SCANS_STORAGE_KEY = 'scanner_recent_scans';

// Helper to get today's date key
const getTodayKey = () => new Date().toISOString().split('T')[0];

// Load stats from localStorage
const loadStoredStats = () => {
  try {
    const stored = localStorage.getItem(STATS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only use if same day
      if (parsed.date === getTodayKey()) {
        return parsed.stats;
      }
    }
  } catch (e) {
    console.error('Failed to load stored stats:', e);
  }
  return { totalScans: 0, validScans: 0, invalidScans: 0, usedScans: 0 };
};

// Load recent scans from localStorage
const loadStoredRecentScans = (): ScanResult[] => {
  try {
    const stored = localStorage.getItem(RECENT_SCANS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only use if same day and convert timestamps
      if (parsed.date === getTodayKey()) {
        return parsed.scans.map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp)
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load recent scans:', e);
  }
  return [];
};

const ScannerPage = () => {
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { user } = useAuthStore();
  const { isOnline, queueLength, isSyncing, addToQueue, syncQueue } = useOfflineScanQueue(user?.id);
  
  const [isScanning, setIsScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentResult, setCurrentResult] = useState<TicketValidationResult | null>(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [recentScans, setRecentScans] = useState<ScanResult[]>(loadStoredRecentScans);
  const [todayStats, setTodayStats] = useState(loadStoredStats);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TicketValidationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showManualLookup, setShowManualLookup] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const scanCountSinceRestartRef = useRef<number>(0);

  // Persist stats to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify({
      date: getTodayKey(),
      stats: todayStats
    }));
  }, [todayStats]);

  // Persist recent scans to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(RECENT_SCANS_STORAGE_KEY, JSON.stringify({
      date: getTodayKey(),
      scans: recentScans
    }));
  }, [recentScans]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to toggle manual lookup
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowManualLookup(prev => !prev);
        // Focus input when opening
        setTimeout(() => {
          if (!showManualLookup) {
            searchInputRef.current?.focus();
          }
        }, 100);
      }
      // Escape to close manual lookup
      if (e.key === 'Escape' && showManualLookup) {
        setShowManualLookup(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showManualLookup]);

  // Initialize AudioContext once and handle suspended state
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (required for mobile browsers)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Haptic feedback for mobile
  const triggerHaptic = useCallback((type: 'success' | 'error' | 'warning') => {
    if (!('vibrate' in navigator)) return;
    
    try {
      switch (type) {
        case 'success':
          // Short single vibration
          navigator.vibrate(100);
          break;
        case 'warning':
          // Double vibration
          navigator.vibrate([100, 50, 100]);
          break;
        case 'error':
          // Long vibration
          navigator.vibrate(300);
          break;
      }
    } catch (e) {
      // Ignore vibration errors
    }
  }, []);

  // Play feedback sound with distinct tones (reuses single AudioContext)
  const playSound = useCallback((type: 'success' | 'error' | 'warning') => {
    if (!soundEnabled) return;
    
    try {
      const ctx = initAudioContext();
      
      if (type === 'success') {
        // Two-tone ascending beep for valid
        [660, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.15);
          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + 0.15);
        });
      } else if (type === 'warning') {
        // Two quick beeps for already used
        [440, 440].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'triangle';
          gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.2);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.1);
          osc.start(ctx.currentTime + i * 0.2);
          osc.stop(ctx.currentTime + i * 0.2 + 0.1);
        });
      } else {
        // Low descending tone for invalid
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.4);
        osc.type = 'square';
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  }, [soundEnabled, initAudioContext]);

  // Combined feedback (sound + haptic)
  const playFeedback = useCallback((type: 'success' | 'error' | 'warning') => {
    playSound(type);
    triggerHaptic(type);
  }, [playSound, triggerHaptic]);

  // Dismiss result overlay (tap to continue)
  const dismissResult = useCallback(() => {
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
    }
    setShowResultOverlay(false);
    setCurrentResult(null);
    
    // Resume scanning
    if (scannerRef.current) {
      try {
        scannerRef.current.resume();
      } catch (e) {
        // Ignore resume errors
      }
    }
  }, []);

  // Manual ticket lookup
  const handleManualLookup = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await lookupTicket(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Lookup error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Process manual lookup result
  const handleProcessTicket = useCallback(async (result: TicketValidationResult) => {
    setCurrentResult(result);
    setShowResultOverlay(true);
    
    if (result.isValid) {
      playFeedback('success');
      if (result.ticket) {
        await markTicketAsUsed(result.ticket.id, user?.id, 'main_entrance');
      }
    } else if (result.status === 'used') {
      playFeedback('warning');
    } else {
      playFeedback('error');
    }

    await logScanAttempt(result.ticket?.id || null, result.status, user?.id, 'manual_lookup');

    setTodayStats(prev => ({
      totalScans: prev.totalScans + 1,
      validScans: result.isValid ? prev.validScans + 1 : prev.validScans,
      invalidScans: ['invalid', 'not_found'].includes(result.status) ? prev.invalidScans + 1 : prev.invalidScans,
      usedScans: result.status === 'used' ? prev.usedScans + 1 : prev.usedScans,
    }));

    setRecentScans(prev => [{
      timestamp: new Date(),
      status: result.status,
      ticketCode: result.ticket?.ticketCode,
      customerName: result.ticket?.customerName,
      ticketType: result.ticket?.ticketType,
    }, ...prev.slice(0, 9)]);

    // Refresh search results
    handleManualLookup();

    resultTimeoutRef.current = setTimeout(() => {
      setShowResultOverlay(false);
      setCurrentResult(null);
    }, RESULT_DISPLAY_TIMEOUT);
  }, [playFeedback, user, handleManualLookup]);

  // Manual sync for offline queue
  const handleManualSync = useCallback(async () => {
    if (!isOnline || queueLength === 0 || isSyncing) return;
    
    const syncedCount = await syncQueue();
    if (syncedCount && syncedCount > 0) {
      toast.success(
        isArabic 
          ? `تمت مزامنة ${syncedCount} عمليات بنجاح`
          : `Synced ${syncedCount} scans successfully`
      );
    }
  }, [isOnline, queueLength, isSyncing, syncQueue, isArabic]);

  // Auto-restart scanner for memory management
  const restartScannerIfNeeded = useCallback(async () => {
    if (scanCountSinceRestartRef.current >= SCANNER_RESTART_THRESHOLD) {
      console.log('Auto-restarting scanner for memory optimization...');
      scanCountSinceRestartRef.current = 0;
      
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          // Brief pause before restart
          await new Promise(resolve => setTimeout(resolve, 100));
          await startScanning();
        } catch (e) {
          console.error('Error during scanner restart:', e);
        }
      }
    }
  }, []);

  // Handle QR code scan result
  const onScanSuccess = useCallback(async (decodedText: string) => {
    const now = Date.now();
    
    // Duplicate scan prevention
    if (
      lastScannedCodeRef.current === decodedText &&
      now - lastScanTimeRef.current < DUPLICATE_SCAN_THRESHOLD
    ) {
      console.log('Duplicate scan prevented:', decodedText);
      return;
    }
    
    // Update last scan tracking
    lastScannedCodeRef.current = decodedText;
    lastScanTimeRef.current = now;
    scanCountSinceRestartRef.current++;

    // Pause scanning while processing
    if (scannerRef.current) {
      try {
        await scannerRef.current.pause();
      } catch (e) {
        // Ignore pause errors
      }
    }

    // Validate the ticket
    const result = await validateTicket(decodedText);
    setCurrentResult(result);
    setShowResultOverlay(true);

    // Play appropriate feedback (sound + haptic)
    if (result.isValid) {
      playFeedback('success');
      // Mark ticket as used - queue if offline
      if (result.ticket) {
        if (isOnline) {
          await markTicketAsUsed(result.ticket.id, user?.id, 'main_entrance');
          await logScanAttempt(result.ticket.id, result.status, user?.id, navigator.userAgent);
        } else {
          addToQueue(result.ticket.id, result.ticket.ticketCode, result.status, navigator.userAgent);
        }
      }
    } else if (result.status === 'used') {
      playFeedback('warning');
    } else {
      playFeedback('error');
    }

    // Update stats
    setTodayStats(prev => ({
      totalScans: prev.totalScans + 1,
      validScans: result.isValid ? prev.validScans + 1 : prev.validScans,
      invalidScans: result.status === 'invalid' || result.status === 'not_found' ? prev.invalidScans + 1 : prev.invalidScans,
      usedScans: result.status === 'used' ? prev.usedScans + 1 : prev.usedScans,
    }));

    // Add to recent scans
    setRecentScans(prev => [{
      timestamp: new Date(),
      status: result.status,
      ticketCode: result.ticket?.ticketCode,
      customerName: result.ticket?.customerName,
      ticketType: result.ticket?.ticketType,
    }, ...prev.slice(0, 9)]);

    // Auto-dismiss result and resume scanning
    resultTimeoutRef.current = setTimeout(async () => {
      setShowResultOverlay(false);
      setCurrentResult(null);
      if (scannerRef.current) {
        try {
          await scannerRef.current.resume();
        } catch (e) {
          // Ignore resume errors
        }
      }
      // Check if scanner needs restart
      await restartScannerIfNeeded();
    }, RESULT_DISPLAY_TIMEOUT);
  }, [playFeedback, user, isOnline, addToQueue, restartScannerIfNeeded]);

  // Start camera scanning with back camera preference
  const startScanning = async () => {
    setCameraError(null);
    setIsScanning(true); // Show scanner area immediately
    
    // Initialize AudioContext on first user interaction
    initAudioContext();
    
    try {
      // Create scanner if not exists
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }

      const qrConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      };

      // Try to get available cameras first
      let cameraId: string | { facingMode: string } = { facingMode: 'environment' };
      
      try {
        const cameras = await Html5Qrcode.getCameras();
        console.log('Available cameras:', cameras);
        
        if (cameras && cameras.length > 0) {
          // Find back camera by label
          const backCamera = cameras.find(cam => 
            cam.label.toLowerCase().includes('back') ||
            cam.label.toLowerCase().includes('rear') ||
            cam.label.toLowerCase().includes('environment')
          );
          
          if (backCamera) {
            cameraId = backCamera.id;
            console.log('Using back camera by label:', backCamera.label);
          } else {
            // On phones, back camera is usually the last one
            cameraId = cameras[cameras.length - 1].id;
            console.log('Using last camera:', cameras[cameras.length - 1].label);
          }
        }
      } catch (camErr) {
        console.log('Could not enumerate cameras, using facingMode:', camErr);
      }

      // Start the scanner
      await scannerRef.current.start(
        cameraId,
        qrConfig,
        onScanSuccess,
        () => {} // Ignore scan failures
      );

      setCameraReady(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setCameraReady(false);
      setIsScanning(false);
      
      // Show user-friendly error messages
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        setCameraError(isArabic 
          ? 'يرجى السماح بالوصول للكاميرا في إعدادات المتصفح'
          : 'Please allow camera access in your browser settings');
      } else if (err.name === 'NotFoundError' || err.message?.includes('Requested device not found')) {
        setCameraError(isArabic
          ? 'لم يتم العثور على كاميرا'
          : 'No camera found on this device');
      } else if (err.name === 'NotReadableError') {
        setCameraError(isArabic
          ? 'الكاميرا مستخدمة من قبل تطبيق آخر'
          : 'Camera is being used by another app');
      } else {
        setCameraError(isArabic
          ? 'حدث خطأ في الكاميرا. يرجى المحاولة مرة أخرى'
          : 'Camera error. Please try again');
      }
    }
  };

  // Stop camera scanning
  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
    setCameraReady(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
      }
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
            scannerRef.current.stop();
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const getStatusColor = (status: TicketValidationResult['status']) => {
    switch (status) {
      case 'valid': return 'bg-success';
      case 'used': return 'bg-warning';
      case 'expired':
      case 'wrong_date':
      case 'invalid':
      case 'not_found':
      default: return 'bg-destructive';
    }
  };

  const getStatusIcon = (status: TicketValidationResult['status']) => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-24 w-24" />;
      case 'used': return <AlertTriangle className="h-24 w-24" />;
      default: return <XCircle className="h-24 w-24" />;
    }
  };

  const getStatusText = (status: TicketValidationResult['status']) => {
    const texts: Record<string, { ar: string; en: string }> = {
      valid: { ar: 'تذكرة صالحة', en: 'Valid Ticket' },
      used: { ar: 'تذكرة مستخدمة', en: 'Already Used' },
      expired: { ar: 'تذكرة منتهية', en: 'Expired Ticket' },
      wrong_date: { ar: 'تاريخ خاطئ', en: 'Wrong Date' },
      invalid: { ar: 'تذكرة غير صالحة', en: 'Invalid Ticket' },
      not_found: { ar: 'تذكرة غير موجودة', en: 'Not Found' },
    };
    return isArabic ? texts[status]?.ar : texts[status]?.en;
  };

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />

      {/* Result Overlay - Tap to dismiss */}
      {showResultOverlay && currentResult && (
        <div 
          className={cn(
            'fixed inset-0 z-50 flex flex-col items-center justify-center text-white p-8 animate-fade-in cursor-pointer',
            getStatusColor(currentResult.status)
          )}
          onClick={dismissResult}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && dismissResult()}
        >
          {getStatusIcon(currentResult.status)}
          <h2 className="text-3xl font-bold mt-6 mb-2">
            {getStatusText(currentResult.status)}
          </h2>
          <p className="text-xl opacity-90 mb-4">{currentResult.message}</p>
          {currentResult.ticket && (
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/30">
              <p className="text-lg font-semibold">{currentResult.ticket.customerName}</p>
              <p className="opacity-80 font-mono">{currentResult.ticket.ticketCode}</p>
              <p className="text-sm opacity-70 capitalize mt-2 px-4 py-1 bg-white/10 rounded-full inline-block">
                {currentResult.ticket.ticketType}
              </p>
            </div>
          )}
          <p className="mt-6 opacity-60 text-sm">
            {isArabic ? 'اضغط للمتابعة أو انتظر...' : 'Tap to continue or wait...'}
          </p>
        </div>
      )}

      <main className="flex-1 pt-24 md:pt-28 pb-6 md:pb-8 px-4 md:px-6">
        <div className="container max-w-4xl px-0">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-4 md:mb-6 animate-fade-in">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl gradient-gold flex items-center justify-center glow-gold flex-shrink-0">
                <span className="icon-wrapper">
                  <QrCode className="h-6 w-6 md:h-7 md:w-7 text-foreground" aria-hidden="true" />
                </span>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  {isArabic ? 'ماسح التذاكر' : 'Ticket Scanner'}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {isArabic ? 'امسح رموز QR للتحقق' : 'Scan QR codes to validate'}
                </p>
              </div>
            </div>
            
            {/* Status Indicator & Sync Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Online/Offline Badge */}
              <Badge 
                variant={isOnline ? "outline" : "destructive"}
                className={cn(
                  "gap-1.5 px-2 py-1 text-xs font-medium",
                  isOnline 
                    ? "border-success/50 text-success bg-success/10" 
                    : "border-destructive/50"
                )}
              >
                <span className="icon-wrapper">
                  {isSyncing ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  ) : isOnline ? (
                    <Wifi className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <WifiOff className="h-3 w-3" aria-hidden="true" />
                  )}
                </span>
                <span className="hidden sm:inline">
                  {isSyncing 
                    ? (isArabic ? 'مزامنة...' : 'Syncing...') 
                    : isOnline 
                      ? (isArabic ? 'متصل' : 'Online') 
                      : (isArabic ? 'غير متصل' : 'Offline')
                  }
                </span>
              </Badge>

              {/* Manual Sync Button - Only show when there are queued scans */}
              {queueLength > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualSync}
                  disabled={!isOnline || isSyncing}
                  className="gap-1.5 h-8 px-2 md:px-3 border-warning/50 text-warning hover:bg-warning/10 hover:text-warning"
                >
                  <span className="icon-wrapper">
                    <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} aria-hidden="true" />
                  </span>
                  <span className="text-xs font-medium">
                    {isArabic ? `مزامنة (${queueLength})` : `Sync (${queueLength})`}
                  </span>
                </Button>
              )}

              {/* Sound Toggle */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="border-accent/30 hover:bg-accent/5 h-10 w-10 md:h-12 md:w-12 rounded-xl flex-shrink-0"
              >
                <span className="icon-wrapper">
                  {soundEnabled ? <Volume2 className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" /> : <VolumeX className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />}
                </span>
              </Button>
            </div>
          </div>

          {/* Compact Stats Bar */}
          <div className="flex items-center justify-center gap-3 md:gap-4 py-2.5 px-4 bg-muted/30 rounded-lg text-sm mb-4 md:mb-6">
            {/* Total */}
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "w-2 h-2 rounded-full transition-colors",
                todayStats.totalScans > 0 ? "bg-foreground" : "bg-muted-foreground/50"
              )} />
              <span className={cn(
                "transition-all tabular-nums",
                todayStats.totalScans > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
              )}>
                {todayStats.totalScans}
              </span>
              <span className="text-muted-foreground text-xs hidden sm:inline">
                {isArabic ? 'إجمالي' : 'Total'}
              </span>
            </div>

            <div className="w-px h-4 bg-border" />

            {/* Valid */}
            <div className="flex items-center gap-1.5">
              <span className="icon-wrapper">
                <Check className={cn(
                  "w-3.5 h-3.5 transition-colors",
                  todayStats.validScans > 0 ? "text-success" : "text-muted-foreground/50"
                )} />
              </span>
              <span className={cn(
                "transition-all tabular-nums",
                todayStats.validScans > 0 ? "font-semibold text-success" : "text-muted-foreground"
              )}>
                {todayStats.validScans}
              </span>
              <span className="text-muted-foreground text-xs hidden sm:inline">
                {isArabic ? 'صالح' : 'Valid'}
              </span>
            </div>

            <div className="w-px h-4 bg-border" />

            {/* Used */}
            <div className="flex items-center gap-1.5">
              <span className="icon-wrapper">
                <AlertCircle className={cn(
                  "w-3.5 h-3.5 transition-colors",
                  todayStats.usedScans > 0 ? "text-warning" : "text-muted-foreground/50"
                )} />
              </span>
              <span className={cn(
                "transition-all tabular-nums",
                todayStats.usedScans > 0 ? "font-semibold text-warning" : "text-muted-foreground"
              )}>
                {todayStats.usedScans}
              </span>
              <span className="text-muted-foreground text-xs hidden sm:inline">
                {isArabic ? 'مستخدم' : 'Used'}
              </span>
            </div>

            <div className="w-px h-4 bg-border" />

            {/* Invalid */}
            <div className="flex items-center gap-1.5">
              <span className="icon-wrapper">
                <X className={cn(
                  "w-3.5 h-3.5 transition-colors",
                  todayStats.invalidScans > 0 ? "text-destructive" : "text-muted-foreground/50"
                )} />
              </span>
              <span className={cn(
                "transition-all tabular-nums",
                todayStats.invalidScans > 0 ? "font-semibold text-destructive" : "text-muted-foreground"
              )}>
                {todayStats.invalidScans}
              </span>
              <span className="text-muted-foreground text-xs hidden sm:inline">
                {isArabic ? 'غير صالح' : 'Invalid'}
              </span>
            </div>
          </div>

          {/* Scanner Area */}
          <Card className="glass-card-gold mb-4 md:mb-6 overflow-hidden border-0">
            <CardContent className="p-0">
              <div className="relative w-full aspect-square overflow-hidden">
                {/* QR Reader Container - Always mounted for html5-qrcode */}
                <div 
                  id="qr-reader" 
                  className="absolute inset-0 w-full h-full qr-scanner-container"
                />
                
                {/* Camera Error Overlay */}
                {cameraError && (
                  <div className="absolute inset-0 z-10 bg-destructive/10 flex flex-col items-center justify-center p-6">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-destructive/20 flex items-center justify-center mb-4 md:mb-6">
                      <span className="icon-wrapper">
                        <AlertTriangle className="h-10 w-10 md:h-12 md:w-12 text-destructive" aria-hidden="true" />
                      </span>
                    </div>
                    <p className="text-destructive text-center font-medium max-w-xs text-sm md:text-base mb-4">
                      {cameraError}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCameraError(null);
                        startScanning();
                      }}
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      {isArabic ? 'إعادة المحاولة' : 'Try Again'}
                    </Button>
                  </div>
                )}

                {/* Placeholder Overlay when not scanning */}
                {!isScanning && !cameraError && (
                  <div className="absolute inset-0 z-10 bg-secondary/30 flex flex-col items-center justify-center p-4">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full gradient-gold flex items-center justify-center mb-4 md:mb-6 glow-gold">
                      <span className="icon-wrapper">
                        <Camera className="h-10 w-10 md:h-12 md:w-12 text-foreground" aria-hidden="true" />
                      </span>
                    </div>
                    <p className="text-muted-foreground text-center max-w-xs text-sm md:text-base">
                      {isArabic 
                        ? 'اضغط على الزر أدناه لبدء المسح'
                        : 'Press the button below to start scanning'}
                    </p>
                  </div>
                )}

                {/* Scanning overlay guide */}
                {isScanning && cameraReady && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-4 border-accent rounded-2xl relative">
                      <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-accent rounded-tl-2xl" />
                      <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-accent rounded-tr-2xl" />
                      <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-accent rounded-bl-2xl" />
                      <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-accent rounded-br-2xl" />
                      {/* Scanning animation line */}
                      <div className="absolute inset-x-0 top-0 h-1 bg-accent/50 animate-pulse" 
                        style={{ 
                          animation: 'scan-line 2s ease-in-out infinite',
                        }} 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Scanner Controls */}
              <div className="p-3 md:p-4 bg-card border-t border-border/50">
                <Button
                  size="lg"
                  className={cn(
                    "w-full h-12 md:h-14 text-base md:text-lg gap-2 md:gap-3 rounded-xl transition-all",
                    isScanning 
                      ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
                      : "btn-gold"
                  )}
                  onClick={isScanning ? stopScanning : startScanning}
                >
                  {isScanning ? (
                    <>
                      <span className="icon-wrapper"><XCircle className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" /></span>
                      {isArabic ? 'إيقاف المسح' : 'Stop Scanning'}
                    </>
                  ) : (
                    <>
                      <span className="icon-wrapper"><Camera className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" /></span>
                      {isArabic ? 'بدء المسح' : 'Start Scanning'}
                    </>
                  )}
                </Button>
              </div>
          {/* Manual Lookup Toggle */}
          <div className="p-3 md:p-4 border-t border-border/50">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowManualLookup(!showManualLookup)}
            >
              <Search className="h-4 w-4" />
              {isArabic ? 'بحث يدوي' : 'Manual Lookup'}
            </Button>
            
            {showManualLookup && (
              <div className="mt-3 space-y-3">
                <div className="flex gap-2">
                  <Input
                    ref={searchInputRef}
                    placeholder={isArabic ? 'رقم الحجز أو كود التذكرة...' : 'Booking ref or ticket code...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                    className="flex-1"
                  />
                  <Button onClick={handleManualLookup} disabled={isSearching}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((result, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'p-3 rounded-lg border flex items-center justify-between',
                          result.status === 'valid' && 'bg-success/5 border-success/20',
                          result.status === 'used' && 'bg-warning/5 border-warning/20',
                          !['valid', 'used'].includes(result.status) && 'bg-destructive/5 border-destructive/20'
                        )}
                      >
                        <div>
                          <p className="font-mono text-sm">{result.ticket?.ticketCode}</p>
                          <p className="text-xs text-muted-foreground">{result.ticket?.customerName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{result.ticket?.ticketType}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={result.isValid ? 'default' : 'outline'}
                          onClick={() => handleProcessTicket(result)}
                          disabled={!result.isValid}
                          className={result.isValid ? 'btn-gold' : ''}
                        >
                          {result.isValid ? (isArabic ? 'تأكيد' : 'Validate') : getStatusText(result.status)}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
            </CardContent>
          </Card>

          {/* Recent Scans */}
          <Card className="glass-card-gold border-0">
            <CardHeader className="pb-3 border-b border-border/50 p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 md:gap-3 text-base md:text-lg">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl gradient-gold flex items-center justify-center flex-shrink-0">
                  <span className="icon-wrapper">
                    <History className="h-4 w-4 md:h-5 md:w-5 text-foreground" aria-hidden="true" />
                  </span>
                </div>
                <span>{isArabic ? 'آخر عمليات المسح' : 'Recent Scans'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-4 md:p-6">
              {recentScans.length === 0 ? (
                <div className="text-center py-6 md:py-8 text-muted-foreground">
                  <span className="icon-wrapper">
                    <History className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 opacity-30" aria-hidden="true" />
                  </span>
                  <p className="text-sm md:text-base">{isArabic ? 'لا توجد عمليات مسح بعد' : 'No scans yet'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentScans.map((scan, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01]',
                        scan.status === 'valid' && 'bg-success/5 border-success/20',
                        scan.status === 'used' && 'bg-warning/5 border-warning/20',
                        !['valid', 'used'].includes(scan.status) && 'bg-destructive/5 border-destructive/20'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          scan.status === 'valid' && 'bg-success/10',
                          scan.status === 'used' && 'bg-warning/10',
                          !['valid', 'used'].includes(scan.status) && 'bg-destructive/10'
                        )}>
                          {scan.status === 'valid' && <CheckCircle className="h-5 w-5 text-success" />}
                          {scan.status === 'used' && <AlertTriangle className="h-5 w-5 text-warning" />}
                          {!['valid', 'used'].includes(scan.status) && <XCircle className="h-5 w-5 text-destructive" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm font-mono">
                            {scan.ticketCode || (isArabic ? 'غير معروف' : 'Unknown')}
                          </p>
                          {scan.customerName && (
                            <p className="text-xs text-muted-foreground">{scan.customerName}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-xs font-medium",
                          scan.status === 'valid' && 'text-success',
                          scan.status === 'used' && 'text-warning',
                          !['valid', 'used'].includes(scan.status) && 'text-destructive'
                        )}>
                          {getStatusText(scan.status)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {scan.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      <style>{`
        @keyframes scan-line {
          0%, 100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          50% {
            transform: translateY(250px);
            opacity: 1;
          }
        }
        
        .qr-scanner-container video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
        
        .qr-scanner-container #qr-shaded-region {
          border-color: transparent !important;
        }
      `}</style>
    </div>
  );
};

export default ScannerPage;
