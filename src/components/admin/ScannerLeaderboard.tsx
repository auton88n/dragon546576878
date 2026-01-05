import { Trophy, QrCode, Clock } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useScannerStats } from '@/hooks/useScannerStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const ScannerLeaderboard = () => {
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { scannerStats, loading } = useScannerStats();

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-500';
      case 1: return 'text-gray-400';
      case 2: return 'text-amber-600';
      default: return 'text-muted-foreground';
    }
  };

  const getMedalBg = (index: number) => {
    switch (index) {
      case 0: return 'bg-yellow-500/10 border-yellow-500/30';
      case 1: return 'bg-gray-400/10 border-gray-400/30';
      case 2: return 'bg-amber-600/10 border-amber-600/30';
      default: return 'bg-muted/50 border-border';
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '-';
    try {
      return format(new Date(timestamp), 'HH:mm');
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <Card className="glass-card-gold border-0">
        <CardHeader className="p-4">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card-gold border-0">
      <CardHeader className="p-4 border-b border-border/50">
        <CardTitle className={`flex items-center gap-2 text-base ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
          <div className="w-8 h-8 rounded-xl gradient-gold flex items-center justify-center">
            <Trophy className="h-4 w-4 text-foreground" />
          </div>
          <span className="text-foreground">
            {isArabic ? 'متصدري الماسحين اليوم' : "Today's Scanner Leaderboard"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        {scannerStats.length === 0 ? (
          <div className={`text-center py-8 text-muted-foreground ${isRTL ? 'rtl' : ''}`}>
            <QrCode className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {isArabic ? 'لا توجد عمليات مسح اليوم' : 'No scans today yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {scannerStats.map((scanner, index) => (
              <div
                key={scanner.scannerId}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${getMedalBg(index)} ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                {/* Rank */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${getMedalColor(index)} ${index < 3 ? 'text-lg' : 'text-sm bg-muted'}`}>
                  {index < 3 ? (
                    <Trophy className="h-5 w-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Scanner Info */}
                <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                  <p className="font-medium text-foreground truncate">
                    {scanner.scannerName}
                  </p>
                  <p className={`text-xs text-muted-foreground flex items-center gap-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <Clock className="h-3 w-3" />
                    {isArabic ? 'آخر مسح:' : 'Last:'} {formatTime(scanner.lastScanTime)}
                  </p>
                </div>

                {/* Scan Count */}
                <div className={`flex-shrink-0 text-center ${isRTL ? 'text-left' : 'text-right'}`}>
                  <p className={`text-2xl font-bold ${index === 0 ? 'text-yellow-500' : 'text-foreground'}`}>
                    {scanner.scansToday}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic 
                      ? `${scanner.validScans} صالحة` 
                      : `${scanner.validScans} valid`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScannerLeaderboard;
