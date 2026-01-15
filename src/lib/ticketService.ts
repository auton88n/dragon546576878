/**
 * Ticket Service - Scanner-side validation and lookup functions
 * 
 * Note: Ticket GENERATION is now handled server-side in the create-booking edge function.
 * This file contains only validation and lookup functions used by the scanner.
 * 
 * Supports both:
 * - NEW GROUP FORMAT: Single QR per reservation with guest counts
 * - LEGACY FORMAT: Individual ticket QR codes (backward compatible)
 */

import { supabase } from '@/integrations/supabase/client';

// Validate a scanned QR code (individual ticket)
export interface TicketValidationResult {
  isValid: boolean;
  status: 'valid' | 'invalid' | 'used' | 'expired' | 'wrong_date' | 'not_found';
  message: string;
  ticket?: {
    id: string;
    bookingId: string;
    ticketCode: string;
    ticketType: string;
    bookingReference: string;
    customerName: string;
    customerPhone: string;
    visitDate: string;
    visitTime: string;
    adultCount: number;
    childCount: number;
    seniorCount: number;
    paymentStatus: string;
    totalAmount: number;
    usedAt?: string;
  };
}

// NEW: Group ticket validation result
export interface GroupTicketValidationResult {
  isValid: boolean;
  status: 'valid' | 'invalid' | 'arrived' | 'expired' | 'wrong_date' | 'not_found' | 'not_paid';
  message: string;
  isGroupTicket: true;
  isVIP?: boolean;
  isCorporate?: boolean;
  companyName?: string;
  booking?: {
    id: string;
    bookingReference: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    visitDate: string;
    visitTime: string;
    adultCount: number;
    childCount: number;
    seniorCount: number;
    totalGuests: number;
    paymentStatus: string;
    totalAmount: number;
    arrivalStatus: string;
    arrivedAt?: string;
    isVIP?: boolean;
    isCorporate?: boolean;
    companyName?: string;
  };
}

// Employee validation result - separate from ticket
export interface EmployeeValidationResult {
  isValid: boolean;
  status: 'valid' | 'inactive' | 'not_found';
  message: string;
  employee?: {
    id: string;
    name: string;
    department: string;
  };
}

// Detect QR code type - handles group, individual ticket, and employee formats
export type QRCodeKind = 'employee' | 'ticket' | 'group' | 'unknown';

// Normalize QR data by removing invisible/garbage characters
const normalizeQRData = (data: string): string => {
  return data
    .trim()
    .replace(/\u0000/g, '') // null chars
    .replace(/\uFEFF/g, '') // BOM
    .replace(/[\u200B-\u200D\u2060]/g, ''); // zero-width chars
};

// Try to extract JSON from possibly corrupted string
const extractJSON = (data: string): any | null => {
  const normalized = normalizeQRData(data);
  
  // Direct parse attempt
  try {
    return JSON.parse(normalized);
  } catch {
    // Try to find JSON substring
    const start = normalized.indexOf('{');
    const end = normalized.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(normalized.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

export const detectQRKind = (qrData: string): { kind: QRCodeKind; parsed: any } => {
  const parsed = extractJSON(qrData);
  
  if (!parsed) {
    return { kind: 'unknown', parsed: null };
  }
  
  // New employee format: { type: "employee", id, name, dept, cs }
  if (parsed.type === 'employee' || parsed.type === 'employee_badge') {
    return { kind: 'employee', parsed };
  }
  
  // NEW: Group ticket format: { type: "group", code, ref, date, adults, children, total, cs }
  if (parsed.type === 'group') {
    return { kind: 'group', parsed };
  }
  
  // Legacy employee format: has id/employeeId + department/dept, but NO code
  const employeeId = parsed.id || parsed.employeeId || parsed.employee_id;
  const hasDept = parsed.dept || parsed.department;
  const hasTicketCode = !!parsed.code;
  
  if (employeeId && hasDept && !hasTicketCode) {
    return { kind: 'employee', parsed };
  }
  
  // Individual ticket format: must have code but no type:"group"
  if (hasTicketCode) {
    return { kind: 'ticket', parsed };
  }
  
  return { kind: 'unknown', parsed };
};

// Check if QR data is for an employee badge (legacy function for compatibility)
export const isEmployeeQR = (qrData: string): boolean => {
  return detectQRKind(qrData).kind === 'employee';
};

// Check if QR data is for a group ticket
export const isGroupQR = (qrData: string): boolean => {
  return detectQRKind(qrData).kind === 'group';
};

// Extract employee ID from various possible fields
const extractEmployeeId = (parsed: any): string | null => {
  return parsed?.id || parsed?.employeeId || parsed?.employee_id || null;
};

// Validate an employee badge QR code (unlimited scans - never marks as used)
// Uses RPC function to bypass RLS for scanner users
export const validateEmployeeQR = async (qrData: string): Promise<EmployeeValidationResult> => {
  try {
    console.log('Validating employee QR:', qrData);
    
    const { kind, parsed } = detectQRKind(qrData);
    const employeeId = extractEmployeeId(parsed);
    
    if (kind !== 'employee' || !employeeId) {
      return {
        isValid: false,
        status: 'not_found',
        message: 'Invalid employee badge format',
      };
    }

    // Use RPC function to validate employee (bypasses RLS issues)
    const { data, error } = await supabase
      .rpc('validate_employee_badge', { employee_id: employeeId });

    if (error) {
      console.error('RPC error validating employee:', error);
      return {
        isValid: false,
        status: 'not_found',
        message: 'Error validating employee',
      };
    }

    // Cast the response to the expected type
    const employee = data as { id?: string; full_name?: string; department?: string; is_active?: boolean; error?: string } | null;

    // Check if RPC returned an error (not authenticated)
    if (employee?.error === 'not_authenticated') {
      console.log('Session expired during employee validation');
      return {
        isValid: false,
        status: 'not_found',
        message: 'Session expired - please log in again',
      };
    }

    if (!employee || !employee.id) {
      console.log('Employee not found for ID:', parsed.id);
      return {
        isValid: false,
        status: 'not_found',
        message: 'Employee not found',
      };
    }

    // Check if employee is active
    if (!employee.is_active) {
      return {
        isValid: false,
        status: 'inactive',
        message: 'Employee badge deactivated',
        employee: {
          id: employee.id,
          name: employee.full_name || '',
          department: employee.department || '',
        },
      };
    }

    // Employee is valid!
    return {
      isValid: true,
      status: 'valid',
      message: 'Employee verified',
      employee: {
        id: employee.id,
        name: employee.full_name || '',
        department: employee.department || '',
      },
    };
  } catch (err) {
    console.error('Error validating employee QR:', err);
    return {
      isValid: false,
      status: 'not_found',
      message: 'Invalid employee badge',
    };
  }
};

// Log an employee scan for attendance tracking (optional)
export const logEmployeeScan = async (
  employeeId: string,
  scannerId?: string,
  location?: string
): Promise<void> => {
  try {
    await supabase.from('employee_scans').insert({
      employee_id: employeeId,
      scanner_user_id: scannerId,
      scan_location: location || 'main_entrance',
    });
  } catch (err) {
    console.error('Error logging employee scan:', err);
  }
};

// Get Saudi Arabia date helper
const getSaudiDate = () => {
  const now = new Date();
  const saudiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  return saudiTime.toISOString().split('T')[0];
};

// NEW: Validate a GROUP ticket QR code
export const validateGroupTicket = async (qrData: string): Promise<GroupTicketValidationResult> => {
  try {
    console.log('Validating GROUP QR:', qrData);
    
    const { kind, parsed } = detectQRKind(qrData);
    
    if (kind !== 'group' || !parsed) {
      return {
        isValid: false,
        status: 'invalid',
        message: 'Invalid group ticket format',
        isGroupTicket: true,
      };
    }

    const { ref: bookingRef, date: visitDate, code: ticketCode, corp: isCorporateQR, company: companyNameQR } = parsed;
    
    if (!bookingRef || !visitDate) {
      return {
        isValid: false,
        status: 'invalid',
        message: 'Missing booking reference or date',
        isGroupTicket: true,
      };
    }

    // Corporate flag from QR data
    const isCorporate = isCorporateQR === true || (booking?.is_corporate ?? false);
    const companyName = companyNameQR || booking?.company_name || undefined;

    // Find booking by reference
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_reference', bookingRef)
      .maybeSingle();

    if (error) {
      console.error('Database error looking up booking:', error);
      return {
        isValid: false,
        status: 'invalid',
        message: 'Error validating ticket',
        isGroupTicket: true,
      };
    }

    if (!booking) {
      console.log('Booking not found for reference:', bookingRef);
      return {
        isValid: false,
        status: 'not_found',
        message: 'Booking not found',
        isGroupTicket: true,
      };
    }

    const adultCount = booking.adult_count || 0;
    const childCount = booking.child_count || 0;
    const seniorCount = booking.senior_count || 0;
    const totalGuests = adultCount + childCount + seniorCount;
    
    // Detect VIP bookings (VIP- prefix in booking reference)
    const isVIP = booking.booking_reference?.startsWith('VIP-') || false;
    // Corporate status from booking or QR
    const isCorporateFinal = isCorporate || booking.is_corporate || false;
    const companyNameFinal = companyName || booking.company_name || undefined;

    const bookingData = {
      id: booking.id,
      bookingReference: booking.booking_reference,
      customerName: booking.customer_name,
      customerPhone: booking.customer_phone,
      customerEmail: booking.customer_email,
      visitDate: booking.visit_date,
      visitTime: booking.visit_time,
      adultCount,
      childCount,
      seniorCount,
      totalGuests,
      paymentStatus: booking.payment_status,
      totalAmount: booking.total_amount,
      arrivalStatus: booking.arrival_status || 'not_arrived',
      arrivedAt: booking.arrived_at || undefined,
      isVIP,
      isCorporate: isCorporateFinal,
      companyName: companyNameFinal,
    };

    // Check if already arrived
    if (booking.arrival_status === 'arrived') {
      const arrivedTime = booking.arrived_at 
        ? new Date(booking.arrived_at).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Riyadh'
          })
        : '';
      return {
        isValid: false,
        status: 'arrived',
        message: `Group already admitted${arrivedTime ? ` at ${arrivedTime}` : ''}`,
        isGroupTicket: true,
        isVIP,
        isCorporate: isCorporateFinal,
        companyName: companyNameFinal,
        booking: bookingData,
      };
    }

    // Check date validity
    const today = getSaudiDate();
    if (booking.visit_date !== today) {
      const isExpired = new Date(booking.visit_date) < new Date(today);
      return {
        isValid: false,
        status: isExpired ? 'expired' : 'wrong_date',
        message: isExpired 
          ? 'Ticket has expired' 
          : `Ticket valid for ${booking.visit_date}`,
        isGroupTicket: true,
        isVIP,
        isCorporate: isCorporateFinal,
        companyName: companyNameFinal,
        booking: bookingData,
      };
    }

    // Check payment status - VIP tickets are always complimentary (completed)
    if (booking.payment_status !== 'completed') {
      return {
        isValid: false,
        status: 'not_paid',
        message: 'Payment not completed',
        isGroupTicket: true,
        isVIP,
        isCorporate: isCorporateFinal,
        companyName: companyNameFinal,
        booking: bookingData,
      };
    }

    // Group ticket is valid!
    return {
      isValid: true,
      status: 'valid',
      message: isCorporateFinal
        ? `Corporate Fast-Track: Admit ${totalGuests} guest${totalGuests !== 1 ? 's' : ''}`
        : isVIP 
          ? `Welcome VIP! Admit ${totalGuests} guest${totalGuests !== 1 ? 's' : ''}`
          : `Admit ${totalGuests} guest${totalGuests !== 1 ? 's' : ''}`,
      isGroupTicket: true,
      isVIP,
      isCorporate: isCorporateFinal,
      companyName: companyNameFinal,
      booking: bookingData,
    };
  } catch (err) {
    console.error('Error validating group ticket:', err);
    return {
      isValid: false,
      status: 'invalid',
      message: 'Invalid group ticket',
      isGroupTicket: true,
    };
  }
};

// NEW: Mark entire booking as arrived
export const markBookingAsArrived = async (
  bookingId: string,
  scannerId?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({
        arrival_status: 'arrived',
        arrived_at: new Date().toISOString(),
        arrived_scanned_by: scannerId,
      })
      .eq('id', bookingId);

    if (error) {
      console.error('Error marking booking as arrived:', error);
      return false;
    }

    // Also mark all individual tickets as used (for backward compatibility)
    await supabase
      .from('tickets')
      .update({
        is_used: true,
        scanned_at: new Date().toISOString(),
        scanned_by: scannerId,
        scan_location: 'main_entrance',
      })
      .eq('booking_id', bookingId);

    return true;
  } catch (err) {
    console.error('Error marking booking as arrived:', err);
    return false;
  }
};

// Legacy: Validate individual ticket QR
export const validateTicket = async (qrData: string): Promise<TicketValidationResult> => {
  try {
    console.log('Validating QR data:', qrData);
    
    // Parse QR data - handle both string and object formats
    let parsed: { code?: string; ref?: string; date?: string; cs?: string };
    
    try {
      parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch (parseErr) {
      console.error('Failed to parse QR data as JSON:', parseErr);
      
      // Try to find ticket by raw code if JSON parsing fails
      // This handles cases where the QR might contain just the ticket code
      const { data: ticketByCode } = await supabase
        .from('tickets')
      .select(`
        *,
        bookings (
          booking_reference,
          customer_name,
          customer_phone,
          visit_date,
          visit_time,
          adult_count,
          child_count,
          senior_count,
          payment_status,
          total_amount
        )
      `)
      .eq('ticket_code', qrData.trim())
        .maybeSingle();
      
      if (ticketByCode) {
        return validateTicketRecord(ticketByCode);
      }
      
      return {
        isValid: false,
        status: 'invalid',
        message: 'Invalid QR code format',
      };
    }

    const { code, ref, date } = parsed;

    if (!code) {
      console.error('Missing ticket code in parsed data:', parsed);
      return {
        isValid: false,
        status: 'invalid',
        message: 'Invalid QR code format - missing ticket code',
      };
    }

    // Find ticket in database
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        bookings (
          booking_reference,
          customer_name,
          customer_phone,
          visit_date,
          visit_time,
          adult_count,
          child_count,
          senior_count,
          payment_status,
          total_amount
        )
      `)
      .eq('ticket_code', code)
      .maybeSingle();

    if (error) {
      console.error('Database error looking up ticket:', error);
      return {
        isValid: false,
        status: 'invalid',
        message: 'Error validating ticket',
      };
    }

    if (!ticket) {
      console.log('Ticket not found for code:', code);
      return {
        isValid: false,
        status: 'not_found',
        message: 'Ticket not found',
      };
    }

    return validateTicketRecord(ticket);
  } catch (err) {
    console.error('Error validating ticket:', err);
    return {
      isValid: false,
      status: 'invalid',
      message: 'Invalid QR code data',
    };
  }
};

// Helper function to validate a ticket record
const validateTicketRecord = (ticket: any): TicketValidationResult => {
  const bookingData = ticket.bookings as any;
  
  // Build common ticket data
  const ticketData = {
    id: ticket.id,
    bookingId: ticket.booking_id,
    ticketCode: ticket.ticket_code,
    ticketType: ticket.ticket_type,
    bookingReference: bookingData?.booking_reference || '',
    customerName: bookingData?.customer_name || 'Unknown',
    customerPhone: bookingData?.customer_phone || '',
    visitDate: ticket.valid_from,
    visitTime: bookingData?.visit_time || '',
    adultCount: bookingData?.adult_count || 0,
    childCount: bookingData?.child_count || 0,
    seniorCount: bookingData?.senior_count || 0,
    paymentStatus: bookingData?.payment_status || 'unknown',
    totalAmount: bookingData?.total_amount || 0,
    usedAt: ticket.scanned_at || undefined,
  };
  
  // Check if already used
  if (ticket.is_used) {
    return {
      isValid: false,
      status: 'used',
      message: 'Ticket already used',
      ticket: ticketData,
    };
  }

  // Check date validity - use Saudi Arabia timezone
  const today = getSaudiDate();
  if (ticket.valid_from !== today) {
    const isExpired = new Date(ticket.valid_from) < new Date(today);
    return {
      isValid: false,
      status: isExpired ? 'expired' : 'wrong_date',
      message: isExpired 
        ? 'Ticket has expired' 
        : `Ticket valid for ${ticket.valid_from}`,
      ticket: ticketData,
    };
  }

  // Ticket is valid!
  return {
    isValid: true,
    status: 'valid',
    message: 'Ticket is valid',
    ticket: ticketData,
  };
};

// Mark individual ticket as used (legacy)
export const markTicketAsUsed = async (
  ticketId: string,
  scannerId?: string,
  location?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tickets')
      .update({
        is_used: true,
        scanned_at: new Date().toISOString(),
        scanned_by: scannerId,
        scan_location: location || 'main_entrance',
      })
      .eq('id', ticketId);

    return !error;
  } catch (err) {
    console.error('Error marking ticket as used:', err);
    return false;
  }
};

// Log a scan attempt
export const logScanAttempt = async (
  ticketId: string | null,
  result: 'valid' | 'invalid' | 'used' | 'expired' | 'wrong_date' | 'not_found' | 'arrived',
  scannerId?: string,
  deviceInfo?: string
): Promise<void> => {
  try {
    await supabase.from('scan_logs').insert({
      ticket_id: ticketId,
      scan_result: result,
      scanner_user_id: scannerId,
      device_info: deviceInfo,
      scan_location: 'main_entrance',
    });
  } catch (err) {
    console.error('Error logging scan attempt:', err);
  }
};

// Manual ticket lookup by booking reference or ticket code
export const lookupTicket = async (searchQuery: string): Promise<TicketValidationResult[]> => {
  const query = searchQuery.trim().toUpperCase();
  
  if (!query) {
    return [];
  }

  try {
    // First try to find by exact ticket code
    const { data: ticketByCode } = await supabase
      .from('tickets')
      .select(`
        *,
        bookings (
          booking_reference,
          customer_name,
          customer_phone,
          visit_date,
          visit_time,
          adult_count,
          child_count,
          senior_count,
          payment_status,
          total_amount
        )
      `)
      .ilike('ticket_code', `%${query}%`)
      .limit(10);

    // Also search by booking reference
    const { data: ticketsByBooking } = await supabase
      .from('tickets')
      .select(`
        *,
        bookings!inner (
          booking_reference,
          customer_name,
          customer_phone,
          visit_date,
          visit_time,
          adult_count,
          child_count,
          senior_count,
          payment_status,
          total_amount
        )
      `)
      .ilike('bookings.booking_reference', `%${query}%`)
      .limit(10);

    // Combine results and remove duplicates
    const allTickets = [...(ticketByCode || []), ...(ticketsByBooking || [])];
    const uniqueTickets = allTickets.filter((ticket, index, self) =>
      index === self.findIndex(t => t.id === ticket.id)
    );

    // Validate each ticket
    return uniqueTickets.map(ticket => validateTicketRecord(ticket));
  } catch (err) {
    console.error('Error looking up ticket:', err);
    return [];
  }
};

// NEW: Lookup booking for group admission
export const lookupBookingByReference = async (searchQuery: string): Promise<GroupTicketValidationResult | null> => {
  const query = searchQuery.trim().toUpperCase();
  
  if (!query) {
    return null;
  }

  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .ilike('booking_reference', `%${query}%`)
      .maybeSingle();

    if (error || !booking) {
      return null;
    }

    const adultCount = booking.adult_count || 0;
    const childCount = booking.child_count || 0;
    const seniorCount = booking.senior_count || 0;
    const totalGuests = adultCount + childCount + seniorCount;

    const bookingData = {
      id: booking.id,
      bookingReference: booking.booking_reference,
      customerName: booking.customer_name,
      customerPhone: booking.customer_phone,
      customerEmail: booking.customer_email,
      visitDate: booking.visit_date,
      visitTime: booking.visit_time,
      adultCount,
      childCount,
      seniorCount,
      totalGuests,
      paymentStatus: booking.payment_status,
      totalAmount: booking.total_amount,
      arrivalStatus: booking.arrival_status || 'not_arrived',
      arrivedAt: booking.arrived_at || undefined,
    };

    // Check if already arrived
    if (booking.arrival_status === 'arrived') {
      return {
        isValid: false,
        status: 'arrived',
        message: 'Group already admitted',
        isGroupTicket: true,
        booking: bookingData,
      };
    }

    // Check date validity
    const today = getSaudiDate();
    if (booking.visit_date !== today) {
      const isExpired = new Date(booking.visit_date) < new Date(today);
      return {
        isValid: false,
        status: isExpired ? 'expired' : 'wrong_date',
        message: isExpired ? 'Ticket has expired' : `Ticket valid for ${booking.visit_date}`,
        isGroupTicket: true,
        booking: bookingData,
      };
    }

    return {
      isValid: booking.payment_status === 'completed',
      status: booking.payment_status === 'completed' ? 'valid' : 'invalid',
      message: booking.payment_status === 'completed' 
        ? `Admit ${totalGuests} guest${totalGuests !== 1 ? 's' : ''}`
        : 'Payment not completed',
      isGroupTicket: true,
      booking: bookingData,
    };
  } catch (err) {
    console.error('Error looking up booking:', err);
    return null;
  }
};
