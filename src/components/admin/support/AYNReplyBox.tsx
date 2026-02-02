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

export function AYNReplyBox({
  title,
  newReplyLabel,
  showNewReplyBadge,
  reply,
  awaitingLabel,
  dir,
}: AYNReplyBoxProps) {
  const hasReply = Boolean(reply?.trim());

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

      <div className="mt-2" dir={dir}>
        {hasReply ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{reply}</div>
        ) : (
          <p className="text-sm text-muted-foreground italic">{awaitingLabel}</p>
        )}
      </div>
    </div>
  );
}
