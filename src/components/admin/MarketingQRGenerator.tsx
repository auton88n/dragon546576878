import { useState, useRef, useEffect } from 'react';
import { QrCode, Download, Palette, Languages, Target, Megaphone, TrendingUp, BarChart3, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { useLanguage } from '@/hooks/useLanguage';
import { useMarketingAnalytics } from '@/hooks/useMarketingAnalytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import logoWhite from '@/assets/logo-white.png';
import logoBlack from '@/assets/logo-black.png';

interface QRConfig {
  destination: 'home' | 'book' | 'contact';
  campaignName: string;
  language: 'ar' | 'en' | 'both';
  theme: 'heritage' | 'dark' | 'light';
  ctaPreset: string;
  customCtaAr: string;
  customCtaEn: string;
}

const CTA_PRESETS = [
  { id: 'visit', ar: 'زُرنا الآن', en: 'Visit Us Now' },
  { id: 'book', ar: 'احجز تجربتك', en: 'Book Your Experience' },
  { id: 'scan', ar: 'امسح للحجز', en: 'Scan to Reserve' },
  { id: 'discover', ar: 'اكتشف التراث', en: 'Discover Heritage' },
  { id: 'custom', ar: '', en: '' },
];

const DESTINATIONS = [
  { id: 'home', labelEn: 'Homepage', labelAr: 'الصفحة الرئيسية' },
  { id: 'book', labelEn: 'Booking Page', labelAr: 'صفحة الحجز' },
  { id: 'contact', labelEn: 'Contact Page', labelAr: 'صفحة التواصل' },
];

const THEMES = [
  { id: 'heritage', labelEn: 'Heritage Gold', labelAr: 'ذهبي تراثي', bg: 'bg-gradient-to-b from-[#F5F1E8] to-[#E8E0D0]', accent: '#C9A962', text: '#4A3625', useDarkLogo: true },
  { id: 'dark', labelEn: 'Dark Elegance', labelAr: 'أناقة داكنة', bg: 'bg-gradient-to-b from-[#2C2416] to-[#1a1610]', accent: '#C9A962', text: '#F5F1E8', useDarkLogo: false },
  { id: 'light', labelEn: 'Light Clean', labelAr: 'فاتح نظيف', bg: 'bg-white', accent: '#8B6F47', text: '#2C2416', useDarkLogo: true },
];

const MarketingQRGenerator = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useMarketingAnalytics();
  
  const [config, setConfig] = useState<QRConfig>({
    destination: 'book',
    campaignName: '',
    language: 'both',
    theme: 'heritage',
    ctaPreset: 'visit',
    customCtaAr: '',
    customCtaEn: '',
  });
  
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Generate QR code when config changes
  useEffect(() => {
    generateQR();
  }, [config.destination, config.campaignName]);

  const generateQR = async () => {
    const campaignId = config.campaignName.trim() 
      ? config.campaignName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : `campaign-${Date.now()}`;
    
    const trackingUrl = `https://hekgkfdunwpxqbrotfpn.supabase.co/functions/v1/track-marketing-qr/${campaignId}?to=${config.destination}&name=${encodeURIComponent(config.campaignName || campaignId)}`;
    
    try {
      const dataUrl = await QRCode.toDataURL(trackingUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  const getCurrentCTA = () => {
    if (config.ctaPreset === 'custom') {
      return {
        ar: config.customCtaAr || 'زُرنا الآن',
        en: config.customCtaEn || 'Visit Us Now',
      };
    }
    const preset = CTA_PRESETS.find(p => p.id === config.ctaPreset);
    return preset || CTA_PRESETS[0];
  };

  const getTheme = () => THEMES.find(t => t.id === config.theme) || THEMES[0];

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 3, // High resolution for print
      });
      
      const link = document.createElement('a');
      link.download = `qr-${config.campaignName || 'marketing'}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const theme = getTheme();
  const cta = getCurrentCTA();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="w-full justify-start gap-1 bg-accent/5 p-1 rounded-xl mb-6">
          <TabsTrigger value="generator" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background rounded-lg">
            <QrCode className="h-4 w-4" />
            <span>{isArabic ? 'منشئ QR' : 'QR Generator'}</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background rounded-lg">
            <BarChart3 className="h-4 w-4" />
            <span>{isArabic ? 'الإحصائيات' : 'Analytics'}</span>
          </TabsTrigger>
        </TabsList>

        {/* QR Generator Tab */}
        <TabsContent value="generator" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration Panel */}
            <div className="space-y-6">
              {/* Campaign Name */}
              <Card className="glass-card border-accent/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base rtl:flex-row-reverse rtl:justify-end">
                    <Megaphone className="h-4 w-4 text-accent" />
                    {isArabic ? 'اسم الحملة' : 'Campaign Name'}
                  </CardTitle>
                  <CardDescription className="text-start rtl:text-right">
                    {isArabic ? 'اسم لتتبع هذه الحملة التسويقية' : 'Name to track this marketing campaign'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    placeholder={isArabic ? 'مثال: فلاير يناير 2026' : 'e.g., January Flyer 2026'}
                    value={config.campaignName}
                    onChange={(e) => setConfig({ ...config, campaignName: e.target.value })}
                    className="bg-background/50"
                  />
                </CardContent>
              </Card>

              {/* Destination */}
              <Card className="glass-card border-accent/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base rtl:flex-row-reverse rtl:justify-end">
                    <Target className="h-4 w-4 text-accent" />
                    {isArabic ? 'الوجهة' : 'Destination'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={config.destination}
                    onValueChange={(v) => setConfig({ ...config, destination: v as QRConfig['destination'] })}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    {DESTINATIONS.map((dest) => (
                      <div key={dest.id}>
                        <RadioGroupItem value={dest.id} id={`dest-${dest.id}`} className="peer sr-only" />
                        <Label
                          htmlFor={`dest-${dest.id}`}
                          className="flex items-center justify-center p-3 border rounded-lg cursor-pointer hover:bg-accent/5 peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-accent/10 transition-colors"
                        >
                          {isArabic ? dest.labelAr : dest.labelEn}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Language & Theme */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="glass-card border-accent/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base rtl:flex-row-reverse rtl:justify-end">
                      <Languages className="h-4 w-4 text-accent" />
                      {isArabic ? 'اللغة' : 'Language'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={config.language} onValueChange={(v) => setConfig({ ...config, language: v as QRConfig['language'] })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">{isArabic ? 'ثنائي اللغة' : 'Bilingual'}</SelectItem>
                        <SelectItem value="ar">{isArabic ? 'عربي فقط' : 'Arabic Only'}</SelectItem>
                        <SelectItem value="en">{isArabic ? 'إنجليزي فقط' : 'English Only'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <Card className="glass-card border-accent/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base rtl:flex-row-reverse rtl:justify-end">
                      <Palette className="h-4 w-4 text-accent" />
                      {isArabic ? 'السمة' : 'Theme'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={config.theme} onValueChange={(v) => setConfig({ ...config, theme: v as QRConfig['theme'] })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THEMES.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {isArabic ? t.labelAr : t.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </div>

              {/* Call to Action */}
              <Card className="glass-card border-accent/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base rtl:flex-row-reverse rtl:justify-end">
                    <Megaphone className="h-4 w-4 text-accent" />
                    {isArabic ? 'نص الدعوة للعمل' : 'Call to Action'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={config.ctaPreset} onValueChange={(v) => setConfig({ ...config, ctaPreset: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CTA_PRESETS.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.id === 'custom' 
                            ? (isArabic ? 'نص مخصص' : 'Custom Text')
                            : `${preset.ar} / ${preset.en}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {config.ctaPreset === 'custom' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>{isArabic ? 'النص العربي' : 'Arabic Text'}</Label>
                        <Input
                          value={config.customCtaAr}
                          onChange={(e) => setConfig({ ...config, customCtaAr: e.target.value })}
                          placeholder="زُرنا الآن"
                          dir="rtl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{isArabic ? 'النص الإنجليزي' : 'English Text'}</Label>
                        <Input
                          value={config.customCtaEn}
                          onChange={(e) => setConfig({ ...config, customCtaEn: e.target.value })}
                          placeholder="Visit Us Now"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="space-y-4">
              <Card className="glass-card border-accent/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base rtl:flex-row-reverse rtl:justify-end">
                    <QrCode className="h-4 w-4 text-accent" />
                    {isArabic ? 'معاينة' : 'Preview'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* QR Card Preview */}
                  <div className="flex justify-center">
                    <div
                      ref={cardRef}
                      className={`w-[320px] rounded-2xl p-8 ${theme.bg} shadow-xl`}
                      style={{ color: theme.text }}
                    >
                      {/* Logo */}
                      <div className="flex justify-center mb-6">
                        <img 
                          src={theme.useDarkLogo ? logoBlack : logoWhite} 
                          alt="Souq Almufaijer" 
                          className="h-12 object-contain"
                        />
                      </div>

                      {/* Decorative Line */}
                      <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="h-px flex-1" style={{ backgroundColor: theme.accent }} />
                        <div className="w-2 h-2 rotate-45" style={{ backgroundColor: theme.accent }} />
                        <div className="h-px flex-1" style={{ backgroundColor: theme.accent }} />
                      </div>

                      {/* CTA Text */}
                      <div className="text-center mb-6 space-y-1">
                        {(config.language === 'ar' || config.language === 'both') && (
                          <p className="text-xl font-bold" style={{ fontFamily: 'Cairo, sans-serif' }} dir="rtl">
                            {cta.ar}
                          </p>
                        )}
                        {(config.language === 'en' || config.language === 'both') && (
                          <p className="text-lg font-semibold tracking-wide">
                            {cta.en}
                          </p>
                        )}
                      </div>

                      {/* QR Code */}
                      <div className="flex justify-center mb-6">
                        <div className="p-3 bg-white rounded-xl shadow-lg">
                          {qrDataUrl ? (
                            <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
                          ) : (
                            <div className="w-40 h-40 bg-muted animate-pulse rounded" />
                          )}
                        </div>
                      </div>

                      {/* Scan instruction */}
                      <div className="text-center space-y-1">
                        {(config.language === 'ar' || config.language === 'both') && (
                          <p className="text-sm opacity-80" dir="rtl">📱 امسح للحجز فوراً</p>
                        )}
                        {(config.language === 'en' || config.language === 'both') && (
                          <p className="text-xs opacity-70">Scan to Reserve Now</p>
                        )}
                      </div>

                      {/* Website */}
                      <div className="text-center mt-4">
                        <p className="text-sm font-medium" style={{ color: theme.accent }}>
                          almufaijer.com
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Download Button */}
              <Button 
                onClick={handleDownload} 
                disabled={generating}
                className="w-full gap-2"
                size="lg"
              >
                {generating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isArabic ? 'تحميل PNG (جاهز للطباعة)' : 'Download PNG (Print Ready)'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 mt-0">
          {analyticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 bg-accent/10" />
              ))}
            </div>
          ) : analytics ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="glass-card border-accent/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between rtl:flex-row-reverse">
                      <div className="text-start rtl:text-right">
                        <p className="text-sm text-muted-foreground">
                          {isArabic ? 'إجمالي المسحات' : 'Total Scans'}
                        </p>
                        <p className="text-3xl font-bold text-foreground">{analytics.totalScans.toLocaleString()}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                        <QrCode className="h-6 w-6 text-accent" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-accent/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between rtl:flex-row-reverse">
                      <div className="text-start rtl:text-right">
                        <p className="text-sm text-muted-foreground">
                          {isArabic ? 'هذا الأسبوع' : 'This Week'}
                        </p>
                        <p className="text-3xl font-bold text-foreground">{analytics.thisWeekScans}</p>
                      </div>
                      <Badge variant={analytics.weeklyChange >= 0 ? 'default' : 'secondary'} className="gap-1">
                        <TrendingUp className={`h-3 w-3 ${analytics.weeklyChange < 0 ? 'rotate-180' : ''}`} />
                        {analytics.weeklyChange >= 0 ? '+' : ''}{analytics.weeklyChange}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-accent/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between rtl:flex-row-reverse">
                      <div className="text-start rtl:text-right">
                        <p className="text-sm text-muted-foreground">
                          {isArabic ? 'الأسبوع الماضي' : 'Last Week'}
                        </p>
                        <p className="text-3xl font-bold text-foreground">{analytics.lastWeekScans}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Campaign Performance */}
              <Card className="glass-card border-accent/20">
                <CardHeader>
                  <div className="flex items-center justify-between rtl:flex-row-reverse">
                    <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                      <Megaphone className="h-5 w-5 text-accent" />
                      {isArabic ? 'أداء الحملات' : 'Campaign Performance'}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => refetchAnalytics()}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {analytics.campaignStats.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {isArabic ? 'لا توجد بيانات بعد' : 'No data yet'}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {analytics.campaignStats.map((campaign, idx) => (
                        <div key={campaign.campaign_id} className="flex items-center gap-4 rtl:flex-row-reverse">
                          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                            {idx + 1}
                          </div>
                          <div className="flex-1 text-start rtl:text-right">
                            <p className="font-medium">{campaign.campaign_name}</p>
                            <p className="text-sm text-muted-foreground">{campaign.campaign_id}</p>
                          </div>
                          <Badge variant="secondary" className="text-base">
                            {campaign.scan_count.toLocaleString()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Destination Breakdown */}
              <Card className="glass-card border-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse rtl:justify-end">
                    <Target className="h-5 w-5 text-accent" />
                    {isArabic ? 'توزيع الوجهات' : 'Destination Breakdown'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics.destinationStats.map((dest) => {
                    const destInfo = DESTINATIONS.find(d => d.id === dest.destination);
                    return (
                      <div key={dest.destination} className="space-y-2">
                        <div className="flex items-center justify-between rtl:flex-row-reverse">
                          <span className="text-sm font-medium">
                            {isArabic ? destInfo?.labelAr : destInfo?.labelEn || dest.destination}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {dest.percentage}% ({dest.count})
                          </span>
                        </div>
                        <Progress value={dest.percentage} className="h-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {isArabic ? 'فشل تحميل الإحصائيات' : 'Failed to load analytics'}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingQRGenerator;
