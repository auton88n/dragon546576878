import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { QrCode, Camera, CheckCircle, XCircle, AlertTriangle, History, Volume2, VolumeX, Search, Loader2, Wifi, WifiOff, RefreshCw, Check, AlertCircle, X, Keyboard } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuthStore } from '@/stores/authStore';
import { validateTicket, markTicketAsUsed, logScanAttempt, lookupTicket, isEmployeeQR, validateEmployeeQR, logEmployeeScan, type TicketValidationResult, type EmployeeValidationResult } from '@/lib/ticketService';
import { useOfflineScanQueue } from '@/hooks/useOfflineScanQueue';
import StaffHeader from '@/components/shared/StaffHeader';
import PoweredByAYN from '@/components/shared/PoweredByAYN';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ScanResult {
  timestamp: Date;
  status: TicketValidationResult['status'] | 'employee_valid' | 'employee_inactive';
  ticketCode?: string;
  customerName?: string;
  ticketType?: string;
  isEmployee?: boolean;
  employeeName?: string;
  employeeDepartment?: string;
}

import { safeLocalStorage } from '@/lib/safeStorage';

// Constants for stability
const RESULT_DISPLAY_TIMEOUT = 2000;
const DUPLICATE_SCAN_THRESHOLD = 5000;
const SCANNER_RESTART_THRESHOLD = 500;
const STATS_STORAGE_KEY = 'scanner_daily_stats';
const RECENT_SCANS_STORAGE_KEY = 'scanner_recent_scans';

const getTodayKey = () => new Date().toISOString().split('T')[0];

const loadStoredStats = () => {
  try {
    const stored = safeLocalStorage.getItem(STATS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.date === getTodayKey()) {
        return parsed.stats;
      }
    }
  } catch (e) {
    console.error('Failed to load stored stats:', e);
  }
  return { totalScans: 0, validScans: 0, invalidScans: 0, usedScans: 0 };
};

const loadStoredRecentScans = (): ScanResult[] => {
  try {
    const stored = safeLocalStorage.getItem(RECENT_SCANS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
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
  const [currentResult, setCurrentResult] = useState<TicketValidationResult | EmployeeValidationResult | null>(null);
  const [isEmployeeResult, setIsEmployeeResult] = useState(false);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [recentScans, setRecentScans] = useState<ScanResult[]>(loadStoredRecentScans);
  const [todayStats, setTodayStats] = useState(loadStoredStats);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TicketValidationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showManualLookup, setShowManualLookup] = useState(false);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [enteredCode, setEnteredCode] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const codeEntryInputRef = useRef<HTMLInputElement | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const scanCountSinceRestartRef = useRef<number>(0);

  useEffect(() => {
    safeLocalStorage.setItem(STATS_STORAGE_KEY, JSON.stringify({
      date: getTodayKey(),
      stats: todayStats
    }));
  }, [todayStats]);

  useEffect(() => {
    safeLocalStorage.setItem(RECENT_SCANS_STORAGE_KEY, JSON.stringify({
      date: getTodayKey(),
      scans: recentScans
    }));
  }, [recentScans]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowManualLookup(prev => !prev);
        setTimeout(() => {
          if (!showManualLookup) {
            searchInputRef.current?.focus();
          }
        }, 100);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        setShowCodeEntry(true);
        setTimeout(() => codeEntryInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        if (showCodeEntry) {
          setShowCodeEntry(false);
          setEnteredCode('');
        }
        if (showManualLookup) {
          setShowManualLookup(false);
          setSearchQuery('');
          setSearchResults([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showManualLookup, showCodeEntry]);

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playReadyBeep = useCallback(async () => {
    try {
      const ctx = await initAudioContext();
      if (ctx.state === 'running') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      console.log('Audio init failed:', e);
    }
  }, [initAudioContext]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const triggerHaptic = useCallback((type: 'success' | 'error' | 'warning') => {
    if (!('vibrate' in navigator)) return;
    try {
      switch (type) {
        case 'success': navigator.vibrate(100); break;
        case 'warning': navigator.vibrate([100, 50, 100]); break;
        case 'error': navigator.vibrate(300); break;
      }
    } catch (e) {}
  }, []);

  const playSound = useCallback(async (type: 'success' | 'error' | 'warning') => {
    if (!soundEnabled) return;
    try {
      const ctx = await initAudioContext();
      if (ctx.state !== 'running') {
        await ctx.resume();
      }
      if (type === 'success') {
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

  const playFeedback = useCallback((type: 'success' | 'error' | 'warning') => {
    playSound(type);
    triggerHaptic(type);
  }, [playSound, triggerHaptic]);

  const dismissResult = useCallback(() => {
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
    }
    setShowResultOverlay(false);
    setCurrentResult(null);
    setIsEmployeeResult(false);
    if (scannerRef.current) {
      try { scannerRef.current.resume(); } catch (e) {}
    }
  }, []);

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

    handleManualLookup();

    resultTimeoutRef.current = setTimeout(() => {
      setShowResultOverlay(false);
      setCurrentResult(null);
    }, RESULT_DISPLAY_TIMEOUT);
  }, [playFeedback, user, handleManualLookup]);

  const handleDirectCodeValidation = useCallback(async () => {
    if (!enteredCode.trim()) return;
    setIsValidatingCode(true);
    
    try {
      const results = await lookupTicket(enteredCode.trim());
      const exactMatch = results.find(r => 
        r.ticket?.ticketCode.toUpperCase() === enteredCode.trim().toUpperCase()
      );
      
      if (exactMatch) {
        await handleProcessTicket(exactMatch);
        setShowCodeEntry(false);
        setEnteredCode('');
      } else {
        toast.error(isArabic ? 'الرمز غير موجود - تحقق من الكتابة' : 'Code not found - check for typos');
        setEnteredCode('');
        codeEntryInputRef.current?.focus();
      }
    } catch (err) {
      console.error('Code validation error:', err);
      toast.error(isArabic ? 'خطأ في التحقق' : 'Validation error');
    } finally {
      setIsValidatingCode(false);
    }
  }, [enteredCode, isArabic, handleProcessTicket]);

  const handleManualSync = useCallback(async () => {
    if (!isOnline || queueLength === 0 || isSyncing) return;
    const syncedCount = await syncQueue();
    if (syncedCount && syncedCount > 0) {
      toast.success(isArabic ? `تمت مزامنة ${syncedCount} عمليات بنجاح` : `Synced ${syncedCount} scans successfully`);
    }
  }, [isOnline, queueLength, isSyncing, syncQueue, isArabic]);

  const restartScannerIfNeeded = useCallback(async () => {
    if (scanCountSinceRestartRef.current >= SCANNER_RESTART_THRESHOLD) {
      console.log('Auto-restarting scanner for memory optimization...');
      scanCountSinceRestartRef.current = 0;
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          await new Promise(resolve => setTimeout(resolve, 100));
          await startScanning();
        } catch (e) {
          console.error('Error during scanner restart:', e);
        }
      }
    }
  }, []);

  const onScanSuccess = useCallback(async (decodedText: string) => {
    const now = Date.now();
    if (lastScannedCodeRef.current === decodedText && now - lastScanTimeRef.current < DUPLICATE_SCAN_THRESHOLD) {
      return;
    }
    lastScannedCodeRef.current = decodedText;
    lastScanTimeRef.current = now;
    scanCountSinceRestartRef.current++;

    if (scannerRef.current) {
      try { await scannerRef.current.pause(); } catch (e) {}
    }

    // Check if this is an employee badge
    if (isEmployeeQR(decodedText)) {
      const empResult = await validateEmployeeQR(decodedText);
      setCurrentResult(empResult);
      setIsEmployeeResult(true);
      setShowResultOverlay(true);

      if (empResult.isValid) {
        playFeedback('success');
        // Log for attendance (optional) - no "mark as used" for employees
        if (empResult.employee && isOnline) {
          await logEmployeeScan(empResult.employee.id, user?.id, 'main_entrance');
        }
      } else {
        playFeedback('error');
      }

      // Add to recent scans with employee flag
      setRecentScans(prev => [{
        timestamp: new Date(),
        status: empResult.isValid ? 'employee_valid' : 'employee_inactive',
        isEmployee: true,
        employeeName: empResult.employee?.name,
        employeeDepartment: empResult.employee?.department,
      }, ...prev.slice(0, 9)]);

      // Stats: employees don't affect ticket counts
      setTodayStats(prev => ({
        ...prev,
        totalScans: prev.totalScans + 1,
      }));

      resultTimeoutRef.current = setTimeout(async () => {
        setShowResultOverlay(false);
        setCurrentResult(null);
        setIsEmployeeResult(false);
        if (scannerRef.current) {
          try { await scannerRef.current.resume(); } catch (e) {}
        }
        await restartScannerIfNeeded();
      }, RESULT_DISPLAY_TIMEOUT);
      return;
    }

    // Standard ticket validation
    const result = await validateTicket(decodedText);
    setCurrentResult(result);
    setIsEmployeeResult(false);
    setShowResultOverlay(true);

    if (result.isValid) {
      playFeedback('success');
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

    setTodayStats(prev => ({
      totalScans: prev.totalScans + 1,
      validScans: result.isValid ? prev.validScans + 1 : prev.validScans,
      invalidScans: result.status === 'invalid' || result.status === 'not_found' ? prev.invalidScans + 1 : prev.invalidScans,
      usedScans: result.status === 'used' ? prev.usedScans + 1 : prev.usedScans,
    }));

    setRecentScans(prev => [{
      timestamp: new Date(),
      status: result.status,
      ticketCode: result.ticket?.ticketCode,
      customerName: result.ticket?.customerName,
      ticketType: result.ticket?.ticketType,
    }, ...prev.slice(0, 9)]);

    resultTimeoutRef.current = setTimeout(async () => {
      setShowResultOverlay(false);
      setCurrentResult(null);
      setIsEmployeeResult(false);
      if (scannerRef.current) {
        try { await scannerRef.current.resume(); } catch (e) {}
      }
      await restartScannerIfNeeded();
    }, RESULT_DISPLAY_TIMEOUT);
  }, [playFeedback, user, isOnline, addToQueue, restartScannerIfNeeded]);

  const startScanning = async () => {
    setCameraError(null);
    setIsScanning(true);
    
    // Play ready beep to unlock audio on user interaction
    if (soundEnabled) {
      await playReadyBeep();
    }
    
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }

      // Optimized for faster screen-to-screen scanning
      const qrConfig = { fps: 15, qrbox: { width: 300, height: 300 }, aspectRatio: 1 };
      let cameraId: string | { facingMode: string } = { facingMode: 'environment' };
      
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const backCamera = cameras.find(cam => 
            cam.label.toLowerCase().includes('back') ||
            cam.label.toLowerCase().includes('rear') ||
            cam.label.toLowerCase().includes('environment')
          );
          cameraId = backCamera ? backCamera.id : cameras[cameras.length - 1].id;
        }
      } catch (camErr) {
        console.log('Could not enumerate cameras:', camErr);
      }

      await scannerRef.current.start(cameraId, qrConfig, onScanSuccess, () => {});
      setCameraReady(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setCameraReady(false);
      setIsScanning(false);
      
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        setCameraError(isArabic ? 'يرجى السماح بالوصول للكاميرا في إعدادات المتصفح' : 'Please allow camera access in your browser settings');
      } else if (err.name === 'NotFoundError') {
        setCameraError(isArabic ? 'لم يتم العثور على كاميرا' : 'No camera found on this device');
      } else {
        setCameraError(isArabic ? 'حدث خطأ في الكاميرا. يرجى المحاولة مرة أخرى' : 'Camera error. Please try again');
      }
    }
  };

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

  useEffect(() => {
    return () => {
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
            scannerRef.current.stop();
          }
        } catch (e) {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const getStatusColor = (status: string, isEmployee = false) => {
    if (isEmployee) {
      return status === 'valid' ? 'bg-violet-600' : 'bg-destructive';
    }
    switch (status) {
      case 'valid': return 'bg-success';
      case 'used': return 'bg-warning';
      default: return 'bg-destructive';
    }
  };

  const getStatusIcon = (status: string, isEmployee = false) => {
    if (isEmployee && status === 'valid') {
      return <CheckCircle className="h-24 w-24" />;
    }
    switch (status) {
      case 'valid': return <CheckCircle className="h-24 w-24" />;
      case 'used': return <AlertTriangle className="h-24 w-24" />;
      default: return <XCircle className="h-24 w-24" />;
    }
  };

  const getStatusText = (status: string, isEmployee = false) => {
    if (isEmployee) {
      const empTexts: Record<string, { ar: string; en: string }> = {
        valid: { ar: 'موظف معتمد', en: 'Employee Verified' },
        inactive: { ar: 'بطاقة معطلة', en: 'Badge Deactivated' },
        not_found: { ar: 'موظف غير موجود', en: 'Employee Not Found' },
      };
      return isArabic ? empTexts[status]?.ar : empTexts[status]?.en;
    }
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

  const getDepartmentLabel = (dept: string) => {
    const depts: Record<string, { ar: string; en: string }> = {
      security: { ar: 'الأمن', en: 'Security' },
      cleaning: { ar: 'النظافة', en: 'Cleaning' },
      guide: { ar: 'الإرشاد', en: 'Guide' },
      cafe: { ar: 'المقهى', en: 'Café' },
      shop: { ar: 'المتجر', en: 'Shop' },
      maintenance: { ar: 'الصيانة', en: 'Maintenance' },
      general: { ar: 'عام', en: 'General' },
      other: { ar: 'أخرى', en: 'Other' },
    };
    return depts[dept] ? (isArabic ? depts[dept].ar : depts[dept].en) : dept;
  };

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <StaffHeader 
        title="Ticket Scanner" 
        titleAr="ماسح التذاكر" 
        isOnline={isOnline}
        isSyncing={isSyncing}
        queueCount={queueLength}
      />

      {/* Result Overlay */}
      {showResultOverlay && currentResult && (
        <div 
          className={cn('fixed inset-0 z-50 flex flex-col items-center justify-center text-white p-8 animate-fade-in cursor-pointer', getStatusColor(currentResult.status, isEmployeeResult))}
          onClick={dismissResult}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && dismissResult()}
        >
          <div className="scale-150 mb-2">
            {getStatusIcon(currentResult.status, isEmployeeResult)}
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mt-6 mb-3 text-center leading-tight">{getStatusText(currentResult.status, isEmployeeResult)}</h2>
          <p className="text-2xl md:text-3xl opacity-95 mb-6 font-medium text-center">{currentResult.message}</p>
          
          {/* Employee badge info */}
          {isEmployeeResult && 'employee' in currentResult && currentResult.employee && (
            <div className="bg-white/30 backdrop-blur-md rounded-3xl p-8 text-center border-2 border-white/40 min-w-[300px] shadow-2xl">
              <p className="text-3xl md:text-4xl font-bold mb-3">{currentResult.employee.name}</p>
              <p className="text-xl md:text-2xl opacity-90 px-6 py-2 bg-white/25 rounded-full inline-block font-semibold">
                {getDepartmentLabel(currentResult.employee.department)}
              </p>
              <p className="text-sm mt-4 opacity-75">{isArabic ? '✓ يمكنه الدخول' : '✓ Entry allowed'}</p>
            </div>
          )}
          
          {/* Ticket info */}
          {!isEmployeeResult && 'ticket' in currentResult && currentResult.ticket && (
            <div className="bg-white/30 backdrop-blur-md rounded-3xl p-8 text-center border-2 border-white/40 min-w-[300px] shadow-2xl">
              <p className="text-2xl md:text-3xl font-bold mb-3">{currentResult.ticket.customerName}</p>
              <p className="text-xl md:text-2xl opacity-90 font-mono tracking-wider mb-4">{currentResult.ticket.ticketCode}</p>
              <p className="text-lg md:text-xl opacity-90 capitalize px-6 py-2 bg-white/25 rounded-full inline-block font-semibold">
                {currentResult.ticket.ticketType}
              </p>
            </div>
          )}
          <p className="mt-8 opacity-75 text-lg md:text-xl font-medium">{isArabic ? 'اضغط للمتابعة أو انتظر...' : 'Tap to continue or wait...'}</p>
        </div>
      )}

      {/* Direct Code Entry Dialog */}
      {showCodeEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => { setShowCodeEntry(false); setEnteredCode(''); }}>
          <div 
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 pt-12 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - Logical positioning for RTL */}
            <button
              onClick={() => { setShowCodeEntry(false); setEnteredCode(''); }}
              className="absolute end-5 top-5 p-2 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground/70 hover:text-foreground transition-all"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Centered Header - Works in both LTR & RTL */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-xl gradient-gold flex items-center justify-center mb-3">
                <Keyboard className="h-7 w-7 text-foreground" />
              </div>
              <h3 className="text-xl font-bold">
                {isArabic ? 'إدخال رمز التذكرة' : 'Enter Ticket Code'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isArabic ? 'أدخل الرمز المطبوع أسفل QR' : 'Type the code printed below QR'}
              </p>
            </div>
            
            <Input
              ref={codeEntryInputRef}
              placeholder={isArabic ? 'مثال: A1ABC2XY3Z1' : 'e.g., A1ABC2XY3Z1'}
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleDirectCodeValidation()}
              className="text-center text-xl font-mono tracking-widest h-14 mb-4"
              dir="ltr"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
            />
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => { setShowCodeEntry(false); setEnteredCode(''); }}
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button 
                className="flex-1 btn-gold gap-2" 
                onClick={handleDirectCodeValidation}
                disabled={!enteredCode.trim() || isValidatingCode}
              >
                {isValidatingCode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {isArabic ? 'تحقق' : 'Validate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 pt-20 pb-4 px-4">
        <div className="container max-w-4xl px-0">
          {/* Status & Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant={isOnline ? "outline" : "destructive"} className={cn("gap-1.5 px-2 py-1 text-xs", isOnline ? "border-success/50 text-success bg-success/10" : "")}>
                {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                <span className="hidden sm:inline">{isSyncing ? (isArabic ? 'مزامنة...' : 'Syncing...') : isOnline ? (isArabic ? 'متصل' : 'Online') : (isArabic ? 'غير متصل' : 'Offline')}</span>
              </Badge>
              {queueLength > 0 && (
                <Button variant="outline" size="sm" onClick={handleManualSync} disabled={!isOnline || isSyncing} className="gap-1.5 h-8 px-2 border-warning/50 text-warning hover:bg-warning/10">
                  <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
                  <span className="text-xs">{isArabic ? `(${queueLength})` : `(${queueLength})`}</span>
                </Button>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="border-accent/30 hover:bg-accent/5 h-10 w-10 rounded-xl">
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>

          {/* Stats Grid - 4 clear mini cards */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {/* Total Scans */}
            <div className="bg-card border border-border/50 rounded-xl p-2.5 text-center">
              <p className="text-xl font-bold tabular-nums">{todayStats.totalScans}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isArabic ? 'إجمالي' : 'Total'}
              </p>
            </div>
            
            {/* Valid Scans */}
            <div className="bg-success/10 border border-success/30 rounded-xl p-2.5 text-center">
              <p className="text-xl font-bold tabular-nums text-success">{todayStats.validScans}</p>
              <p className="text-[10px] text-success/80 mt-0.5 flex items-center justify-center gap-0.5">
                <Check className="h-2.5 w-2.5" />
                {isArabic ? 'صالح' : 'Valid'}
              </p>
            </div>
            
            {/* Used/Already Scanned */}
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-2.5 text-center">
              <p className="text-xl font-bold tabular-nums text-warning">{todayStats.usedScans}</p>
              <p className="text-[10px] text-warning/80 mt-0.5 flex items-center justify-center gap-0.5">
                <AlertCircle className="h-2.5 w-2.5" />
                {isArabic ? 'مستخدم' : 'Used'}
              </p>
            </div>
            
            {/* Invalid */}
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-2.5 text-center">
              <p className="text-xl font-bold tabular-nums text-destructive">{todayStats.invalidScans}</p>
              <p className="text-[10px] text-destructive/80 mt-0.5 flex items-center justify-center gap-0.5">
                <X className="h-2.5 w-2.5" />
                {isArabic ? 'مرفوض' : 'Invalid'}
              </p>
            </div>
          </div>

          {/* Scanner Area */}
          <Card className="glass-card-gold overflow-hidden border-0 mb-4">
            <CardContent className="p-0">
              <div className="relative w-full overflow-hidden aspect-square">
                <div id="qr-reader" className="absolute inset-0 w-full h-full qr-scanner-container" />
                
                {cameraError && (
                  <div className="absolute inset-0 z-10 bg-destructive/10 flex flex-col items-center justify-center p-6">
                    <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
                      <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                    <p className="text-destructive text-center font-medium max-w-xs text-sm mb-4">{cameraError}</p>
                    <Button variant="outline" onClick={() => { setCameraError(null); startScanning(); }} className="border-destructive/30 text-destructive hover:bg-destructive/10">
                      {isArabic ? 'إعادة المحاولة' : 'Try Again'}
                    </Button>
                  </div>
                )}

                {!isScanning && !cameraError && (
                  <div className="absolute inset-0 z-10 bg-secondary/30 flex flex-col items-center justify-center p-4">
                    <div className="w-20 h-20 rounded-full gradient-gold flex items-center justify-center mb-4 glow-gold">
                      <Camera className="h-10 w-10 text-foreground" />
                    </div>
                    <p className="text-muted-foreground text-center max-w-xs text-sm">
                      {isArabic ? 'اضغط على الزر أدناه لبدء المسح' : 'Press the button below to start scanning'}
                    </p>
                  </div>
                )}

                {isScanning && cameraReady && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-4 border-accent rounded-2xl relative">
                      <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-accent rounded-tl-2xl" />
                      <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-accent rounded-tr-2xl" />
                      <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-accent rounded-bl-2xl" />
                      <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-accent rounded-br-2xl" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-card border-t border-border/50">
                <Button size="lg" className={cn("w-full h-12 text-base gap-2 rounded-xl", isScanning ? "bg-destructive hover:bg-destructive/90" : "btn-gold")} onClick={isScanning ? stopScanning : startScanning}>
                  {isScanning ? <><XCircle className="h-5 w-5" /> {isArabic ? 'إيقاف المسح' : 'Stop Scanning'}</> : <><Camera className="h-5 w-5" /> {isArabic ? 'بدء المسح' : 'Start Scanning'}</>}
                </Button>
              </div>

              <div className="p-3 border-t border-border/50 space-y-2">
                <Button 
                  variant="secondary" 
                  className="w-full gap-2 bg-accent/10 hover:bg-accent/20 border border-accent/30" 
                  onClick={() => {
                    setShowCodeEntry(true);
                    setTimeout(() => codeEntryInputRef.current?.focus(), 100);
                  }}
                >
                  <Keyboard className="h-4 w-4" />
                  {isArabic ? 'إدخال الرمز' : 'Enter Code'}
                  <span className="text-xs opacity-60 hidden sm:inline">(Ctrl+E)</span>
                </Button>
                <Button variant="outline" className="w-full gap-2" onClick={() => setShowManualLookup(!showManualLookup)}>
                  <Search className="h-4 w-4" />
                  {isArabic ? 'بحث يدوي' : 'Manual Lookup'}
                </Button>
                
                {showManualLookup && (
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-2">
                      <Input ref={searchInputRef} placeholder={isArabic ? 'رقم الحجز أو كود التذكرة...' : 'Booking ref or ticket code...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()} className="flex-1" />
                      <Button onClick={handleManualLookup} disabled={isSearching}>
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    {searchResults.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {searchResults.map((result, idx) => (
                          <div key={idx} className={cn('p-3 rounded-lg border flex items-center justify-between', result.status === 'valid' && 'bg-success/5 border-success/20', result.status === 'used' && 'bg-warning/5 border-warning/20', !['valid', 'used'].includes(result.status) && 'bg-destructive/5 border-destructive/20')}>
                            <div>
                              <p className="font-mono text-sm">{result.ticket?.ticketCode}</p>
                              <p className="text-xs text-muted-foreground">{result.ticket?.customerName}</p>
                            </div>
                            <Button size="sm" variant={result.isValid ? 'default' : 'outline'} onClick={() => handleProcessTicket(result)} disabled={!result.isValid} className={result.isValid ? 'btn-gold' : ''}>
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
            <CardHeader className="pb-3 border-b border-border/50 p-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-xl gradient-gold flex items-center justify-center">
                  <History className="h-4 w-4 text-foreground" />
                </div>
                <span>{isArabic ? 'آخر عمليات المسح' : 'Recent Scans'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-4">
              {recentScans.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{isArabic ? 'لا توجد عمليات مسح بعد' : 'No scans yet'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentScans.map((scan, index) => (
                    <div key={index} className={cn(
                      'flex items-center justify-between p-3 rounded-xl border',
                      scan.isEmployee && scan.status === 'employee_valid' && 'bg-violet-500/5 border-violet-500/20',
                      scan.isEmployee && scan.status === 'employee_inactive' && 'bg-destructive/5 border-destructive/20',
                      !scan.isEmployee && scan.status === 'valid' && 'bg-success/5 border-success/20',
                      !scan.isEmployee && scan.status === 'used' && 'bg-warning/5 border-warning/20',
                      !scan.isEmployee && !['valid', 'used'].includes(scan.status) && 'bg-destructive/5 border-destructive/20'
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center",
                          scan.isEmployee && scan.status === 'employee_valid' && 'bg-violet-500/10',
                          scan.isEmployee && scan.status === 'employee_inactive' && 'bg-destructive/10',
                          !scan.isEmployee && scan.status === 'valid' && 'bg-success/10',
                          !scan.isEmployee && scan.status === 'used' && 'bg-warning/10',
                          !scan.isEmployee && !['valid', 'used'].includes(scan.status) && 'bg-destructive/10'
                        )}>
                          {scan.isEmployee && scan.status === 'employee_valid' && <CheckCircle className="h-4 w-4 text-violet-500" />}
                          {scan.isEmployee && scan.status === 'employee_inactive' && <XCircle className="h-4 w-4 text-destructive" />}
                          {!scan.isEmployee && scan.status === 'valid' && <CheckCircle className="h-4 w-4 text-success" />}
                          {!scan.isEmployee && scan.status === 'used' && <AlertTriangle className="h-4 w-4 text-warning" />}
                          {!scan.isEmployee && !['valid', 'used'].includes(scan.status) && <XCircle className="h-4 w-4 text-destructive" />}
                        </div>
                        <div>
                          {scan.isEmployee ? (
                            <>
                              <p className="font-medium text-xs">{scan.employeeName || (isArabic ? 'موظف' : 'Employee')}</p>
                              <p className="text-xs text-muted-foreground">{getDepartmentLabel(scan.employeeDepartment || 'general')}</p>
                            </>
                          ) : (
                            <>
                              <p className="font-medium text-xs font-mono">{scan.ticketCode || (isArabic ? 'غير معروف' : 'Unknown')}</p>
                              {scan.customerName && <p className="text-xs text-muted-foreground">{scan.customerName}</p>}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right rtl:text-left">
                        <p className={cn(
                          "text-xs font-medium",
                          scan.isEmployee && scan.status === 'employee_valid' && 'text-violet-500',
                          scan.isEmployee && scan.status === 'employee_inactive' && 'text-destructive',
                          !scan.isEmployee && scan.status === 'valid' && 'text-success',
                          !scan.isEmployee && scan.status === 'used' && 'text-warning',
                          !scan.isEmployee && !['valid', 'used'].includes(scan.status) && 'text-destructive'
                        )}>{getStatusText(scan.status)}</p>
                        <p className="text-xs text-muted-foreground">{scan.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Powered by AYN Footer */}
      <PoweredByAYN className="border-t border-border" />

      <style>{`
        @keyframes scan-line {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(250px); opacity: 1; }
        }
        .qr-scanner-container video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
        .qr-scanner-container #qr-shaded-region { border-color: transparent !important; }
      `}</style>
    </div>
  );
};

export default ScannerPage;
