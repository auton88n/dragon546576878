import { useState } from 'react';
import { QrCode, Camera, CheckCircle, XCircle, AlertTriangle, History } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ScannerPage = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
    } catch (err) {
      setCameraPermission('denied');
    }
  };

  // Placeholder stats
  const todayStats = {
    totalScans: 0,
    validScans: 0,
    invalidScans: 0,
    usedScans: 0,
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8">
        <div className="container max-w-4xl">
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <QrCode className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isArabic ? 'ماسح التذاكر' : 'Ticket Scanner'}
            </h1>
            <p className="text-muted-foreground">
              {isArabic ? 'امسح رموز QR للتحقق من صلاحية التذاكر' : 'Scan QR codes to validate tickets'}
            </p>
          </div>

          {/* Today's Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <QrCode className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{todayStats.totalScans}</p>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? 'إجمالي المسح' : 'Total Scans'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-6 w-6 text-success mx-auto mb-2" />
                <p className="text-2xl font-bold text-success">{todayStats.validScans}</p>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? 'صالح' : 'Valid'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <XCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
                <p className="text-2xl font-bold text-destructive">{todayStats.invalidScans}</p>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? 'غير صالح' : 'Invalid'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-6 w-6 text-warning mx-auto mb-2" />
                <p className="text-2xl font-bold text-warning">{todayStats.usedScans}</p>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? 'مستخدم' : 'Already Used'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Scanner Area Placeholder */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                {isArabic ? 'منطقة المسح' : 'Scan Area'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-border">
                {cameraPermission === 'prompt' && (
                  <>
                    <Camera className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4 text-center px-4">
                      {isArabic 
                        ? 'يتطلب الماسح إذن الوصول للكاميرا'
                        : 'Scanner requires camera access permission'}
                    </p>
                    <Button onClick={requestCameraPermission} className="gap-2">
                      <Camera className="h-4 w-4" />
                      {isArabic ? 'السماح بالوصول للكاميرا' : 'Allow Camera Access'}
                    </Button>
                  </>
                )}
                {cameraPermission === 'denied' && (
                  <>
                    <XCircle className="h-16 w-16 text-destructive mb-4" />
                    <p className="text-destructive text-center px-4">
                      {isArabic 
                        ? 'تم رفض إذن الكاميرا. يرجى السماح بالوصول من إعدادات المتصفح.'
                        : 'Camera permission denied. Please allow access from browser settings.'}
                    </p>
                  </>
                )}
                {cameraPermission === 'granted' && (
                  <>
                    <div className="w-48 h-48 border-4 border-primary rounded-2xl flex items-center justify-center mb-4">
                      <QrCode className="h-20 w-20 text-primary/30" />
                    </div>
                    <p className="text-muted-foreground text-center">
                      {isArabic 
                        ? '🚧 ماسح QR قيد التطوير - قريباً!'
                        : '🚧 QR Scanner under development - Coming soon!'}
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Scans Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                {isArabic ? 'آخر عمليات المسح' : 'Recent Scans'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>{isArabic ? 'لا توجد عمليات مسح بعد' : 'No scans yet'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ScannerPage;
