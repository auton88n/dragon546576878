/**
 * Ticket Service - Scanner-side validation and lookup functions
 * 
 * Note: Ticket GENERATION is now handled server-side in the create-booking edge function.
 * This file contains only validation and lookup functions used by the scanner.
 */

import { supabase } from '@/integrations/supabase/client';

// Validate a scanned QR code
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

// Detect QR code type - handles both new and legacy formats
export type QRCodeKind = 'employee' | 'ticket' | 'unknown';

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
  
  // Legacy employee format: has id/employeeId + department/dept, but NO code
  const employeeId = parsed.id || parsed.employeeId || parsed.employee_id;
  const hasDept = parsed.dept || parsed.department;
  const hasTicketCode = !!parsed.code;
  
  if (employeeId && hasDept && !hasTicketCode) {
    return { kind: 'employee', parsed };
  }
  
  // Ticket format: must have code
  if (hasTicketCode) {
    return { kind: 'ticket', parsed };
  }
  
  return { kind: 'unknown', parsed };
};

// Check if QR data is for an employee badge (legacy function for compatibility)
export const isEmployeeQR = (qrData: string): boolean => {
  return detectQRKind(qrData).kind === 'employee';
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

  // Check date validity
  const today = new Date().toISOString().split('T')[0];
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

// Mark ticket as used
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
  result: 'valid' | 'invalid' | 'used' | 'expired' | 'wrong_date' | 'not_found',
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
