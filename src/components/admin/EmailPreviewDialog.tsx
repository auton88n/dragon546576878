import { useState, useMemo } from 'react';
import { Eye, Globe, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { generatePaymentReminderPreview, getSampleBookingData } from '@/lib/emailPreviewTemplates';

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EmailPreviewDialog = ({ open, onOpenChange }: EmailPreviewDialogProps) => {
  const { currentLanguage, isRTL } = useLanguage();
  const isAdminArabic = currentLanguage === 'ar';
  const [previewLang, setPreviewLang] = useState<'ar' | 'en'>('ar');

  const htmlContent = useMemo(() => {
    const sampleData = getSampleBookingData(previewLang === 'ar');
    return generatePaymentReminderPreview(sampleData, previewLang === 'ar');
  }, [previewLang]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-hidden flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}>
        <DialogHeader className="flex-shrink-0 border-b border-border/50 pb-4">
          <div className="flex items-center justify-between rtl:flex-row-reverse">
            <DialogTitle className="flex items-center gap-2 text-lg rtl:flex-row-reverse">
              <Eye className="h-5 w-5 text-primary" />
              {isAdminArabic ? 'معاينة البريد الإلكتروني' : 'Email Preview'}
            </DialogTitle>
          </div>
          
          {/* Language Toggle */}
          <div className="mt-4">
            <Tabs value={previewLang} onValueChange={(v) => setPreviewLang(v as 'ar' | 'en')}>
              <TabsList className="grid w-full max-w-[300px] grid-cols-2">
                <TabsTrigger value="ar" className="gap-2 rtl:flex-row-reverse">
                  <Globe className="h-4 w-4" />
                  العربية
                </TabsTrigger>
                <TabsTrigger value="en" className="gap-2">
                  <Globe className="h-4 w-4" />
                  English
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        {/* Email Preview in iframe */}
        <div className="flex-1 overflow-hidden rounded-lg border border-border/50 bg-muted/20 mt-4">
          <div className="h-full overflow-auto">
            <iframe
              srcDoc={htmlContent}
              title="Email Preview"
              className="w-full min-h-[600px] border-0"
              style={{ backgroundColor: '#FAF6F1' }}
            />
          </div>
        </div>

        {/* Footer note */}
        <div className="flex-shrink-0 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            {isAdminArabic 
              ? 'هذه معاينة لكيفية ظهور البريد الإلكتروني للعميل. يتم استخدام بيانات نموذجية.' 
              : 'This is a preview of how the email will appear to customers. Sample data is used.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailPreviewDialog;
