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
      "group relative overflow-hidden border-0 transition-all duration-300",
      "hover:shadow-xl hover:-translate-y-1",
      featured ? "lg:col-span-2 glass-card-gold" : "glass-card"
    )}>
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className={cn("p-4 md:p-6 relative", featured && "py-6")}>
        <div className="flex items-start justify-between rtl:flex-row-reverse">
          <div className="text-left rtl:text-right flex-1">
            <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2 font-medium tracking-wide uppercase">
              {title}
            </p>
            {loading ? (
              <Skeleton className="h-8 md:h-10 w-20 md:w-28" />
            ) : (
              <div className="space-y-1">
                <p className={cn(
                  "font-bold text-foreground",
                  featured ? "text-2xl md:text-4xl" : "text-xl md:text-3xl"
                )}>
                  {typeof value === 'number' ? value.toLocaleString() : value}
                  {suffix && (
                    <span className="text-sm md:text-lg text-muted-foreground ms-1 font-normal">
                      {suffix}
                    </span>
                  )}
                </p>
                
                {/* Trend indicator */}
                {trend !== undefined && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    isPositiveTrend ? "text-emerald-600" : "text-red-500",
                    "rtl:flex-row-reverse"
                  )}>
                    {isPositiveTrend ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{Math.abs(trend)}% vs yesterday</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className={cn(
            "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center",
            "transition-transform duration-300 group-hover:scale-110",
            bgColor,
            featured && "glow-gold"
          )}>
            <Icon className={cn("h-6 w-6 md:h-7 md:w-7", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

StatsCard.displayName = 'StatsCard';

export default StatsCard;