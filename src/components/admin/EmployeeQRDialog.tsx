import { QrCode, Download, Mail, X } from 'lucide-react';
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
      const response = await fetch(employee.qr_code_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `employee-badge-${employee.full_name.replace(/\s+/g, '-')}.gif`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
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
