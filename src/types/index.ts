// ============================================
// SOUQ ALMUFAIJER - TYPE DEFINITIONS
// ============================================

// Database types
export type AppRole = 'admin' | 'scanner' | 'manager' | 'support';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export type TicketType = 'adult' | 'child' | 'group';

export type ScanResult = 'success' | 'already_used' | 'invalid' | 'expired' | 'wrong_date';

export type EmailType = 'booking_confirmation' | 'reminder' | 'cancellation';

export type EmailStatus = 'pending' | 'sent' | 'failed';

// Booking
export interface Booking {
  id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  visit_date: string;
  visit_time: string;
  adult_count: number;
  child_count: number;
  senior_count: number;
  adult_price: number;
  child_price: number;
  senior_price: number;
  total_amount: number;
  currency: string;
  payment_status: PaymentStatus;
  payment_id?: string;
  payment_method?: string;
  paid_at?: string;
  special_requests?: string;
  language: 'ar' | 'en';
  booking_status: BookingStatus;
  qr_codes_generated: boolean;
  confirmation_email_sent: boolean;
  reminder_email_sent: boolean;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
}

// Ticket
export interface Ticket {
  id: string;
  booking_id: string;
  ticket_code: string;
  ticket_type: TicketType;
  qr_code_data: string;
  qr_code_url?: string;
  is_used: boolean;
  scanned_at?: string;
  scanned_by?: string;
  scan_location?: string;
  valid_from: string;
  valid_until: string;
  created_at: string;
}

// Scan Log
export interface ScanLog {
  id: string;
  ticket_id?: string;
  scanner_user_id?: string;
  scan_result: ScanResult;
  scan_timestamp: string;
  device_info?: string;
  ip_address?: string;
  scan_location: string;
  notes?: string;
}

// Settings
export interface TicketPricing {
  adult: number;
  child: number;
  senior: number;
}

export interface DaySchedule {
  open: string;
  close: string;
  is_open: boolean;
}

export interface OperatingHours {
  saturday: DaySchedule;
  sunday: DaySchedule;
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
}

export interface CapacityLimits {
  daily: number;
  per_slot: number;
}

export interface SiteInfo {
  name_en: string;
  name_ar: string;
  address: string;
  phone: string;
  email: string;
}

export interface Settings {
  id: string;
  setting_key: string;
  setting_value: TicketPricing | OperatingHours | CapacityLimits | SiteInfo | string[];
  description?: string;
  category?: string;
  updated_by?: string;
  updated_at: string;
}

// Profile
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  hired_date?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// User Role
export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

// Email Queue
export interface EmailQueueItem {
  id: string;
  to_email: string;
  to_name?: string;
  subject: string;
  body_html: string;
  body_text?: string;
  email_type: EmailType;
  attachments?: { filename: string; path: string }[];
  status: EmailStatus;
  attempts: number;
  last_attempt?: string;
  sent_at?: string;
  error_message?: string;
  booking_id?: string;
  created_at: string;
}

// QR Code Data (embedded in QR code)
export interface QRCodeData {
  version: string;
  ticketId: string;
  bookingRef: string;
  visitorName: string;
  visitDate: string;
  visitTime: string;
  tickets: {
    adult: number;
    child: number;
    senior: number;
  };
  totalAmount: number;
  currency: string;
  status: 'valid' | 'used' | 'cancelled';
  generatedAt: string;
  expiresAt: string;
  checksum: string;
}

// Scanner Validation Result
export interface ValidationResult {
  valid: boolean;
  reason: ScanResult;
  message: string;
  ticket?: Ticket & { booking?: Booking };
}

// Booking Form State
export interface BookingFormState {
  step: 1 | 2 | 3 | 4;
  tickets: {
    adult: number;
    child: number;
    senior: number;
  };
  pricing: TicketPricing;
  visitDate?: string;
  visitTime?: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    specialRequests?: string;
  };
  language: 'ar' | 'en';
  totalAmount: number;
}

// Time Slot
export interface TimeSlot {
  time: string;
  available: number;
  capacity: number;
  isFull: boolean;
}

// Dashboard Stats
export interface DashboardStats {
  todayRevenue: number;
  todayVisitors: number;
  upcomingBookings: number;
  activeScans: number;
  revenueChange: number;
  visitorsChange: number;
}

// Chart Data
export interface RevenueChartData {
  date: string;
  revenue: number;
  bookings: number;
}
