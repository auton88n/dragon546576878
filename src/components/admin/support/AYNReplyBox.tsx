import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Headset } from 'lucide-react';

type TextDir = 'rtl' | 'ltr';

interface AYNReplyBoxProps {
  title: string;
  newReplyLabel?: string;
  showNewReplyBadge?: boolean;
  reply: string | null;
  awaitingLabel: string;
  dir: TextDir;
}

// Clean up raw reply content - remove timestamps, email headers, and format nicely
function cleanReplyContent(raw: string | null): string {
  if (!raw) return '';
  
  return raw
    // Remove ISO timestamps like [2026-02-02T22:56:02.818Z]
    .replace(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/g, '')
    // Remove "From: email@example.com" lines
    .replace(/^From:\s*\S+@\S+\s*$/gm, '')
    // Remove separator lines
    .replace(/^---$/gm, '')
    // Remove "No content" placeholder
    .replace(/^No content$/gm, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function AYNReplyBox({
  title,
  newReplyLabel,
  showNewReplyBadge,
  reply,
  awaitingLabel,
  dir,
}: AYNReplyBoxProps) {
  const cleanedReply = cleanReplyContent(reply);
  const hasReply = Boolean(cleanedReply);

  return (
    <div
      className={
        hasReply
          ? 'rounded-xl border border-primary/30 bg-primary/5 p-4'
          : 'rounded-xl border border-dashed border-border bg-muted/20 p-4'
      }
    >
      <div className="flex items-center gap-2">
        <Headset className="h-4 w-4 text-primary" />
        <Label className="text-sm font-medium text-primary">{title}</Label>
        {showNewReplyBadge && newReplyLabel ? (
          <Badge variant="outline" className="text-xs">
            {newReplyLabel}
          </Badge>
        ) : null}
      </div>

      <div className="mt-3" dir={dir}>
        {hasReply ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {cleanedReply}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">{awaitingLabel}</p>
        )}
      </div>
    </div>
  );
}
