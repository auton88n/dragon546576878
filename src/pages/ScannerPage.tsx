import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { QrCode, Camera, CheckCircle, XCircle, AlertTriangle, History, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuthStore } from '@/stores/authStore';
import { validateTicket, markTicketAsUsed, logScanAttempt, type TicketValidationResult } from '@/lib/ticketService';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ScanResult {
  timestamp: Date;
  status: TicketValidationResult['status'];
  ticketCode?: string;
  customerName?: string;
  ticketType?: string;
}

const ScannerPage = () => {
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { user } = useAuthStore();
  
  const [isScanning, setIsScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentResult, setCurrentResult] = useState<TicketValidationResult | null>(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [todayStats, setTodayStats] = useState({
    totalScans: 0,
    validScans: 0,
    invalidScans: 0,
    usedScans: 0,
  });
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play feedback sound
  const playSound = useCallback((type: 'success' | 'error' | 'warning') => {
    if (!soundEnabled) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      switch (type) {
        case 'success':
          oscillator.frequency.value = 880;
          oscillator.type = 'sine';
          break;
        case 'error':
          oscillator.frequency.value = 220;
          oscillator.type = 'square';
          break;
        case 'warning':
          oscillator.frequency.value = 440;
          oscillator.type = 'triangle';
          break;
      }
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  }, [soundEnabled]);

  // Handle QR code scan result
  const onScanSuccess = useCallback(async (decodedText: string) => {
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

    // Play appropriate sound
    if (result.isValid) {
      playSound('success');
      // Mark ticket as used
      if (result.ticket) {
        await markTicketAsUsed(result.ticket.id, user?.id, 'main_entrance');
      }
    } else if (result.status === 'used') {
      playSound('warning');
    } else {
      playSound('error');
    }

    // Log the scan attempt
    await logScanAttempt(
      result.ticket?.id || null,
      result.status,
      user?.id,
      navigator.userAgent
    );

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
    }, 3000);
  }, [playSound, user]);

  // Start camera scanning
  const startScanning = async () => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        onScanSuccess,
        () => {} // Ignore scan failures
      );

      setIsScanning(true);
      setCameraReady(true);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setCameraReady(false);
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

      {/* Result Overlay */}
      {showResultOverlay && currentResult && (
        <div className={cn(
          'fixed inset-0 z-50 flex flex-col items-center justify-center text-white p-8 animate-fade-in',
          getStatusColor(currentResult.status)
        )}>
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
            {isArabic ? 'استئناف تلقائي خلال 3 ثوان...' : 'Auto-resuming in 3 seconds...'}
          </p>
        </div>
      )}

      <main className="flex-1 pt-24 pb-8">
        <div className="container max-w-4xl">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center glow-gold">
                <QrCode className="h-7 w-7 text-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {isArabic ? 'ماسح التذاكر' : 'Ticket Scanner'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? 'امسح رموز QR للتحقق' : 'Scan QR codes to validate'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="border-accent/30 hover:bg-accent/5 h-12 w-12 rounded-xl"
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
          </div>

          {/* Today's Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <Card className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{todayStats.totalScans}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? 'إجمالي' : 'Total'}
              </p>
            </Card>
            <Card className="glass-card p-4 text-center border-success/30 bg-success/5">
              <p className="text-2xl font-bold text-success">{todayStats.validScans}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? 'صالح' : 'Valid'}
              </p>
            </Card>
            <Card className="glass-card p-4 text-center border-warning/30 bg-warning/5">
              <p className="text-2xl font-bold text-warning">{todayStats.usedScans}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? 'مستخدم' : 'Used'}
              </p>
            </Card>
            <Card className="glass-card p-4 text-center border-destructive/30 bg-destructive/5">
              <p className="text-2xl font-bold text-destructive">{todayStats.invalidScans}</p>
              <p className="text-xs text-muted-foreground">
                {isArabic ? 'غير صالح' : 'Invalid'}
              </p>
            </Card>
          </div>

          {/* Scanner Area */}
          <Card className="glass-card-gold mb-6 overflow-hidden border-0">
            <CardContent className="p-0">
              <div className="relative">
                {/* QR Reader Container */}
                <div 
                  id="qr-reader" 
                  className={cn(
                    'w-full aspect-square bg-foreground/5',
                    !isScanning && 'hidden'
                  )}
                />
                
                {/* Placeholder when not scanning */}
                {!isScanning && (
                  <div className="w-full aspect-square bg-secondary/30 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 rounded-full gradient-gold flex items-center justify-center mb-6 glow-gold">
                      <Camera className="h-12 w-12 text-foreground" />
                    </div>
                    <p className="text-muted-foreground text-center max-w-xs">
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
              <div className="p-4 bg-card border-t border-border/50">
                <Button
                  size="lg"
                  className={cn(
                    "w-full h-14 text-lg gap-3 rounded-xl transition-all",
                    isScanning 
                      ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
                      : "btn-gold"
                  )}
                  onClick={isScanning ? stopScanning : startScanning}
                >
                  {isScanning ? (
                    <>
                      <XCircle className="h-6 w-6" />
                      {isArabic ? 'إيقاف المسح' : 'Stop Scanning'}
                    </>
                  ) : (
                    <>
                      <Camera className="h-6 w-6" />
                      {isArabic ? 'بدء المسح' : 'Start Scanning'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Scans */}
          <Card className="glass-card-gold border-0">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
                  <History className="h-5 w-5 text-foreground" />
                </div>
                <span>{isArabic ? 'آخر عمليات المسح' : 'Recent Scans'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {recentScans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>{isArabic ? 'لا توجد عمليات مسح بعد' : 'No scans yet'}</p>
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

      {/* Scan line animation */}
      <style>{`
        @keyframes scan-line {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(250px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ScannerPage;