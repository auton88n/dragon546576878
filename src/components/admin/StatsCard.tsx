import { memo } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  loading?: boolean;
}

const StatsCard = memo(({
  title,
  value,
  suffix,
  icon: Icon,
  color,
  bgColor,
  loading,
}: StatsCardProps) => {
  return (
    <Card className="glass-card-gold hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-0">
      <CardContent className="p-3 md:p-6">
        <div className="flex items-start justify-between rtl:flex-row-reverse">
          <div className="text-left rtl:text-right">
            <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">{title}</p>
            {loading ? (
              <Skeleton className="h-7 md:h-9 w-16 md:w-24" />
            ) : (
              <p className="text-xl md:text-3xl font-bold text-foreground">
                {typeof value === 'number' ? value.toLocaleString() : value}
                {suffix && (
                  <span className="text-sm md:text-lg text-muted-foreground ms-1">
                    {suffix}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${bgColor} flex items-center justify-center glow-gold`}>
            <Icon className={`h-5 w-5 md:h-6 md:w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

StatsCard.displayName = 'StatsCard';

export default StatsCard;