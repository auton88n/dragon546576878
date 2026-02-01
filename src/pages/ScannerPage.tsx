import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { QrCode, Camera, CheckCircle, XCircle, AlertTriangle, History, Volume2, VolumeX, Search, Loader2, Wifi, WifiOff, RefreshCw, Check, AlertCircle, X, Keyboard, Phone, Users, Baby, User, CreditCard, Mail, Clock, Ticket, Briefcase, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuthStore } from '@/stores/authStore';
import { validateTicket, markTicketAsUsed, logScanAttempt, lookupTicket, detectQRKind, validateEmployeeQR, logEmployeeScan, validateGroupTicket, markBookingAsArrived, type TicketValidationResult, type EmployeeValidationResult, type GroupTicketValidationResult } from '@/lib/ticketService';
import { useOfflineScanQueue } from '@/hooks/useOfflineScanQueue';
import StaffHeader from '@/components/shared/StaffHeader';
import PoweredByAYN from '@/components/shared/PoweredByAYN';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ScanResult {
  timestamp: Date;
  status: TicketValidationResult['status'] | 'employee_valid' | 'employee_inactive' | 'arrived' | 'not_paid';
  ticketCode?: string;
  customerName?: string;
  ticketType?: string;
  isEmployee?: boolean;
  employeeName?: string;
  employeeDepartment?: string;
  // Extended fields for detail view
  bookingId?: string;
  customerPhone?: string;
  adultCount?: number;
  childCount?: number;
  seniorCount?: number;
  paymentStatus?: string;
  totalAmount?: number;
  bookingReference?: string;
  visitDate?: string;
  // Email cooldown
  lastEmailSentAt?: string | null;
  // Employee detail lookup
  employeeId?: string;
  // Group ticket fields
  isGroupTicket?: boolean;
  totalGuests?: number;
  arrivalStatus?: string;
}

interface FullBookingDetails {
  id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  visit_date: string;
  visit_time: string;
  adult_count: number;
  child_count: number;
  senior_count: number;
  total_amount: number;
  payment_status: string;
  last_email_sent_at: string | null;
  tickets: {
    id: string;
    ticket_code: string;
    ticket_type: string;
    is_used: boolean;
    scanned_at: string | null;
  }[];
}

import { safeLocalStorage } from '@/lib/safeStorage';

// Constants for stability - optimized for speed
const RESULT_DISPLAY_TIMEOUT = 6000; // Reduced from 10s for faster flow
const DUPLICATE_SCAN_THRESHOLD = 1500; // Reduced from 5s for faster consecutive scans
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

// Load recent scans from localStorage (anonymized - no PII stored)
// Only status, timestamp, and ticket type are persisted
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
  const [selectedScanDetail, setSelectedScanDetail] = useState<ScanResult | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [countdownProgress, setCountdownProgress] = useState(100);
  const [emailCooldownRemaining, setEmailCooldownRemaining] = useState(0);
  const [fullBookingDetails, setFullBookingDetails] = useState<FullBookingDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState<{ full_name: string; email: string; phone: string | null; department: string; is_active: boolean } | null>(null);
  const [employeeScansToday, setEmployeeScansToday] = useState(0);
  const [showEmployeeLookup, setShowEmployeeLookup] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [employeeSearchResults, setEmployeeSearchResults] = useState<any[]>([]);
  const [isSearchingEmployee, setIsSearchingEmployee] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const codeEntryInputRef = useRef<HTMLInputElement | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const scanCountSinceRestartRef = useRef<number>(0);
  const isProcessingScanRef = useRef<boolean>(false);

  useEffect(() => {
    safeLocalStorage.setItem(STATS_STORAGE_KEY, JSON.stringify({
      date: getTodayKey(),
      stats: todayStats
    }));
  }, [todayStats]);

  // Store recent scans in localStorage with anonymized data only (no PII)
  // Only status, timestamp, ticketType, and isEmployee are persisted
  useEffect(() => {
    try {
      const anonymizedScans = recentScans.map(scan => ({
        timestamp: scan.timestamp,
        status: scan.status,
        ticketType: scan.ticketType,
        isEmployee: scan.isEmployee,
        isGroupTicket: scan.isGroupTicket,
        // Explicitly exclude PII: customerName, ticketCode, customerPhone, etc.
      }));
      safeLocalStorage.setItem(RECENT_SCANS_STORAGE_KEY, JSON.stringify({
        date: getTodayKey(),
        scans: anonymizedScans
      }));
    } catch (e) {
      console.error('Failed to save recent scans to localStorage:', e);
    }
  }, [recentScans]);

  // Countdown animation when overlay is shown
  useEffect(() => {
    if (showResultOverlay) {
      setCountdownProgress(100);
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / RESULT_DISPLAY_TIMEOUT) * 100);
        setCountdownProgress(remaining);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [showResultOverlay]);

  // Email cooldown timer
  useEffect(() => {
    const lastSentAt = selectedScanDetail?.lastEmailSentAt || fullBookingDetails?.last_email_sent_at;
    if (lastSentAt) {
      const lastSent = new Date(lastSentAt).getTime();
      const cooldownMs = 5 * 60 * 1000; // 5 minutes
      const remaining = Math.max(0, cooldownMs - (Date.now() - lastSent));
      setEmailCooldownRemaining(Math.ceil(remaining / 1000));
      
      if (remaining > 0) {
        const interval = setInterval(() => {
          setEmailCooldownRemaining(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
      }
    } else {
      setEmailCooldownRemaining(0);
    }
  }, [selectedScanDetail, fullBookingDetails?.last_email_sent_at]);

  // Fetch full booking details when dialog opens
  useEffect(() => {
    if (selectedScanDetail?.bookingId && !selectedScanDetail.isEmployee) {
      setIsLoadingDetails(true);
      supabase
        .from('bookings')
        .select('*, tickets(id, ticket_code, ticket_type, is_used, scanned_at)')
        .eq('id', selectedScanDetail.bookingId)
        .single()
        .then(({ data }) => {
          if (data) {
            setFullBookingDetails(data as unknown as FullBookingDetails);
          }
          setIsLoadingDetails(false);
        });
    } else {
      setFullBookingDetails(null);
    }
  }, [selectedScanDetail?.bookingId, selectedScanDetail?.isEmployee]);

  // Fetch employee details when employee scan is selected
  useEffect(() => {
    if (selectedScanDetail?.isEmployee && selectedScanDetail?.employeeId) {
      supabase.rpc('validate_employee_badge', { 
        employee_id: selectedScanDetail.employeeId 
      }).then(({ data }) => {
        if (data) setEmployeeDetails(data as any);
      });
    } else {
      setEmployeeDetails(null);
    }
  }, [selectedScanDetail?.isEmployee, selectedScanDetail?.employeeId]);

  // Fetch employee scans count for today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const fetchCount = () => {
      supabase
        .from('employee_scans')
        .select('id', { count: 'exact', head: true })
        .gte('scanned_at', today + 'T00:00:00.000Z')
        .then(({ count }) => {
          setEmployeeScansToday(count || 0);
        });
    };
    fetchCount();
    
    const channel = supabase
      .channel('employee-scans-count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'employee_scans' }, fetchCount)
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

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

  const playSound = useCallback(async (type: 'success' | 'error' | 'warning' | 'payment') => {
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
      } else if (type === 'payment') {
        // Cash register "cha-ching" sound - two bright ascending tones
        [1200, 1600, 2000].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.12);
          osc.start(ctx.currentTime + i * 0.08);
          osc.stop(ctx.currentTime + i * 0.08 + 0.12);
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
    // CRITICAL: Release the processing lock so scanner can read again
    isProcessingScanRef.current = false;
    if (scannerRef.current) {
      try { scannerRef.current.resume(); } catch (e) {}
    }
  }, []);

  const handleMarkAsPaid = useCallback(async (bookingId: string) => {
    if (!bookingId || isMarkingPaid) return;
    setIsMarkingPaid(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: 'completed', paid_at: new Date().toISOString() })
        .eq('id', bookingId);
      
      if (error) throw error;
      
      // Play payment confirmation sound
      playSound('payment');
      toast.success(isArabic ? 'تم تحديث الدفع بنجاح' : 'Payment marked as complete');
      
      // Update current result if showing
      if (currentResult && 'ticket' in currentResult && currentResult.ticket) {
        setCurrentResult({
          ...currentResult,
          ticket: { ...currentResult.ticket, paymentStatus: 'completed' }
        });
      }
      
      // Update selected scan detail if open
      if (selectedScanDetail) {
        setSelectedScanDetail({ ...selectedScanDetail, paymentStatus: 'completed' });
      }
      
      // Update recent scans list to reflect payment status
      setRecentScans(prev => prev.map(scan => 
        scan.bookingId === bookingId 
          ? { ...scan, paymentStatus: 'completed' }
          : scan
      ));
      
      // Update full booking details if loaded
      if (fullBookingDetails && fullBookingDetails.id === bookingId) {
        setFullBookingDetails({ ...fullBookingDetails, payment_status: 'completed' });
      }
    } catch (err) {
      console.error('Error marking as paid:', err);
      toast.error(isArabic ? 'فشل تحديث الدفع' : 'Failed to update payment');
    } finally {
      setIsMarkingPaid(false);
    }
  }, [isArabic, currentResult, selectedScanDetail, isMarkingPaid, playSound, fullBookingDetails]);

  const handleResendEmail = useCallback(async (bookingId: string) => {
    if (!bookingId || isResendingEmail || emailCooldownRemaining > 0) return;
    setIsResendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-booking-confirmation', {
        body: { bookingId, force: true }
      });
      
      if (error) throw error;
      toast.success(isArabic ? 'تم إرسال البريد الإلكتروني بنجاح' : 'Email sent successfully');
      
      // Update cooldown
      setEmailCooldownRemaining(5 * 60);
      setSelectedScanDetail(prev => prev ? { ...prev, lastEmailSentAt: new Date().toISOString() } : null);
    } catch (err) {
      console.error('Error resending email:', err);
      toast.error(isArabic ? 'فشل إرسال البريد الإلكتروني' : 'Failed to send email');
    } finally {
      setIsResendingEmail(false);
    }
  }, [isArabic, isResendingEmail, emailCooldownRemaining]);

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
      invalidScans: ['invalid', 'not_found', 'wrong_date', 'expired'].includes(result.status) ? prev.invalidScans + 1 : prev.invalidScans,
      usedScans: result.status === 'used' ? prev.usedScans + 1 : prev.usedScans,
    }));

    setRecentScans(prev => [{
      timestamp: new Date(),
      status: result.status,
      ticketCode: result.ticket?.ticketCode,
      customerName: result.ticket?.customerName,
      ticketType: result.ticket?.ticketType,
      bookingId: result.ticket?.bookingId,
      customerPhone: result.ticket?.customerPhone,
      adultCount: result.ticket?.adultCount,
      childCount: result.ticket?.childCount,
      seniorCount: result.ticket?.seniorCount,
      paymentStatus: result.ticket?.paymentStatus,
      bookingReference: result.ticket?.bookingReference,
      visitDate: result.ticket?.visitDate,
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

  const handleEmployeeLookup = useCallback(async () => {
    if (!employeeSearchQuery.trim()) return;
    setIsSearchingEmployee(true);
    try {
      const { data } = await supabase
        .from('employees')
        .select('id, full_name, email, phone, department, is_active')
        .or(`full_name.ilike.%${employeeSearchQuery}%,email.ilike.%${employeeSearchQuery}%`)
        .limit(10);
      
      setEmployeeSearchResults(data || []);
    } catch (err) {
      console.error('Employee lookup error:', err);
    } finally {
      setIsSearchingEmployee(false);
    }
  }, [employeeSearchQuery]);

  const handleSelectEmployee = useCallback((emp: any) => {
    // Log the manual lookup as an attendance scan
    logEmployeeScan(emp.id, user?.id, 'manual_lookup');
    
    // Add to recent scans
    setRecentScans(prev => [{
      timestamp: new Date(),
      status: emp.is_active ? 'employee_valid' : 'employee_inactive',
      isEmployee: true,
      employeeId: emp.id,
      employeeName: emp.full_name,
      employeeDepartment: emp.department,
    }, ...prev.slice(0, 9)]);
    
    // Open detail dialog
    setSelectedScanDetail({
      timestamp: new Date(),
      status: emp.is_active ? 'employee_valid' : 'employee_inactive',
      isEmployee: true,
      employeeId: emp.id,
      employeeName: emp.full_name,
      employeeDepartment: emp.department,
    });
    
    // Play feedback sound
    if (emp.is_active) playFeedback('success');
    
    toast(emp.is_active 
      ? (isArabic ? 'موظف معتمد' : 'Employee Verified')
      : (isArabic ? 'موظف غير فعال' : 'Inactive Employee'), 
      { duration: 2000 }
    );
    
    // Clear search
    setEmployeeSearchQuery('');
    setEmployeeSearchResults([]);
    setShowEmployeeLookup(false);
  }, [user?.id, playFeedback, isArabic]);

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

  // State for group ticket admission
  const [groupResult, setGroupResult] = useState<GroupTicketValidationResult | null>(null);
  const [isAdmittingGroup, setIsAdmittingGroup] = useState(false);

  const handleAdmitGroup = useCallback(async () => {
    if (!groupResult?.booking || isAdmittingGroup) return;
    setIsAdmittingGroup(true);
    try {
      await markBookingAsArrived(groupResult.booking.id, user?.id);
      playSound('success');
      toast.success(isArabic ? 'تم تسجيل وصول المجموعة' : 'Group admitted successfully');
      
      // Update the result to show as arrived
      setGroupResult(prev => prev ? { ...prev, status: 'arrived', booking: { ...prev.booking!, arrivalStatus: 'arrived' } } : null);
      
      // Add to recent scans
      setRecentScans(prev => [{
        timestamp: new Date(),
        status: 'arrived',
        customerName: groupResult.booking.customerName,
        bookingReference: groupResult.booking.bookingReference,
        adultCount: groupResult.booking.adultCount,
        childCount: groupResult.booking.childCount,
        isGroupTicket: true,
        totalGuests: groupResult.booking.totalGuests,
        arrivalStatus: 'arrived',
        bookingId: groupResult.booking.id,
        paymentStatus: groupResult.booking.paymentStatus,
      }, ...prev.slice(0, 9)]);
      
      // Update stats
      setTodayStats(prev => ({
        ...prev,
        totalScans: prev.totalScans + 1,
        validScans: prev.validScans + 1,
      }));
    } catch (err) {
      console.error('Error admitting group:', err);
      toast.error(isArabic ? 'فشل تسجيل الوصول' : 'Failed to admit group');
    } finally {
      setIsAdmittingGroup(false);
    }
  }, [groupResult, isAdmittingGroup, user?.id, playSound, isArabic]);

  const onScanSuccess = useCallback(async (decodedText: string) => {
    // Single-thread lock to prevent race conditions from rapid callbacks
    if (isProcessingScanRef.current) {
      return;
    }
    isProcessingScanRef.current = true;

    try {
      // Normalize text to handle invisible characters
      const normalizedText = decodedText
        .trim()
        .replace(/\u0000/g, '')
        .replace(/\uFEFF/g, '')
        .replace(/[\u200B-\u200D\u2060]/g, '');

      const now = Date.now();
      if (lastScannedCodeRef.current === normalizedText && now - lastScanTimeRef.current < DUPLICATE_SCAN_THRESHOLD) {
        isProcessingScanRef.current = false;
        return;
      }
      lastScannedCodeRef.current = normalizedText;
      lastScanTimeRef.current = now;
      scanCountSinceRestartRef.current++;

      if (scannerRef.current) {
        try { await scannerRef.current.pause(); } catch (e) {}
      }

      // Detect QR code type using normalized text
      const { kind } = detectQRKind(normalizedText);

      // Check if this is an employee badge
      if (kind === 'employee') {
        const empResult = await validateEmployeeQR(normalizedText);
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

        // Add to recent scans with employee flag and ID for detail lookup
        setRecentScans(prev => [{
          timestamp: new Date(),
          status: empResult.isValid ? 'employee_valid' : 'employee_inactive',
          isEmployee: true,
          employeeName: empResult.employee?.name,
          employeeDepartment: empResult.employee?.department,
          employeeId: empResult.employee?.id,
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
          isProcessingScanRef.current = false;
          if (scannerRef.current) {
            try { await scannerRef.current.resume(); } catch (e) {}
          }
          await restartScannerIfNeeded();
        }, RESULT_DISPLAY_TIMEOUT);
        return;
      }

      // Handle unknown QR codes
      if (kind === 'unknown') {
        setCurrentResult({
          isValid: false,
          status: 'invalid',
          message: isArabic ? 'رمز QR غير معروف' : 'Unrecognized QR code',
        } as TicketValidationResult);
        setIsEmployeeResult(false);
        setGroupResult(null);
        setShowResultOverlay(true);
        playFeedback('error');

        setTodayStats(prev => ({
          ...prev,
          totalScans: prev.totalScans + 1,
          invalidScans: prev.invalidScans + 1,
        }));

        resultTimeoutRef.current = setTimeout(async () => {
          setShowResultOverlay(false);
          setCurrentResult(null);
          isProcessingScanRef.current = false;
          if (scannerRef.current) {
            try { await scannerRef.current.resume(); } catch (e) {}
          }
        }, RESULT_DISPLAY_TIMEOUT);
        return;
      }

      // Check if this is a GROUP ticket (new format)
      if (kind === 'group') {
        const grpResult = await validateGroupTicket(normalizedText);
        setGroupResult(grpResult);
        setCurrentResult(null);
        setIsEmployeeResult(false);
        setShowResultOverlay(true);

        if (grpResult.isValid) {
          playFeedback('success');
        } else if (grpResult.status === 'arrived') {
          playFeedback('warning');
        } else {
          playFeedback('error');
        }

        // Add to recent scans
        if (grpResult.booking) {
          setRecentScans(prev => [{
            timestamp: new Date(),
            status: grpResult.status,
            customerName: grpResult.booking?.customerName,
            bookingReference: grpResult.booking?.bookingReference,
            adultCount: grpResult.booking?.adultCount,
            childCount: grpResult.booking?.childCount,
            isGroupTicket: true,
            totalGuests: grpResult.booking?.totalGuests,
            arrivalStatus: grpResult.booking?.arrivalStatus,
            bookingId: grpResult.booking?.id,
            paymentStatus: grpResult.booking?.paymentStatus,
          }, ...prev.slice(0, 9)]);
        }

        setTodayStats(prev => ({
          ...prev,
          totalScans: prev.totalScans + 1,
          validScans: grpResult.isValid ? prev.validScans + 1 : prev.validScans,
          invalidScans: ['invalid', 'not_found', 'wrong_date', 'expired', 'not_paid'].includes(grpResult.status) ? prev.invalidScans + 1 : prev.invalidScans,
          usedScans: grpResult.status === 'arrived' ? prev.usedScans + 1 : prev.usedScans,
        }));

        // Don't auto-dismiss for group tickets - user needs to tap "Admit"
        return;
      }

      // Standard individual ticket validation (kind === 'ticket' - backward compatibility)
      const result = await validateTicket(normalizedText);
      setCurrentResult(result);
      setIsEmployeeResult(false);
      setGroupResult(null);
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
        invalidScans: ['invalid', 'not_found', 'wrong_date', 'expired'].includes(result.status) ? prev.invalidScans + 1 : prev.invalidScans,
        usedScans: result.status === 'used' ? prev.usedScans + 1 : prev.usedScans,
      }));

      setRecentScans(prev => [{
        timestamp: new Date(),
        status: result.status,
        ticketCode: result.ticket?.ticketCode,
        customerName: result.ticket?.customerName,
        ticketType: result.ticket?.ticketType,
        paymentStatus: result.ticket?.paymentStatus,
        totalAmount: result.ticket?.totalAmount,
        bookingId: result.ticket?.bookingId,
        bookingReference: result.ticket?.bookingReference,
        visitDate: result.ticket?.visitDate,
        customerPhone: result.ticket?.customerPhone,
        adultCount: result.ticket?.adultCount,
        childCount: result.ticket?.childCount,
      }, ...prev.slice(0, 9)]);

      resultTimeoutRef.current = setTimeout(async () => {
        setShowResultOverlay(false);
        setCurrentResult(null);
        setIsEmployeeResult(false);
        isProcessingScanRef.current = false;
        if (scannerRef.current) {
          try { await scannerRef.current.resume(); } catch (e) {}
        }
        await restartScannerIfNeeded();
      }, RESULT_DISPLAY_TIMEOUT);
    } catch (err) {
      // Safety net: if anything throws, release the lock and resume scanning
      console.error('Scan processing error:', err);
      isProcessingScanRef.current = false;
      if (scannerRef.current) {
        try { await scannerRef.current.resume(); } catch (e) {}
      }
    }
  }, [playFeedback, user, isOnline, addToQueue, restartScannerIfNeeded, isArabic]);

  const startScanning = async () => {
    setCameraError(null);
    setIsScanning(true);
    // Reset processing lock to ensure clean start
    isProcessingScanRef.current = false;
    
    // Play ready beep to unlock audio on user interaction
    if (soundEnabled) {
      await playReadyBeep();
    }
    
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }

      // Optimized config - simple and reliable
      const qrConfig = { 
        fps: 30, // Maximum frame rate for fastest detection
        qrbox: { width: 300, height: 300 }, // Fixed size, reliable
        aspectRatio: 1,
        formatsToSupport: [ 0 ], // 0 = QR_CODE only, skip other formats for speed
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true // Use native detector when available (much faster)
        }
      };
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
    // Clear any pending result timeout
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = null;
    }
    // Reset processing lock
    isProcessingScanRef.current = false;
    
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

      {/* Result Overlay - Group Tickets */}
      {showResultOverlay && groupResult && (
        <div 
          className={cn(
            'fixed inset-0 z-50 flex flex-col items-center justify-center text-white p-6 animate-fade-in',
            // VIP gets special gold styling
            groupResult.isVIP && groupResult.status === 'valid' ? 'bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600' :
            groupResult.status === 'valid' ? 'bg-success' :
            groupResult.status === 'arrived' ? 'bg-warning' :
            groupResult.status === 'not_paid' ? 'bg-amber-600' :
            'bg-destructive'
          )}
        >
          {/* VIP Badge */}
          {groupResult.isVIP && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md rounded-full px-6 py-2 border-2 border-white/40 shadow-xl">
              <span className="text-lg font-bold tracking-wider flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <span>VIP GUEST</span>
                <span className="text-2xl">👑</span>
              </span>
            </div>
          )}
          
          {/* Corporate Fast-Track Badge */}
          {groupResult.booking?.isCorporate && !groupResult.isVIP && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 backdrop-blur-md rounded-full px-6 py-2 border-2 border-blue-300/50 shadow-xl">
              <span className="text-lg font-bold tracking-wider flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                <span>{isArabic ? 'مسار الشركات' : 'CORPORATE FAST-TRACK'}</span>
                <Briefcase className="h-5 w-5" />
              </span>
            </div>
          )}
          
          {/* Status Icon */}
          <div className="scale-125 mb-2">
            {groupResult.isVIP && groupResult.status === 'valid' ? (
              <div className="relative">
                <CheckCircle className="h-24 w-24" />
                <span className="absolute -top-2 -right-2 text-4xl">✨</span>
              </div>
            ) : groupResult.status === 'valid' ? <CheckCircle className="h-24 w-24" /> :
             groupResult.status === 'arrived' ? <AlertTriangle className="h-24 w-24" /> :
             <XCircle className="h-24 w-24" />}
          </div>
          
          {/* Status Text */}
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-2 text-center leading-tight">
            {groupResult.isVIP && groupResult.status === 'valid' 
              ? (isArabic ? 'مرحباً بضيفنا الكريم!' : 'Welcome, Honored Guest!')
              : groupResult.status === 'valid' ? (isArabic ? 'حجز صالح' : 'Valid Reservation') :
             groupResult.status === 'arrived' ? (isArabic ? 'وصلوا مسبقاً' : 'Already Arrived') :
             groupResult.status === 'not_paid' ? (isArabic ? 'لم يتم الدفع' : 'Not Paid') :
             groupResult.status === 'wrong_date' ? (isArabic ? 'تاريخ خاطئ' : 'Wrong Date') :
             groupResult.status === 'expired' ? (isArabic ? 'منتهي الصلاحية' : 'Expired') :
             (isArabic ? 'حجز غير صالح' : 'Invalid Reservation')}
          </h2>
          
          {/* Booking Details Card */}
          {groupResult.booking && (
            <div className={cn(
              "backdrop-blur-md rounded-2xl p-5 text-center border-2 w-full max-w-sm shadow-2xl mt-4",
              groupResult.isVIP 
                ? "bg-white/30 border-yellow-200/60" 
                : "bg-white/25 border-white/40"
            )}>
              {/* Customer Name */}
              <p className="text-2xl md:text-3xl font-bold mb-2">{groupResult.booking.customerName}</p>
              
              {/* Booking Reference */}
              <p className="text-lg opacity-90 font-mono mb-3">{groupResult.booking.bookingReference}</p>
              
              {/* Large Guest Count */}
              <div className={cn(
                "rounded-xl py-4 px-6 mb-4",
                groupResult.isVIP ? "bg-white/40" : "bg-white/30"
              )}>
                <div className="text-5xl font-bold mb-2">{groupResult.booking.totalGuests}</div>
                <div className="text-lg opacity-90">{isArabic ? 'إجمالي الزوار' : 'Total Guests'}</div>
                
                {/* Breakdown */}
                <div className="flex items-center justify-center gap-4 mt-3 text-base">
                  {groupResult.booking.adultCount > 0 && (
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {groupResult.booking.adultCount} {isArabic ? 'بالغ' : 'Adult'}
                    </span>
                  )}
                  {groupResult.booking.childCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Baby className="h-4 w-4" />
                      {groupResult.booking.childCount} {isArabic ? 'طفل' : 'Child'}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Payment Warning for unpaid */}
              {groupResult.status === 'not_paid' && groupResult.booking.totalAmount && (
                <div className="flex flex-col items-center gap-3 mb-4">
                  <div className="bg-red-600 text-white rounded-xl px-6 py-2 text-lg font-bold animate-pulse flex items-center gap-2 shadow-lg">
                    <Banknote className="h-5 w-5" />
                    <span>{isArabic ? '⚠️ لم يتم الدفع' : '⚠️ NOT PAID'}</span>
                  </div>
                  <div className="bg-white text-red-600 rounded-xl px-6 py-3 font-bold text-xl shadow-lg border-2 border-red-600">
                    <span className="font-mono">{groupResult.booking.totalAmount} SAR</span>
                  </div>
                </div>
              )}
              
              {/* VIP Complimentary Badge */}
              {groupResult.isVIP && groupResult.status === 'valid' && (
                <div className="bg-gradient-to-r from-yellow-200 to-amber-200 text-amber-800 rounded-xl px-4 py-2 text-sm font-bold mb-3 inline-flex items-center gap-2">
                  <span>🌟</span>
                  <span>{isArabic ? 'دعوة خاصة' : 'Special Invitation'}</span>
                  <span>🌟</span>
                </div>
              )}
              
              {/* Corporate Fast-Track Badge */}
              {groupResult.booking?.isCorporate && !groupResult.isVIP && groupResult.status === 'valid' && (
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl px-4 py-2 text-sm font-bold mb-3 inline-flex items-center gap-2 shadow-lg">
                  <Briefcase className="h-4 w-4" />
                  <span>{groupResult.booking.companyName || (isArabic ? 'عميل شركات' : 'Corporate Client')}</span>
                </div>
              )}
              
              {/* Visit Date */}
              <p className="text-sm opacity-80">
                {isArabic ? 'التاريخ: ' : 'Date: '}
                {new Date(groupResult.booking.visitDate).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              
              {/* Arrived At (for already arrived) */}
              {groupResult.status === 'arrived' && groupResult.booking.arrivedAt && (
                <p className="text-sm opacity-90 mt-2">
                  {isArabic ? 'وصلوا: ' : 'Arrived: '}
                  {new Date(groupResult.booking.arrivedAt).toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-6 w-full max-w-sm">
            {/* Admit Group Button - Only show for valid groups */}
            {groupResult.status === 'valid' && groupResult.booking && (
              <Button
                size="lg"
                className="bg-white text-success hover:bg-white/90 text-xl px-8 py-8 h-auto gap-3 shadow-xl font-bold rounded-xl w-full"
                disabled={isAdmittingGroup}
                onClick={handleAdmitGroup}
              >
                {isAdmittingGroup ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Users className="h-8 w-8" />
                )}
                {isArabic 
                  ? `دخول ${groupResult.booking.totalGuests} زوار` 
                  : `Admit ${groupResult.booking.totalGuests} Guests`}
              </Button>
            )}
            
            {/* Close Button */}
            <Button
              size="lg"
              variant="ghost"
              className="text-white border-2 border-white/40 hover:bg-white/20 text-lg px-8 py-4 h-auto gap-2 rounded-xl"
              onClick={() => {
                setShowResultOverlay(false);
                setGroupResult(null);
                isProcessingScanRef.current = false;
                if (scannerRef.current) {
                  try { scannerRef.current.resume(); } catch (e) {}
                }
              }}
            >
              <X className="h-5 w-5" />
              {isArabic ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        </div>
      )}

      {/* Result Overlay - Individual Tickets (backward compatibility) */}
      {showResultOverlay && currentResult && !groupResult && (
        <div 
          className={cn('fixed inset-0 z-50 flex flex-col items-center justify-center text-white p-6 animate-fade-in cursor-pointer', getStatusColor(currentResult.status, isEmployeeResult))}
          onClick={dismissResult}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && dismissResult()}
        >
          <div className="scale-125 mb-2">
            {getStatusIcon(currentResult.status, isEmployeeResult)}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-2 text-center leading-tight">{getStatusText(currentResult.status, isEmployeeResult)}</h2>
          
          {/* Employee badge info */}
          {isEmployeeResult && 'employee' in currentResult && currentResult.employee && (
            <div className="bg-white/30 backdrop-blur-md rounded-2xl p-6 text-center border-2 border-white/40 min-w-[300px] shadow-2xl mt-4">
              <p className="text-2xl md:text-3xl font-bold mb-2 text-white">{currentResult.employee.name}</p>
              <p className="text-lg md:text-xl text-white px-4 py-1.5 bg-white/25 rounded-full inline-block font-semibold">
                {getDepartmentLabel(currentResult.employee.department)}
              </p>
              <p className="text-sm mt-3 text-white/90">{isArabic ? '✓ يمكنه الدخول' : '✓ Entry allowed'}</p>
            </div>
          )}
          
          {/* Enhanced Ticket info */}
          {!isEmployeeResult && 'ticket' in currentResult && currentResult.ticket && (
            <div className="bg-white/25 backdrop-blur-md rounded-2xl p-5 text-center border-2 border-white/40 w-full max-w-sm shadow-2xl mt-4">
              {/* Customer Name */}
              <p className="text-2xl md:text-3xl font-bold mb-1">{currentResult.ticket.customerName}</p>
              
              {/* Phone */}
              {currentResult.ticket.customerPhone && (
                <p className="text-lg opacity-90 flex items-center justify-center gap-2 mb-3">
                  <Phone className="h-4 w-4" />
                  <span dir="ltr">{currentResult.ticket.customerPhone}</span>
                </p>
              )}
              
              {/* Party Size */}
              <div className="flex items-center justify-center gap-3 flex-wrap mb-3 bg-white/20 rounded-xl py-2 px-3">
                {currentResult.ticket.adultCount > 0 && (
                  <span className="flex items-center gap-1.5 text-base font-medium">
                    <User className="h-4 w-4" />
                    {currentResult.ticket.adultCount} {isArabic ? 'بالغ' : 'Adult'}{currentResult.ticket.adultCount > 1 && !isArabic ? 's' : ''}
                  </span>
                )}
                {currentResult.ticket.childCount > 0 && (
                  <span className="flex items-center gap-1.5 text-base font-medium">
                    <Baby className="h-4 w-4" />
                    {currentResult.ticket.childCount} {isArabic ? 'طفل' : 'Child'}{currentResult.ticket.childCount > 1 && !isArabic ? 'ren' : ''}
                  </span>
                )}
                {currentResult.ticket.seniorCount > 0 && (
                  <span className="flex items-center gap-1.5 text-base font-medium">
                    <Users className="h-4 w-4" />
                    {currentResult.ticket.seniorCount} {isArabic ? 'كبار' : 'Senior'}{currentResult.ticket.seniorCount > 1 && !isArabic ? 's' : ''}
                  </span>
                )}
              </div>
              
              {/* Payment Warning - ENHANCED with Large Pulsing Alert */}
              {currentResult.ticket.paymentStatus !== 'completed' && (
                <div className="flex flex-col items-center gap-3 mb-4">
                  {/* Warning Label - Red with pulse */}
                  <div className="bg-red-600 text-white rounded-xl px-6 py-2 text-lg font-bold animate-pulse flex items-center gap-2 shadow-lg">
                    <Banknote className="h-5 w-5" />
                    <span>{isArabic ? '⚠️ لم يتم الدفع' : '⚠️ NOT PAID'}</span>
                  </div>
                  
                  {/* Amount Due - Separate high-contrast card */}
                  <div className="bg-white text-red-600 rounded-xl px-6 py-3 font-bold text-xl shadow-lg border-2 border-red-600 flex items-center gap-2">
                    <span className="font-mono">{currentResult.ticket.totalAmount || 0} SAR</span>
                    <span className="text-sm opacity-75">{isArabic ? 'المستحق' : 'Due'}</span>
                  </div>
                  
                  {/* Large Mark as Paid Button */}
                  <Button
                    size="lg"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-lg px-8 py-6 h-auto gap-3 shadow-xl border-2 border-white/40 font-bold rounded-xl"
                    disabled={isMarkingPaid}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsPaid(currentResult.ticket!.bookingId);
                    }}
                  >
                    {isMarkingPaid ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <CheckCircle className="h-6 w-6" />
                    )}
                    {isArabic ? '✓ تم استلام الدفع' : '✓ Payment Received'}
                  </Button>
                </div>
              )}
              
              {/* Used At (for already-used tickets) */}
              {currentResult.status === 'used' && currentResult.ticket.usedAt && (
                <p className="text-sm opacity-90 mb-3">
                  {isArabic ? 'تم المسح: ' : 'Scanned: '}
                  {new Date(currentResult.ticket.usedAt).toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              
              {/* Ticket Details */}
              <div className="text-sm opacity-80 space-y-1">
                <p className="font-mono tracking-wider">{currentResult.ticket.ticketCode} ({currentResult.ticket.ticketType})</p>
                <p>{isArabic ? 'الحجز: ' : 'Ref: '}{currentResult.ticket.bookingReference}</p>
                <p>{isArabic ? 'التاريخ: ' : 'Date: '}{new Date(currentResult.ticket.visitDate).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          )}
          
          {/* Tap to continue with countdown */}
          <p className="mt-6 text-xl font-semibold opacity-90">
            {isArabic ? 'اضغط للمتابعة' : 'Tap anywhere to continue'}
            <span className="opacity-60 ms-2">({Math.ceil(countdownProgress / 10)}s)</span>
          </p>
          
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/20">
            <div 
              className="h-full bg-white/60 transition-all duration-100" 
              style={{ width: `${countdownProgress}%` }} 
            />
          </div>
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

          {/* Stats Grid - 5 clear mini cards */}
          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {/* Total Scans */}
            <div className="bg-card border border-border/50 rounded-xl p-2 text-center">
              <p className="text-lg font-bold tabular-nums">{todayStats.totalScans}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {isArabic ? 'إجمالي' : 'Total'}
              </p>
            </div>
            
            {/* Valid Scans */}
            <div className="bg-success/10 border border-success/30 rounded-xl p-2 text-center">
              <p className="text-lg font-bold tabular-nums text-success">{todayStats.validScans}</p>
              <p className="text-[9px] text-success/80 mt-0.5 flex items-center justify-center gap-0.5">
                <Check className="h-2.5 w-2.5" />
                {isArabic ? 'صالح' : 'Valid'}
              </p>
            </div>
            
            {/* Used/Already Scanned */}
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-2 text-center">
              <p className="text-lg font-bold tabular-nums text-warning">{todayStats.usedScans}</p>
              <p className="text-[9px] text-warning/80 mt-0.5 flex items-center justify-center gap-0.5">
                <AlertCircle className="h-2.5 w-2.5" />
                {isArabic ? 'مستخدم' : 'Used'}
              </p>
            </div>
            
            {/* Invalid */}
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-2 text-center">
              <p className="text-lg font-bold tabular-nums text-destructive">{todayStats.invalidScans}</p>
              <p className="text-[9px] text-destructive/80 mt-0.5 flex items-center justify-center gap-0.5">
                <X className="h-2.5 w-2.5" />
                {isArabic ? 'مرفوض' : 'Invalid'}
              </p>
            </div>
            
            {/* Employee Scans - Purple themed */}
            <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-2 text-center">
              <p className="text-lg font-bold tabular-nums text-violet-500">{employeeScansToday}</p>
              <p className="text-[9px] text-violet-500/80 mt-0.5 flex items-center justify-center gap-0.5">
                <Briefcase className="h-2.5 w-2.5" />
                {isArabic ? 'موظفين' : 'Staff'}
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
                
                {/* Employee Manual Lookup */}
                <Button 
                  variant="outline" 
                  className="w-full gap-2 border-violet-200 text-violet-600 hover:bg-violet-50 dark:border-violet-500/30 dark:text-violet-400 dark:hover:bg-violet-500/10"
                  onClick={() => setShowEmployeeLookup(!showEmployeeLookup)}
                >
                  <Briefcase className="h-4 w-4" />
                  {isArabic ? 'بحث موظف' : 'Employee Lookup'}
                </Button>
                
                {showEmployeeLookup && (
                  <div className="mt-3 space-y-3 p-3 rounded-xl bg-violet-50/50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-500/30">
                    <div className="flex gap-2">
                      <Input 
                        placeholder={isArabic ? 'اسم الموظف أو البريد...' : 'Employee name or email...'} 
                        value={employeeSearchQuery} 
                        onChange={(e) => setEmployeeSearchQuery(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleEmployeeLookup()} 
                        className="flex-1 border-violet-200 dark:border-violet-500/30" 
                      />
                      <Button 
                        onClick={handleEmployeeLookup} 
                        disabled={isSearchingEmployee}
                        className="bg-violet-500 hover:bg-violet-600"
                      >
                        {isSearchingEmployee ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    {employeeSearchResults.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {employeeSearchResults.map((emp) => (
                          <div 
                            key={emp.id} 
                            onClick={() => handleSelectEmployee(emp)}
                            className={cn(
                              'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                              emp.is_active ? 'bg-violet-500/5 border-violet-500/20' : 'bg-destructive/5 border-destructive/20'
                            )}
                          >
                            <div className="flex items-center justify-between rtl:flex-row-reverse">
                              <div>
                                <p className="font-medium">{emp.full_name}</p>
                                <p className="text-xs text-muted-foreground">{getDepartmentLabel(emp.department)}</p>
                              </div>
                              <Badge className={emp.is_active ? 'bg-violet-500 text-white' : 'bg-destructive text-white'}>
                                {emp.is_active ? (isArabic ? 'فعال' : 'Active') : (isArabic ? 'غير فعال' : 'Inactive')}
                              </Badge>
                            </div>
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
                    <div 
                      key={index} 
                      onClick={() => setSelectedScanDetail(scan)}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md',
                      scan.isEmployee && scan.status === 'employee_valid' && 'bg-violet-500/5 border-violet-500/20',
                      scan.isEmployee && scan.status === 'employee_inactive' && 'bg-destructive/5 border-destructive/20',
                      !scan.isEmployee && scan.status === 'valid' && scan.paymentStatus === 'completed' && 'bg-success/5 border-success/20',
                      !scan.isEmployee && scan.status === 'valid' && scan.paymentStatus !== 'completed' && 'bg-amber-100 border-amber-400 dark:bg-amber-900/30 dark:border-amber-600',
                      !scan.isEmployee && scan.status === 'used' && 'bg-warning/5 border-warning/20',
                      !scan.isEmployee && !['valid', 'used'].includes(scan.status) && 'bg-destructive/5 border-destructive/20'
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center",
                          scan.isEmployee && scan.status === 'employee_valid' && 'bg-violet-500/10',
                          scan.isEmployee && scan.status === 'employee_inactive' && 'bg-destructive/10',
                          !scan.isEmployee && scan.status === 'valid' && scan.paymentStatus === 'completed' && 'bg-success/10',
                          !scan.isEmployee && scan.status === 'valid' && scan.paymentStatus !== 'completed' && 'bg-amber-500/10',
                          !scan.isEmployee && scan.status === 'used' && 'bg-warning/10',
                          !scan.isEmployee && !['valid', 'used'].includes(scan.status) && 'bg-destructive/10'
                        )}>
                          {scan.isEmployee && scan.status === 'employee_valid' && <CheckCircle className="h-4 w-4 text-violet-500" />}
                          {scan.isEmployee && scan.status === 'employee_inactive' && <XCircle className="h-4 w-4 text-destructive" />}
                          {!scan.isEmployee && scan.status === 'valid' && scan.paymentStatus === 'completed' && <CheckCircle className="h-4 w-4 text-success" />}
                          {!scan.isEmployee && scan.status === 'valid' && scan.paymentStatus !== 'completed' && <AlertTriangle className="h-4 w-4 text-amber-600" />}
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
                          !scan.isEmployee && scan.status === 'valid' && scan.paymentStatus === 'completed' && 'text-success',
                          !scan.isEmployee && scan.status === 'valid' && scan.paymentStatus !== 'completed' && 'text-amber-600',
                          !scan.isEmployee && scan.status === 'used' && 'text-warning',
                          !scan.isEmployee && !['valid', 'used'].includes(scan.status) && 'text-destructive'
                        )}>
                          {!scan.isEmployee && scan.status === 'valid' && scan.paymentStatus !== 'completed' 
                            ? (isArabic ? 'صالحة - غير مدفوعة' : 'Valid - Not Paid')
                            : getStatusText(scan.status)}
                        </p>
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

      {/* Scan Detail Dialog */}
      <Dialog open={!!selectedScanDetail} onOpenChange={() => setSelectedScanDetail(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isArabic ? 'تفاصيل المسح' : 'Scan Details'}</DialogTitle>
          </DialogHeader>
          {selectedScanDetail && (
            <div className="space-y-4">
              {/* Employee Details View */}
              {selectedScanDetail.isEmployee ? (
                <>
                  <div className="flex justify-center">
                    <Badge className={cn(
                      'text-sm px-3 py-1',
                      selectedScanDetail.status === 'employee_valid' ? 'bg-violet-500 text-white' : 'bg-destructive text-white'
                    )}>
                      {selectedScanDetail.status === 'employee_valid' 
                        ? (isArabic ? 'موظف فعال' : 'Active Employee')
                        : (isArabic ? 'موظف غير فعال' : 'Inactive Employee')}
                    </Badge>
                  </div>
                  
                  <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 space-y-3">
                    <p className="font-bold text-lg text-center">{selectedScanDetail.employeeName}</p>
                    
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground rtl:flex-row-reverse">
                      <Briefcase className="h-4 w-4" />
                      <span>{getDepartmentLabel(selectedScanDetail.employeeDepartment || 'general')}</span>
                    </div>
                    
                    {employeeDetails?.phone && (
                      <a href={`tel:${employeeDetails.phone}`} className="flex items-center justify-center gap-2 text-primary hover:underline rtl:flex-row-reverse">
                        <Phone className="h-4 w-4" />
                        <span dir="ltr">{employeeDetails.phone}</span>
                      </a>
                    )}
                    
                    {employeeDetails?.email && (
                      <p className="text-center text-sm text-muted-foreground">{employeeDetails.email}</p>
                    )}
                    
                    <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1 rtl:flex-row-reverse">
                      <Clock className="h-3 w-3" />
                      <span>{isArabic ? 'وقت الدخول:' : 'Entry Time:'}</span>
                      <span dir="ltr">{selectedScanDetail.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                </>
              ) : (
                /* Ticket Details View */
                <>
                  <div className="flex justify-center">
                    <Badge variant={selectedScanDetail.status === 'valid' ? 'default' : selectedScanDetail.status === 'used' ? 'secondary' : 'destructive'} className={cn(
                      'text-sm px-3 py-1',
                      selectedScanDetail.status === 'valid' && selectedScanDetail.paymentStatus !== 'completed' && 'bg-amber-500 text-white',
                      selectedScanDetail.status === 'valid' && selectedScanDetail.paymentStatus === 'completed' && 'bg-success text-white',
                      selectedScanDetail.status === 'used' && 'bg-warning text-white'
                    )}>
                      {selectedScanDetail.status === 'valid' && selectedScanDetail.paymentStatus !== 'completed'
                        ? (isArabic ? 'صالحة - غير مدفوعة' : 'Valid - Not Paid')
                        : getStatusText(selectedScanDetail.status)}
                    </Badge>
                  </div>
                  
                  <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                    <p className="font-bold text-lg text-center">{selectedScanDetail.customerName}</p>
                    
                    {selectedScanDetail.customerPhone && (
                      <a href={`tel:${selectedScanDetail.customerPhone}`} className="flex items-center justify-center gap-2 text-primary hover:underline">
                        <Phone className="h-4 w-4" />
                        <span dir="ltr">{selectedScanDetail.customerPhone}</span>
                      </a>
                    )}
                    
                    <div className="flex items-center justify-center gap-3 flex-wrap text-sm">
                      {(selectedScanDetail.adultCount || 0) > 0 && (
                        <span className="flex items-center gap-1"><User className="h-4 w-4" /> {selectedScanDetail.adultCount} {isArabic ? 'بالغ' : 'Adults'}</span>
                      )}
                      {(selectedScanDetail.childCount || 0) > 0 && (
                        <span className="flex items-center gap-1"><Baby className="h-4 w-4" /> {selectedScanDetail.childCount} {isArabic ? 'طفل' : 'Children'}</span>
                      )}
                    </div>
                    
                    <div className="text-center text-sm text-muted-foreground space-y-1">
                      <p className="font-mono">{selectedScanDetail.ticketCode}</p>
                      <p>{isArabic ? 'الحجز: ' : 'Ref: '}{selectedScanDetail.bookingReference}</p>
                      {selectedScanDetail.visitDate && (
                        <p>{isArabic ? 'التاريخ: ' : 'Date: '}{new Date(selectedScanDetail.visitDate).toLocaleDateString()}</p>
                      )}
                      <p className="text-xs">{isArabic ? 'المسح: ' : 'Scanned: '}{selectedScanDetail.timestamp.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {/* All Tickets Section */}
                  {fullBookingDetails?.tickets && fullBookingDetails.tickets.length > 1 && (
                    <div className="bg-muted/30 rounded-xl p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                        <Ticket className="h-4 w-4" />
                        {isArabic ? 'جميع التذاكر' : 'All Tickets'} ({fullBookingDetails.tickets.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {fullBookingDetails.tickets.map((ticket) => (
                          <div key={ticket.id} className={cn(
                            "flex items-center justify-between p-2 rounded-lg text-sm",
                            ticket.is_used ? 'bg-warning/10' : 'bg-success/10'
                          )}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{ticket.ticket_code}</span>
                              <span className="text-xs">
                                {ticket.ticket_type === 'adult' ? '👨' : ticket.ticket_type === 'child' ? '👶' : '👴'}
                              </span>
                            </div>
                            <Badge variant="secondary" className={cn(
                              'text-xs',
                              ticket.is_used ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'
                            )}>
                              {ticket.is_used ? (isArabic ? 'مستخدم' : 'Used') : (isArabic ? 'صالح' : 'Valid')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Total Amount */}
                  {fullBookingDetails && (
                    <p className="text-sm text-center text-muted-foreground">
                      {isArabic ? 'الإجمالي: ' : 'Total: '}{fullBookingDetails.total_amount} SAR
                    </p>
                  )}
                  
                  {/* Enhanced Payment Warning in Dialog */}
                  {selectedScanDetail.paymentStatus !== 'completed' && selectedScanDetail.bookingId && (
                    <div className="space-y-3">
                      {/* Payment Due Alert */}
                      <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 font-bold text-lg">
                          <Banknote className="h-5 w-5" />
                          {isArabic ? '⚠️ لم يتم الدفع' : '⚠️ NOT PAID'}
                        </div>
                        {fullBookingDetails?.total_amount && (
                          <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                            {isArabic ? 'المبلغ المستحق: ' : 'Amount Due: '}
                            <span className="font-bold font-mono">{fullBookingDetails.total_amount} SAR</span>
                          </p>
                        )}
                      </div>
                      
                      {/* Large Payment Button */}
                      <Button 
                        size="lg"
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-lg py-6 h-auto gap-3 font-bold"
                        disabled={isMarkingPaid}
                        onClick={() => handleMarkAsPaid(selectedScanDetail.bookingId!)}
                      >
                        {isMarkingPaid ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                        {isArabic ? '✓ تم استلام الدفع' : '✓ Payment Received'}
                      </Button>
                    </div>
                  )}
                  
                  {selectedScanDetail.bookingId && (
                    <Button 
                      variant="outline"
                      className="w-full gap-2"
                      disabled={isResendingEmail || emailCooldownRemaining > 0}
                      onClick={() => handleResendEmail(selectedScanDetail.bookingId!)}
                    >
                      {isResendingEmail ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : emailCooldownRemaining > 0 ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      {emailCooldownRemaining > 0 
                        ? `${isArabic ? 'انتظر' : 'Wait'} ${Math.floor(emailCooldownRemaining / 60)}:${(emailCooldownRemaining % 60).toString().padStart(2, '0')}`
                        : (isArabic ? 'إعادة إرسال البريد' : 'Resend Email')}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
