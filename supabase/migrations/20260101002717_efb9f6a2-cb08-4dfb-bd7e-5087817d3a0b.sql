-- Add indexes for scalability (10,000+ bookings)

-- Index on visit_date for date filtering (admin dashboard, reports)
CREATE INDEX IF NOT EXISTS idx_bookings_visit_date ON bookings(visit_date);

-- Index on booking_reference for quick lookups
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);

-- Index on customer_email for My Tickets lookup
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);

-- Index on tickets for faster validation during scanning
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_booking_id ON tickets(booking_id);

-- Index on scan_logs for staff performance reports
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanner_user_id ON scan_logs(scanner_user_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_timestamp ON scan_logs(scan_timestamp);