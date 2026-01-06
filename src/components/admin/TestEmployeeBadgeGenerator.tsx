import { useState } from 'react';
import { QrCode, CheckCircle, XCircle, Loader2, Trash2, UserCheck } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import QRCode from 'qrcode';

interface TestEmployee {
  id: string;
  type: 'active' | 'inactive';
  name: string;
  department: string;
  qrCodeUrl: string;
  createdAt: Date;
}

const TEST_EMPLOYEE_PREFIX = 'TEST-EMP-';

const TestEmployeeBadgeGenerator = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { toast } = useToast();
  
  const [generating, setGenerating] = useState<string | null>(null);
  const [testEmployees, setTestEmployees] = useState<TestEmployee[]>([]);
  const [clearing, setClearing] = useState(false);

  const generateChecksum = (data: string): string => {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 6).toUpperCase();
  };

  const generateTestEmployee = async (type: 'active' | 'inactive') => {
    setGenerating(type);
    
    try {
      const timestamp = Date.now().toString(36).toUpperCase();
      const name = `${TEST_EMPLOYEE_PREFIX}${type.toUpperCase()}-${timestamp}`;
      const department = 'security';
      const isActive = type === 'active';

      // Create test employee in database
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .insert({
          full_name: name,
          email: `test-${timestamp.toLowerCase()}@almufaijer.com`,
          phone: '+966500000000',
          department,
          is_active: isActive,
        })
        .select()
        .single();

      if (employeeError) throw employeeError;

      // Generate QR code data
      const qrData = JSON.stringify({
        type: 'employee',
        id: employee.id,
        name: name,
        dept: department,
        cs: generateChecksum(employee.id + name),
      });

      // Generate QR code image
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 600,
        margin: 4,
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#FFFFFF' },
      });

      // Update employee with QR code URL
      await supabase
        .from('employees')
        .update({ qr_code_url: qrCodeDataUrl })
        .eq('id', employee.id);

      // Add to local state
      setTestEmployees(prev => [...prev, {
        id: employee.id,
        type,
        name,
        department,
        qrCodeUrl: qrCodeDataUrl,
        createdAt: new Date(),
      }]);

      toast({
        title: isArabic ? 'تم إنشاء شارة الاختبار' : 'Test Badge Created',
        description: isArabic 
          ? `تم إنشاء شارة ${getTypeLabel(type, isArabic)} بنجاح`
          : `${getTypeLabel(type, isArabic)} test badge created successfully`,
      });
    } catch (error) {
      console.error('Error generating test employee:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في إنشاء شارة الاختبار' : 'Failed to create test badge',
        variant: 'destructive',
      });
    } finally {
      setGenerating(null);
    }
  };

  const clearTestEmployees = async () => {
    setClearing(true);
    try {
      // Delete test employees
      const { error } = await supabase
        .from('employees')
        .delete()
        .like('full_name', `${TEST_EMPLOYEE_PREFIX}%`);

      if (error) throw error;

      setTestEmployees([]);
      toast({
        title: isArabic ? 'تم المسح' : 'Cleared',
        description: isArabic ? 'تم حذف جميع شارات الاختبار' : 'All test badges have been deleted',
      });
    } catch (error) {
      console.error('Error clearing test employees:', error);
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل في حذف شارات الاختبار' : 'Failed to clear test badges',
        variant: 'destructive',
      });
    } finally {
      setClearing(false);
    }
  };

  const getTypeLabel = (type: string, arabic: boolean) => {
    switch (type) {
      case 'active': return arabic ? 'نشط' : 'Active';
      case 'inactive': return arabic ? 'غير نشط' : 'Inactive';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'active': return 'bg-violet-500/20 text-violet-700 border-violet-500/30';
      case 'inactive': return 'bg-red-500/20 text-red-700 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'inactive': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const badgeTypes: Array<{ type: 'active' | 'inactive'; description: { en: string; ar: string } }> = [
    { type: 'active', description: { en: 'Active employee - should verify successfully', ar: 'موظف نشط - يجب أن يتحقق بنجاح' } },
    { type: 'inactive', description: { en: 'Deactivated employee - should show inactive', ar: 'موظف معطل - يجب أن يظهر غير نشط' } },
  ];

  return (
    <Card className="glass-card border-accent/20 overflow-hidden">
      <CardHeader className="border-b border-accent/10 bg-gradient-to-r from-violet-500/5 to-transparent">
        <CardTitle className="flex items-center gap-3 text-foreground rtl:flex-row-reverse">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <UserCheck className="h-5 w-5 text-violet-600" />
          </div>
          {isArabic ? 'شارات الموظفين الاختبارية' : 'Test Employee Badges'}
        </CardTitle>
        <CardDescription className="text-start rtl:text-end">
          {isArabic 
            ? 'إنشاء شارات موظفين اختبارية لتدريب الموظفين على استخدام الماسح'
            : 'Generate test employee badges for staff scanner training'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Generate Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {badgeTypes.map(({ type, description }) => (
            <Button
              key={type}
              variant="outline"
              className={`h-auto py-4 px-4 flex flex-col items-start gap-2 border-2 hover:border-violet-500/50 transition-all ${
                generating === type ? 'opacity-70' : ''
              }`}
              onClick={() => generateTestEmployee(type)}
              disabled={generating !== null}
            >
              <div className="flex items-center gap-2 w-full rtl:flex-row-reverse">
                {generating === type ? (
                  <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                ) : (
                  <Badge className={`${getTypeColor(type)} border`}>
                    {getTypeIcon(type)}
                    <span className="ms-1">{getTypeLabel(type, isArabic)}</span>
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground text-start rtl:text-end w-full">
                {isArabic ? description.ar : description.en}
              </span>
            </Button>
          ))}
        </div>

        {/* Generated Badges */}
        {testEmployees.length > 0 && (
          <>
            <div className="flex items-center justify-between rtl:flex-row-reverse">
              <h4 className="font-medium text-foreground">
                {isArabic ? 'الشارات المُنشأة' : 'Generated Badges'}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 rtl:flex-row-reverse"
                onClick={clearTestEmployees}
                disabled={clearing}
              >
                {clearing ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <Trash2 className="h-4 w-4 me-2" />
                )}
                {isArabic ? 'مسح الكل' : 'Clear All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {testEmployees.map((employee) => (
                <div 
                  key={employee.id}
                  className="glass-card rounded-xl p-3 border border-violet-500/20 flex flex-col items-center gap-2"
                >
                  <Badge className={`${getTypeColor(employee.type)} border text-xs`}>
                    {getTypeLabel(employee.type, isArabic)}
                  </Badge>
                  <img 
                    src={employee.qrCodeUrl} 
                    alt={`Test Badge - ${employee.type}`}
                    className="w-full max-w-[120px] aspect-square rounded-lg"
                  />
                  <code className="text-[10px] text-muted-foreground font-mono truncate w-full text-center">
                    {employee.name}
                  </code>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Instructions */}
        <div className="bg-violet-500/5 rounded-xl p-4 border border-violet-500/20">
          <h4 className="font-medium text-foreground mb-3 text-start rtl:text-end">
            {isArabic ? 'تعليمات الاستخدام' : 'How to Use'}
          </h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2 rtl:flex-row-reverse">
              <span className="text-violet-500 mt-0.5 shrink-0">•</span>
              <span className="text-start rtl:text-end">{isArabic ? 'انقر على نوع الشارة لإنشاء رمز QR اختباري' : 'Click a badge type to generate a test QR code'}</span>
            </li>
            <li className="flex items-start gap-2 rtl:flex-row-reverse">
              <span className="text-violet-500 mt-0.5 shrink-0">•</span>
              <span className="text-start rtl:text-end">{isArabic ? 'شارات الموظفين تسمح بمسح غير محدود' : 'Employee badges allow unlimited scanning'}</span>
            </li>
            <li className="flex items-start gap-2 rtl:flex-row-reverse">
              <span className="text-violet-500 mt-0.5 shrink-0">•</span>
              <span className="text-start rtl:text-end">{isArabic ? 'امسح الرمز للتحقق من النتيجة المتوقعة (بنفسجي = موظف)' : 'Scan to verify expected result (purple = employee)'}</span>
            </li>
            <li className="flex items-start gap-2 rtl:flex-row-reverse">
              <span className="text-violet-500 mt-0.5 shrink-0">•</span>
              <span className="text-start rtl:text-end">{isArabic ? 'استخدم "مسح الكل" لحذف الشارات الاختبارية بعد الانتهاء' : 'Use "Clear All" to delete test badges when done'}</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestEmployeeBadgeGenerator;