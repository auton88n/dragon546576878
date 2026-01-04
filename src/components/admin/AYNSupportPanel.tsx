import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSupportTickets, CreateTicketData } from '@/hooks/useSupportTickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Send, Headset, Clock, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';

const categories = [
  { value: 'bug', labelKey: 'admin.support.categories.bug' },
  { value: 'feature', labelKey: 'admin.support.categories.feature' },
  { value: 'question', labelKey: 'admin.support.categories.question' },
  { value: 'other', labelKey: 'admin.support.categories.other' },
];

const priorities = [
  { value: 'low', labelKey: 'admin.support.priorities.low', color: 'bg-green-500' },
  { value: 'medium', labelKey: 'admin.support.priorities.medium', color: 'bg-amber-500' },
  { value: 'high', labelKey: 'admin.support.priorities.high', color: 'bg-red-500' },
  { value: 'critical', labelKey: 'admin.support.priorities.critical', color: 'bg-red-700' },
];

const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
  pending: { icon: Clock, color: 'bg-amber-500' },
  in_progress: { icon: AlertCircle, color: 'bg-blue-500' },
  resolved: { icon: CheckCircle2, color: 'bg-green-500' },
  closed: { icon: HelpCircle, color: 'bg-gray-500' },
};

export default function AYNSupportPanel() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { tickets, loading, submitting, createTicket } = useSupportTickets();

  const [formData, setFormData] = useState<CreateTicketData>({
    subject: '',
    category: 'bug',
    priority: 'medium',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createTicket(formData);
    if (success) {
      setFormData({
        subject: '',
        category: 'bug',
        priority: 'medium',
        description: '',
      });
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = priorities.find(p => p.value === priority);
    return (
      <Badge className={`${config?.color || 'bg-gray-500'} text-white`}>
        {t(config?.labelKey || 'admin.support.priorities.medium')}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.pending;
    const StatusIcon = config.icon;
    return (
      <Badge className={`${config.color} text-white gap-1`}>
        <StatusIcon className="h-3 w-3" />
        {t(`admin.support.statuses.${status}`)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-primary/10">
          <Headset className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{t('admin.support.title')}</h2>
          <p className="text-muted-foreground">{t('admin.support.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Submit Ticket Form */}
        <Card className="glass-card-gold">
          <CardHeader>
            <CardTitle>{t('admin.support.newTicket')}</CardTitle>
            <CardDescription>{t('admin.support.newTicketDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">{t('admin.support.subject')}</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder={t('admin.support.subjectPlaceholder')}
                  required
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('admin.support.category')}</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {t(cat.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('admin.support.priority')}</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((pri) => (
                        <SelectItem key={pri.value} value={pri.value}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${pri.color}`} />
                            {t(pri.labelKey)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('admin.support.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('admin.support.descriptionPlaceholder')}
                  required
                  rows={6}
                  minLength={50}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                <p className="text-xs text-muted-foreground">
                  {t('admin.support.minChars', { count: 50 })}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitting || formData.description.length < 50}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 me-2" />
                    {t('admin.support.submit')}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Ticket History */}
        <Card className="glass-card-gold">
          <CardHeader>
            <CardTitle>{t('admin.support.history')}</CardTitle>
            <CardDescription>
              {t('admin.support.historyDesc', { count: tickets.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('admin.support.noTickets')}
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {tickets.map((ticket) => (
                  <AccordionItem
                    key={ticket.id}
                    value={ticket.id}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex flex-col items-start gap-2 text-start">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                          <span className="text-xs text-muted-foreground">
                            #{ticket.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium">{ticket.subject}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            {t('admin.support.category')}
                          </Label>
                          <p>{t(`admin.support.categories.${ticket.category}`)}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            {t('admin.support.description')}
                          </Label>
                          <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
                        </div>
                        {ticket.ayn_notes && (
                          <div className="bg-primary/5 p-3 rounded-lg">
                            <Label className="text-xs text-muted-foreground">
                              {t('admin.support.aynResponse')}
                            </Label>
                            <p className="whitespace-pre-wrap text-sm">{ticket.ayn_notes}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(ticket.created_at), 'PPp')}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
