import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { CheckCircle, XCircle, Calendar, Clock, MapPin, Gift, Camera, Utensils, Users, Play } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

// Perk can be a string ID or a full object with translations
type PerkData = string | { id: string; en: string; ar: string };

interface VIPInvitation {
  id: string;
  contact_id: string;
  rsvp_token: string;
  guest_allowance: number;
  perks: PerkData[];
  include_video: boolean;
  event_date: string | null;
  event_time: string | null;
  offer_details_en: string | null;
  offer_details_ar: string | null;
  confirmed_at: string | null;
  confirmed_guests: number | null;
  declined_at: string | null;
  decline_reason: string | null;
}

interface VIPContact {
  id: string;
  name_en: string;
  name_ar: string;
  preferred_language: 'ar' | 'en';
}

const perkIcons: Record<string, React.ReactNode> = {
  private_tour: <MapPin className="h-5 w-5" />,
  photography: <Camera className="h-5 w-5" />,
  dinner: <Utensils className="h-5 w-5" />,
  vip_seating: <Users className="h-5 w-5" />,
  special_gift: <Gift className="h-5 w-5" />,
};

const perkLabels: Record<string, { en: string; ar: string }> = {
  private_tour: { en: 'Private guided tour', ar: 'جولة خاصة مع مرشد' },
  photography: { en: 'Professional photography session', ar: 'جلسة تصوير احترافية' },
  dinner: { en: 'Traditional Saudi hospitality dinner', ar: 'عشاء ضيافة سعودية تقليدية' },
  vip_seating: { en: 'VIP seating at cultural performances', ar: 'مقاعد VIP في العروض الثقافية' },
  special_gift: { en: 'Special gift from Souq Almufaijer', ar: 'هدية خاصة من سوق المفيجر' },
};

const VIPRSVPPage = () => {
  const { token } = useParams<{ token: string }>();
  const [invitation, setInvitation] = useState<VIPInvitation | null>(null);
  const [contact, setContact] = useState<VIPContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState<number>(0);
  const [declineReason, setDeclineReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<'accepted' | 'declined' | null>(null);

  const isArabic = contact?.preferred_language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) return;
      
      try {
        // Use secure RPC function to fetch invitation by token
        const { data: rawResult, error: rpcError } = await supabase
          .rpc('get_vip_invitation_by_token', { token });
        
        if (rpcError || !rawResult) {
          setError('Invitation not found');
          setLoading(false);
          return;
        }

        // Cast the result to the expected shape
        const result = rawResult as unknown as {
          id: string;
          contact_id: string;
          guest_allowance: number;
          perks: string[];
          include_video: boolean;
          event_date: string | null;
          event_time: string | null;
          offer_details_en: string | null;
          offer_details_ar: string | null;
          confirmed_at: string | null;
          confirmed_guests: number | null;
          declined_at: string | null;
          decline_reason: string | null;
          contact: { name_en: string; name_ar: string; preferred_language: string } | null;
        };

        // Parse the invitation data from RPC result
        const invData: VIPInvitation = {
          id: result.id,
          contact_id: result.contact_id,
          rsvp_token: token,
          guest_allowance: result.guest_allowance || 2,
          perks: result.perks || [],
          include_video: result.include_video ?? true,
          event_date: result.event_date,
          event_time: result.event_time,
          offer_details_en: result.offer_details_en,
          offer_details_ar: result.offer_details_ar,
          confirmed_at: result.confirmed_at,
          confirmed_guests: result.confirmed_guests,
          declined_at: result.declined_at,
          decline_reason: result.decline_reason,
        };

        setInvitation(invData);

        // Contact data is included in the RPC response
        if (result.contact) {
          setContact({
            id: result.contact_id,
            name_en: result.contact.name_en,
            name_ar: result.contact.name_ar,
            preferred_language: (result.contact.preferred_language || 'ar') as 'ar' | 'en',
          });
        }

        if (invData.confirmed_at) setSubmitted('accepted');
        if (invData.declined_at) setSubmitted('declined');
        
      } catch (err) {
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!invitation) return;
    setSubmitting(true);

    try {
      // Use secure RPC function to update RSVP
      const { data, error } = await supabase.rpc('update_vip_rsvp', {
        p_token: token,
        p_status: 'confirmed',
        p_guests: guestCount || 1,
      });

      if (error) {
        console.error('RSVP update error:', error);
        return;
      }

      setSubmitted('accepted');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation) return;
    setSubmitting(true);

    try {
      // Use secure RPC function to update RSVP
      const { data, error } = await supabase.rpc('update_vip_rsvp', {
        p_token: token,
        p_status: 'declined',
        p_decline_reason: declineReason || null,
      });

      if (error) {
        console.error('RSVP decline error:', error);
        return;
      }

      setSubmitted('declined');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8] p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
            <h1 className="text-xl font-bold text-gray-800">{error || 'Invitation not found'}</h1>
          </CardContent>
        </Card>
      </div>
    );
  }

  const name = contact ? (isArabic ? contact.name_ar : contact.name_en) : '';
  const perks = Array.isArray(invitation.perks) ? invitation.perks : [];

  return (
    <div className="min-h-screen bg-[#F5F1E8] py-8 px-4" dir={dir}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center bg-gradient-to-br from-[#8B6F47] to-[#5C4A32] rounded-2xl p-8 text-white shadow-xl">
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-[#C9A962] via-[#E8D5A3] to-[#C9A962] rounded mb-6" />
          <h1 className="text-3xl font-bold mb-2">{isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}</h1>
          <p className="text-[#F5F1E8] text-lg">{isArabic ? 'دعوة حصرية للشخصيات المميزة' : 'Exclusive VIP Invitation'}</p>
          {name && <p className="mt-4 text-xl">{isArabic ? `أهلاً ${name}` : `Welcome, ${name}`}</p>}
        </div>

        {/* Already Responded */}
        {submitted && (
          <Card className="border-2 border-[#C9A962]">
            <CardContent className="py-12 text-center">
              {submitted === 'accepted' ? (
                <>
                  <CheckCircle className="h-20 w-20 mx-auto text-green-500 mb-4" />
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {isArabic ? 'شكراً لتأكيد حضوركم!' : 'Thank you for confirming!'}
                  </h2>
                  <p className="text-gray-600">
                    {isArabic ? 'نتطلع لاستقبالكم في سوق المفيجر' : 'We look forward to welcoming you at Souq Almufaijer'}
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="h-20 w-20 mx-auto text-gray-400 mb-4" />
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {isArabic ? 'نأسف لعدم تمكنكم من الحضور' : 'We\'re sorry you can\'t attend'}
                  </h2>
                  <p className="text-gray-600">
                    {isArabic ? 'نأمل رؤيتكم في مناسبة قادمة' : 'We hope to see you at a future event'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content - Only show if not submitted */}
        {!submitted && (
          <>
            {/* Video Section */}
            {invitation.include_video && (
              <Card className="overflow-hidden">
                <div className="relative aspect-video bg-[#4A3625]">
                  <video 
                    controls 
                    poster="/images/hero-heritage.webp"
                    className="w-full h-full object-cover"
                  >
                    <source src="https://hekgkfdunwpxqbrotfpn.supabase.co/storage/v1/object/public/videos/souq-almufaijer-video.mp4" type="video/mp4" />
                  </video>
                </div>
                <CardContent className="py-4 text-center">
                  <p className="text-[#5C4A32] font-medium">
                    {isArabic ? 'اكتشف سحر المفيجر' : 'Discover the Magic of Almufaijer'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Event Details */}
            {(invitation.event_date || invitation.event_time) && (
              <Card className="bg-[#4A3625] text-white">
                <CardHeader>
                  <CardTitle className="text-[#C9A962]">
                    {isArabic ? 'تفاصيل الفعالية' : 'Event Details'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {invitation.event_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-[#C9A962]" />
                      <span>{format(new Date(invitation.event_date), 'PPPP', { locale: isArabic ? ar : enUS })}</span>
                    </div>
                  )}
                  {invitation.event_time && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-[#C9A962]" />
                      <span>{invitation.event_time}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* VIP Perks */}
            {perks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#4A3625] flex items-center gap-2">
                    <Gift className="h-5 w-5 text-[#C9A962]" />
                    {isArabic ? 'تجربتكم المميزة تتضمن' : 'Your VIP Experience Includes'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {perks.map((perk) => {
                      // Handle both string IDs (old format) and objects (new format)
                      const perkId = typeof perk === 'object' ? perk.id : perk;
                      const perkLabel = typeof perk === 'object' 
                        ? (isArabic ? perk.ar : perk.en)
                        : (perkLabels[perk]?.[isArabic ? 'ar' : 'en'] || perk);
                      
                      return (
                        <div key={perkId} className="flex items-center gap-3 p-3 bg-[#F5F1E8] rounded-lg">
                          <div className="text-[#C9A962]">{perkIcons[perkId] || <Gift className="h-5 w-5" />}</div>
                          <span className="text-[#5C4A32]">{perkLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Guest Selection */}
            <Card className="border-2 border-[#C9A962]">
              <CardHeader>
                <CardTitle className="text-[#4A3625]">
                  {isArabic ? 'تأكيد الحضور' : 'Confirm Your Attendance'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>{isArabic ? 'عدد المرافقين' : 'Number of Guests'}</Label>
                  <Select value={String(guestCount)} onValueChange={(v) => setGuestCount(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: invitation.guest_allowance + 1 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {i === 0 
                            ? (isArabic ? 'بدون مرافقين' : 'No guests') 
                            : (isArabic ? `${i} مرافقين` : `${i} guest${i > 1 ? 's' : ''}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {isArabic 
                      ? `يمكنكم اصطحاب حتى ${invitation.guest_allowance} ضيوف` 
                      : `You may bring up to ${invitation.guest_allowance} guests`}
                  </p>
                </div>

                <Button 
                  onClick={handleAccept} 
                  disabled={submitting}
                  className="w-full h-14 text-lg bg-gradient-to-r from-[#8B6F47] to-[#5C4A32] hover:from-[#7A6140] hover:to-[#4A3625]"
                >
                  <CheckCircle className="h-5 w-5 me-2" />
                  {isArabic ? 'قبول الدعوة' : 'Accept Invitation'}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">
                      {isArabic ? 'أو' : 'or'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Textarea 
                    placeholder={isArabic ? 'سبب الاعتذار (اختياري)' : 'Reason for declining (optional)'}
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={2}
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleDecline}
                    disabled={submitting}
                    className="w-full"
                  >
                    {isArabic ? 'اعتذار عن الحضور' : 'Unable to Attend'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-[#8B6F47] py-4">
          <p>{isArabic ? 'سوق المفيجر' : 'Souq Almufaijer'}</p>
          <p className="text-xs text-gray-500">
            {isArabic ? 'قرية المفيجر التراثية | الرياض' : 'Almufaijer Heritage Village | Riyadh'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VIPRSVPPage;
