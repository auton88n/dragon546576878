-- Grant execute permission on VIP RPC functions to anon and authenticated roles
-- This ensures VIP guests can access their invitations without authentication

GRANT EXECUTE ON FUNCTION public.get_vip_invitation_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_vip_invitation_by_token(text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_vip_rsvp(text, text, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_vip_rsvp(text, text, integer, text) TO authenticated;