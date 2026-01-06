import { QrCode, Download } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Employee } from '@/hooks/useEmployees';

interface EmployeeQRDialogProps {
  employee: Employee;
  onClose: () => void;
}

const departments: Record<string, { ar: string; en: string }> = {
  security: { ar: 'الأمن', en: 'Security' },
  cleaning: { ar: 'النظافة', en: 'Cleaning' },
  guide: { ar: 'الإرشاد', en: 'Guide' },
  cafe: { ar: 'المقهى', en: 'Café' },
  shop: { ar: 'المتجر', en: 'Shop' },
  maintenance: { ar: 'الصيانة', en: 'Maintenance' },
  general: { ar: 'عام', en: 'General' },
  other: { ar: 'أخرى', en: 'Other' },
};

// Helper function for rounded rectangles
const roundRect = (
  ctx: CanvasRenderingContext2D, 
  x: number, y: number, 
  w: number, h: number, 
  r: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const EmployeeQRDialog = ({ employee, onClose }: EmployeeQRDialogProps) => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  const getDeptLabel = (dept: string) => {
    return departments[dept] 
      ? (isArabic ? departments[dept].ar : departments[dept].en)
      : dept;
  };

  const handleDownload = async () => {
    if (!employee.qr_code_url) return;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const width = 600;
      const height = 900;
      canvas.width = width;
      canvas.height = height;
      
      // Background - light cream
      ctx.fillStyle = '#FAF8F5';
      ctx.fillRect(0, 0, width, height);
      
      // Purple gradient header
      const headerGradient = ctx.createLinearGradient(0, 0, 0, 140);
      headerGradient.addColorStop(0, '#7C3AED');
      headerGradient.addColorStop(1, '#5B21B6');
      ctx.fillStyle = headerGradient;
      ctx.fillRect(0, 0, width, 140);
      
      // Logo/Brand text
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px Arial';
      ctx.fillText('سوق المفيجر', width / 2, 55);
      ctx.font = '14px Arial';
      ctx.fillText('SOUQ ALMUFAIJER', width / 2, 80);
      
      // "EMPLOYEE BADGE" label
      ctx.font = 'bold 18px Arial';
      ctx.fillText(isArabic ? 'بطاقة الموظف' : 'EMPLOYEE BADGE', width / 2, 115);
      
      // Decorative line
      ctx.strokeStyle = '#E9D5FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width/2 - 80, 130);
      ctx.lineTo(width/2 + 80, 130);
      ctx.stroke();
      
      // Employee name card
      ctx.fillStyle = '#5B21B6';
      roundRect(ctx, 50, 170, width - 100, 100, 16);
      ctx.fill();
      
      ctx.fillStyle = '#E9D5FF';
      ctx.font = '14px Arial';
      ctx.fillText(isArabic ? 'الاسم' : 'NAME', width / 2, 200);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px Arial';
      ctx.fillText(employee.full_name, width / 2, 245);
      
      // Department badge
      const deptLabel = getDeptLabel(employee.department);
      ctx.fillStyle = '#F3E8FF';
      roundRect(ctx, width/2 - 90, 295, 180, 45, 22);
      ctx.fill();
      
      ctx.fillStyle = '#7C3AED';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(deptLabel, width / 2, 325);
      
      // QR Code container
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, 100, 370, width - 200, 340, 20);
      ctx.fill();
      ctx.strokeStyle = '#7C3AED';
      ctx.lineWidth = 4;
      roundRect(ctx, 100, 370, width - 200, 340, 20);
      ctx.stroke();
      
      // Load and draw QR code
      const qrImage = new Image();
      qrImage.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        qrImage.onload = () => {
          ctx.drawImage(qrImage, 140, 390, 320, 280);
          resolve();
        };
        qrImage.onerror = () => resolve();
        qrImage.src = employee.qr_code_url!;
      });
      
      // Scan instruction text
      ctx.fillStyle = '#5B21B6';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(isArabic ? 'امسح للدخول' : 'SCAN FOR ENTRY', width / 2, 690);
      
      // Green instruction box
      ctx.fillStyle = '#DCFCE7';
      roundRect(ctx, 50, 750, width - 100, 55, 14);
      ctx.fill();
      
      ctx.fillStyle = '#16A34A';
      ctx.font = 'bold 15px Arial';
      ctx.fillText(
        isArabic ? '✓ يمكن استخدام هذه البطاقة عدة مرات للدخول' : '✓ This badge can be used multiple times for entry',
        width / 2, 
        785
      );
      
      // Purple footer bar
      ctx.fillStyle = '#5B21B6';
      ctx.fillRect(0, height - 55, width, 55);
      
      ctx.fillStyle = '#E9D5FF';
      ctx.font = '14px Arial';
      ctx.fillText('tickets.almufaijer.com', width / 2, height - 22);
      
      // Download as PNG
      const link = document.createElement('a');
      link.download = `employee-badge-${employee.full_name.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pe-12">
          <DialogTitle className="flex items-center gap-2 rtl:flex-row-reverse">
            <QrCode className="h-5 w-5 text-violet-600" />
            {isArabic ? 'بطاقة الموظف' : 'Employee Badge'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6">
          {/* Employee Info */}
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-foreground">{employee.full_name}</h3>
            <Badge className="mt-2 bg-violet-500/10 text-violet-700 border-violet-500/20">
              {getDeptLabel(employee.department)}
            </Badge>
          </div>
          
          {/* QR Code */}
          {employee.qr_code_url ? (
            <div className="p-4 bg-white rounded-xl border-2 border-violet-200 shadow-lg">
              <img 
                src={employee.qr_code_url} 
                alt="Employee Badge QR Code"
                className="w-64 h-64 object-contain"
              />
            </div>
          ) : (
            <div className="w-64 h-64 bg-muted rounded-xl flex items-center justify-center">
              <p className="text-muted-foreground text-center px-4">
                {isArabic ? 'لم يتم إنشاء QR بعد' : 'QR not generated yet'}
              </p>
            </div>
          )}
          
          {/* Instructions */}
          <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded-xl text-center max-w-xs">
            <p className="text-sm text-success font-medium">
              ✓ {isArabic 
                ? 'يمكن استخدام هذه البطاقة عدة مرات للدخول'
                : 'This badge can be used multiple times for entry'}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 mt-6 w-full">
            <Button 
              variant="outline" 
              onClick={handleDownload}
              disabled={!employee.qr_code_url}
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              {isArabic ? 'تحميل' : 'Download'}
            </Button>
            <Button 
              onClick={onClose}
              className="flex-1 bg-violet-600 hover:bg-violet-700"
            >
              {isArabic ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeQRDialog;
