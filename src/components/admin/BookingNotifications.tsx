import { Bell, CreditCard, Ticket, X, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLanguage } from '@/hooks/useLanguage';
import { useBookingNotifications, BookingNotification } from '@/hooks/useBookingNotifications';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

const BookingNotifications = () => {
  const { currentLanguage, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { notifications, unreadCount, markAllAsRead, clearAll } = useBookingNotifications();
  const { playNotification } = useNotificationSound();
  const prevUnreadCount = useRef(unreadCount);

  // Play sound when new notification arrives
  useEffect(() => {
    if (unreadCount > prevUnreadCount.current) {
      playNotification();
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount, playNotification]);

  const getNotificationIcon = (type: BookingNotification['type']) => {
    switch (type) {
      case 'new_booking':
        return <Ticket className="h-4 w-4 text-blue-500" />;
      case 'payment_completed':
        return <CreditCard className="h-4 w-4 text-emerald-500" />;
    }
  };

  const getNotificationText = (notification: BookingNotification) => {
    const { type, booking } = notification;
    switch (type) {
      case 'new_booking':
        return isArabic 
          ? `حجز جديد من ${booking.customer_name}` 
          : `New booking from ${booking.customer_name}`;
      case 'payment_completed':
        return isArabic 
          ? `دفع مكتمل: ${booking.total_amount} ر.س` 
          : `Payment completed: ${booking.total_amount} SAR`;
    }
  };

  const formatTime = (date: Date) => {
    return formatDistanceToNow(date, { 
      addSuffix: true, 
      locale: isArabic ? ar : enUS 
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative gap-2 border-accent/30 hover:bg-accent/5 text-xs md:text-sm"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1.5 -end-1.5 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-0"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
        className="w-80 p-0 bg-card border-border shadow-lg"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-foreground">
            {isArabic ? 'الإشعارات' : 'Notifications'}
          </h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="h-3 w-3 me-1" />
                {isArabic ? 'قراءة الكل' : 'Read all'}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAll}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 me-1" />
                {isArabic ? 'مسح' : 'Clear'}
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {isArabic ? 'لا توجد إشعارات' : 'No notifications'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-3 hover:bg-accent/5 transition-colors',
                    !notification.read && 'bg-accent/10'
                  )}
                >
                  <div className="flex items-start gap-3 rtl:flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center flex-shrink-0 border border-border">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground text-start rtl:text-end">
                        {getNotificationText(notification)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 text-start rtl:text-end">
                        {notification.booking.booking_reference} • {formatTime(notification.timestamp)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default BookingNotifications;
