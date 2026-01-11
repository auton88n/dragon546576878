-- Enable realtime for bookings table to allow real-time notifications
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;