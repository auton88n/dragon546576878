import { memo } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  loading?: boolean;
  trend?: number; // percentage change
  featured?: boolean; // for revenue card spanning 2 columns
}

const StatsCard = memo(({
  title,
  value,
  suffix,
  icon: Icon,
  color,
  bgColor,
  loading,
  trend,
  featured,
}: StatsCardProps) => {
  const isPositiveTrend = trend && trend > 0;
  
  return (
    <Card className={cn(
      "group relative overflow-hidden border-0 transition-all duration-200",
      "hover:shadow-lg hover:-translate-y-0.5",
      featured ? "lg:col-span-2 glass-card-gold" : "glass-card"
    )}>
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      
      <CardContent className={cn("p-3 md:p-4 relative", featured && "py-4")}>
        <div className="flex items-center justify-between gap-3 rtl:flex-row-reverse">
          <div className="text-left rtl:text-right flex-1 min-w-0">
            <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 font-medium tracking-wide uppercase truncate">
              {title}
            </p>
            {loading ? (
              <Skeleton className="h-6 md:h-7 w-16 md:w-20" />
            ) : (
              <div className="space-y-0.5">
                <p className={cn(
                  "font-bold text-foreground",
                  featured ? "text-xl md:text-2xl" : "text-lg md:text-xl"
                )}>
                  {typeof value === 'number' ? value.toLocaleString() : value}
                  {suffix && (
                    <span className="text-xs md:text-sm text-muted-foreground ms-1 font-normal">
                      {suffix}
                    </span>
                  )}
                </p>
                
                {/* Trend indicator */}
                {trend !== undefined && (
                  <div className={cn(
                    "flex items-center gap-1 text-[10px] font-medium",
                    isPositiveTrend ? "text-emerald-600" : "text-red-500",
                    "rtl:flex-row-reverse"
                  )}>
                    {isPositiveTrend ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    <span>{Math.abs(trend)}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className={cn(
            "w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            "transition-transform duration-200 group-hover:scale-105",
            bgColor,
            featured && "glow-gold"
          )}>
            <Icon className={cn("h-4 w-4 md:h-5 md:w-5", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

StatsCard.displayName = 'StatsCard';

export default StatsCard;