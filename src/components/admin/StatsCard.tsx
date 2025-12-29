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

const StatsCard = ({
  title,
  value,
  suffix,
  icon: Icon,
  color,
  bgColor,
  loading,
}: StatsCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            {loading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <p className="text-3xl font-bold">
                {typeof value === 'number' ? value.toLocaleString() : value}
                {suffix && (
                  <span className="text-lg text-muted-foreground mr-1 rtl:ml-1 rtl:mr-0">
                    {suffix}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
