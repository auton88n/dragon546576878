import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Booking = Tables<'bookings'>;

export interface BookingNotification {
  id: string;
  type: 'new_booking' | 'payment_completed';
  booking: Booking;
  timestamp: Date;
  read: boolean;
}

export const useBookingNotifications = () => {
  const [notifications, setNotifications] = useState<BookingNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Add new notification
  const addNotification = useCallback((type: BookingNotification['type'], booking: Booking) => {
    const newNotification: BookingNotification = {
      id: `${booking.id}-${type}-${Date.now()}`,
      type,
      booking,
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications(prev => {
      // Prevent duplicates
      const exists = prev.some(n => n.booking.id === booking.id && n.type === type);
      if (exists) return prev;
      return [newNotification, ...prev].slice(0, 20); // Keep last 20
    });
    setUnreadCount(prev => prev + 1);
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Subscribe to real-time booking changes
  useEffect(() => {
    const channel = supabase
      .channel('booking-notifications')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'bookings' 
        },
        (payload) => {
          const booking = payload.new as Booking;
          addNotification('new_booking', booking);
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'bookings' 
        },
        (payload) => {
          const newBooking = payload.new as Booking;
          const oldBooking = payload.old as Partial<Booking>;
          
          // Check if payment just completed
          if (
            oldBooking.payment_status === 'pending' && 
            newBooking.payment_status === 'completed'
          ) {
            addNotification('payment_completed', newBooking);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addNotification]);

  return {
    notifications,
    unreadCount,
    markAllAsRead,
    clearAll,
  };
};
