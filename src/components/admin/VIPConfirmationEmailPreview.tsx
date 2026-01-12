import { useState, useMemo } from 'react';
import { Eye, Globe } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';

interface VIPPerk {
  id: string;
  en: string;
  ar: string;
}

interface VIPConfirmationEmailPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  perks: VIPPerk[];
  guestCount: number;
}

// Perk icons as emoji for email compatibility
const perkEmojis: Record<string, string> = {
  private_tour: "🏛️",
  photography: "📸",
  dinner: "🍽️",
  vip_seating: "🎭",
  special_gift: "🎁",
};

const generateVIPConfirmationPreview = (
  perks: VIPPerk[],
  guestCount: number,
  isArabic: boolean
) => {
  const direction = isArabic ? "rtl" : "ltr";
  const textAlign = isArabic ? "right" : "left";

  const translations = {
    title: isArabic ? "تأكيد دعوتك الخاصة" : "Your VIP Invitation Confirmed",
    greeting: isArabic ? "أهلاً عبدالرحمن المفيجر،" : "Welcome Abdulrahman Almufaijer,",
    thankYou: isArabic 
      ? "يسعدنا تأكيد حضوركم الكريم في سوق المفيجر. نتشرف باستضافتكم في تجربة استثنائية تعكس أصالة التراث السعودي."
      : "We are delighted to confirm your distinguished presence at Souq Almufaijer. It is our honor to host you for an exceptional experience reflecting authentic Saudi heritage.",
    eventDetails: isArabic ? "تفاصيل الفعالية" : "Event Details",
    date: isArabic ? "التاريخ" : "Date",
    guests: isArabic ? "عدد الضيوف" : "Number of Guests",
    validAllDay: isArabic ? "صالحة طوال اليوم" : "Valid All Day",
    operatingHours: isArabic ? "(٣ م - ١٢ ص منتصف الليل)" : "(3 PM - 12 AM Midnight)",
    yourPerks: isArabic ? "امتيازاتكم الخاصة" : "Your VIP Privileges",
    entryTicket: isArabic ? "تذكرة الدخول الخاصة" : "Your VIP Entry Pass",
    scanInstructions: isArabic 
      ? "قم بإظهار هذا الرمز عند البوابة الرئيسية"
      : "Present this code at the main entrance",
    
    seeYouSoon: isArabic ? "نتطلع لاستقبالكم!" : "We look forward to welcoming you!",
    address: isArabic ? "سوق المفيجر، المملكة العربية السعودية" : "Souq Almufaijer, Kingdom of Saudi Arabia",
    questions: isArabic 
      ? "للاستفسارات، تواصلوا معنا على"
      : "For inquiries, contact us at",
  };

  // Sample date
  const sampleDate = isArabic ? "الجمعة، ٢٥ يناير ٢٠٢٦" : "Friday, January 25, 2026";

  // Generate perks HTML
  let perksHtml = "";
  if (perks && perks.length > 0) {
    const perkItems = perks.map((perk) => {
      const emoji = perkEmojis[perk.id] || "✨";
      const label = isArabic ? perk.ar : perk.en;
      
      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid rgba(201, 169, 98, 0.2);">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="40" style="vertical-align: top;">
                  <span style="font-size: 20px;">${emoji}</span>
                </td>
                <td style="text-align: ${textAlign}; vertical-align: middle;">
                  <span style="color: #F5F1E8; font-size: 14px; font-family: Arial, sans-serif;">${label}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    }).join("");

    perksHtml = `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
        <tr>
          <td style="padding-bottom: 12px;">
            <h3 style="color: #C9A962; margin: 0; font-size: 16px; font-weight: 700; font-family: Arial, sans-serif; text-align: ${textAlign};">
              ✨ ${translations.yourPerks}
            </h3>
          </td>
        </tr>
        <tr>
          <td>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #4A3625; border-radius: 12px; border: 2px solid #C9A962;">
              ${perkItems}
            </table>
          </td>
        </tr>
      </table>`;
  }

  // QR code section with placeholder
  const qrHtml = `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="padding-bottom: 12px;">
          <h3 style="color: #3D2E1F; margin: 0; font-size: 16px; font-weight: 700; font-family: Arial, sans-serif; text-align: ${textAlign};">
            🎫 ${translations.entryTicket}
          </h3>
        </td>
      </tr>
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" border="0" width="300" style="background: linear-gradient(135deg, #FAF7F2 0%, #F5F1E8 100%); border-radius: 20px; border: 3px solid #C9A962; box-shadow: 0 8px 24px rgba(74, 54, 37, 0.15);">
            <tr>
              <td align="center" style="padding: 24px 20px 16px 20px;">
                <span style="display: inline-block; background: linear-gradient(135deg, #C9A962 0%, #E8D5A3 50%, #C9A962 100%); color: #4A3625; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 700; font-family: Arial, sans-serif; letter-spacing: 2px; text-transform: uppercase;">
                  VIP GUEST
                </span>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 24px 16px 24px;">
                <div style="width: 200px; height: 200px; background: #f0f0f0; border: 4px solid #C9A962; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                  <svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="150" height="150" fill="#E5E5E5"/>
                    <rect x="15" y="15" width="30" height="30" fill="#333"/>
                    <rect x="15" y="105" width="30" height="30" fill="#333"/>
                    <rect x="105" y="15" width="30" height="30" fill="#333"/>
                    <rect x="60" y="60" width="30" height="30" fill="#333"/>
                    <rect x="45" y="45" width="15" height="15" fill="#333"/>
                    <rect x="90" y="45" width="15" height="15" fill="#333"/>
                    <rect x="45" y="90" width="15" height="15" fill="#333"/>
                    <rect x="90" y="90" width="15" height="15" fill="#333"/>
                    <rect x="105" y="105" width="30" height="30" fill="#333"/>
                  </svg>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 20px 8px 20px;">
                <span style="display: inline-block; background-color: #4A3625; color: #F5F1E8; padding: 6px 16px; border-radius: 12px; font-size: 12px; font-weight: 600; font-family: Arial, sans-serif;">
                  ${guestCount} ${isArabic ? "ضيف" : "Guest(s)"}
                </span>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 20px 16px 20px; font-family: monospace; font-size: 12px; color: #4A3625; letter-spacing: 2px; font-weight: 700;">
                VIP-SAMPLE-2026
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 20px 20px 20px;">
                <p style="color: #8B6F47; margin: 0; font-size: 11px; font-family: Arial, sans-serif;">
                  📱 ${translations.scanInstructions}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

  return `<!DOCTYPE html>
<html lang="${isArabic ? "ar" : "en"}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <meta name="x-apple-disable-message-reformatting">
  <title>${translations.title}</title>
  <style>
    :root { color-scheme: light only; }
    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #4A3625 !important; }
      .email-content { background-color: #4A3625 !important; }
    }
    [data-ogsc] .email-body { background-color: #4A3625 !important; }
    [data-ogsc] .email-content { background-color: #4A3625 !important; }
    [data-ogsb] .email-body { background-color: #4A3625 !important; }
    [data-ogsb] .email-content { background-color: #4A3625 !important; }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; background-color: #4A3625 !important; font-family: Arial, sans-serif; direction: ${direction}; -webkit-text-fill-color: inherit;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #4A3625 !important;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px;">
          
          <!-- Premium VIP Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #4A3625 0%, #3D2E1F 50%, #4A3625 100%) !important; padding: 40px 24px; border-radius: 20px 20px 0 0; position: relative;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <span style="display: inline-block; background: linear-gradient(135deg, #C9A962 0%, #E8D5A3 50%, #C9A962 100%) !important; color: #4A3625 !important; padding: 6px 24px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: Arial, sans-serif; letter-spacing: 3px; text-transform: uppercase;">
                      VIP INVITATION
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 16px 0 4px 0;">
                    <h1 style="color: #C9A962 !important; font-size: 32px; margin: 0; font-weight: 700; font-family: 'Times New Roman', serif;">سوق المفيجر</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <p style="color: #D4C5B0 !important; font-size: 11px; margin: 0; letter-spacing: 4px; text-transform: uppercase; font-family: Arial, sans-serif;">SOUQ ALMUFAIJER</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <div style="width: 80px; height: 2px; background: linear-gradient(90deg, transparent 0%, #C9A962 30%, #E8D5A3 50%, #C9A962 70%, transparent 100%); margin: 0 auto;"></div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="color: #F5F1E8 !important; margin: 0; font-size: 15px; font-weight: 600; letter-spacing: 1px; font-family: Arial, sans-serif;">
                      ✓ ${isArabic ? "تم تأكيد الحضور" : "ATTENDANCE CONFIRMED"}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td class="email-content" style="background-color: #4A3625 !important; padding: 32px 24px; border-radius: 0 0 20px 20px;">
              
              <!-- Greeting -->
              <h2 style="color: #F5F1E8 !important; margin: 0 0 12px; font-size: 22px; font-weight: 700; font-family: Arial, sans-serif; text-align: ${textAlign};">${translations.greeting}</h2>
              <p style="color: #D4C5B0 !important; margin: 0 0 24px; line-height: 1.7; font-size: 15px; font-family: Arial, sans-serif; text-align: ${textAlign};">${translations.thankYou}</p>
              
              
              <!-- Event Details Card -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <h3 style="color: #C9A962 !important; margin: 0; font-size: 16px; font-weight: 700; font-family: Arial, sans-serif; text-align: ${textAlign};">
                      📅 ${translations.eventDetails}
                    </h3>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #3D2E1F !important; border-radius: 12px; border: 1px solid #C9A962;">
                      <tr>
                        <td width="50%" style="padding: 16px; vertical-align: top; border-${isArabic ? "left" : "right"}: 1px solid #C9A962;">
                          <p style="color: #C9A962 !important; margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; font-family: Arial, sans-serif;">${translations.date}</p>
                          <p style="color: #F5F1E8 !important; margin: 0; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">${sampleDate}</p>
                        </td>
                        <td width="50%" style="padding: 16px; vertical-align: top;">
                          <p style="color: #C9A962 !important; margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; font-family: Arial, sans-serif;">${translations.guests}</p>
                          <p style="color: #F5F1E8 !important; margin: 0; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif;">${guestCount} ${isArabic ? "شخص" : "person(s)"}</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 12px 16px; background-color: #C9A962 !important; border-radius: 0 0 12px 12px;">
                          <p style="color: #3D2E1F !important; margin: 0; font-size: 13px; font-weight: 600; font-family: Arial, sans-serif; text-align: center;">
                            ☀️ ${translations.validAllDay} ${translations.operatingHours}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- VIP Perks -->
              ${perksHtml}
              
              <!-- QR Code -->
              ${qrHtml}
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 16px;">
              <a href="https://maps.app.goo.gl/g4qJ4mM9ZVqg323t8" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #8B7355 0%, #6B5A45 100%); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; font-family: Arial, sans-serif; margin-bottom: 16px;">
                📍 ${isArabic ? "احصل على الاتجاهات" : "Get Directions"}
              </a>
              <p style="color: #5C4A3A; margin: 0 0 6px; font-size: 13px; font-weight: 600; font-family: Arial, sans-serif;">${translations.address}</p>
              <p style="color: #8B7355; margin: 0 0 8px; font-size: 11px; font-family: Arial, sans-serif;">
                © ${new Date().getFullYear()} Souq Almufaijer. ${isArabic ? "جميع الحقوق محفوظة" : "All rights reserved"}.
              </p>
              <a href="https://ayn-ai.com" target="_blank" style="color: #8B7355; margin: 0; font-size: 10px; font-family: Arial, sans-serif; text-decoration: none;">
                Powered by <span style="font-weight: 600; color: #3D2E1F;">AYN AI</span>
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const VIPConfirmationEmailPreview = ({ open, onOpenChange, perks, guestCount }: VIPConfirmationEmailPreviewProps) => {
  const { currentLanguage, isRTL } = useLanguage();
  const isAdminArabic = currentLanguage === 'ar';
  const [previewLang, setPreviewLang] = useState<'ar' | 'en'>('ar');

  const htmlContent = useMemo(() => {
    return generateVIPConfirmationPreview(perks, guestCount, previewLang === 'ar');
  }, [previewLang, perks, guestCount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-hidden flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}>
        <DialogHeader className="flex-shrink-0 border-b border-border/50 pb-4">
          <div className="flex items-center justify-between rtl:flex-row-reverse">
            <DialogTitle className="flex items-center gap-2 text-lg rtl:flex-row-reverse">
              <Eye className="h-5 w-5 text-amber-600" />
              {isAdminArabic ? 'معاينة بريد التأكيد VIP' : 'VIP Confirmation Email Preview'}
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
              title="VIP Email Preview"
              className="w-full min-h-[600px] border-0"
              style={{ backgroundColor: '#F5F1EB' }}
            />
          </div>
        </div>

        {/* Footer note */}
        <div className="flex-shrink-0 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            {isAdminArabic 
              ? 'هذه معاينة لبريد التأكيد الذي سيُرسل للضيف عند تأكيد حضوره من صفحة RSVP. يتم استخدام بيانات نموذجية.' 
              : 'This is a preview of the confirmation email sent to VIP guests after they confirm via the RSVP page. Sample data is used.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VIPConfirmationEmailPreview;
