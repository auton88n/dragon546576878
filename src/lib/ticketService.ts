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
    ticketCode: string;
    ticketType: string;
    bookingReference: string;
    customerName: string;
    visitDate: string;
    visitTime: string;
  };
}

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
            visit_date,
            visit_time
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
          visit_date,
          visit_time
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
  
  // Check if already used
  if (ticket.is_used) {
    return {
      isValid: false,
      status: 'used',
      message: 'Ticket already used',
      ticket: {
        id: ticket.id,
        ticketCode: ticket.ticket_code,
        ticketType: ticket.ticket_type,
        bookingReference: bookingData?.booking_reference || '',
        customerName: bookingData?.customer_name || 'Unknown',
        visitDate: ticket.valid_from,
        visitTime: bookingData?.visit_time || '',
      },
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
      ticket: {
        id: ticket.id,
        ticketCode: ticket.ticket_code,
        ticketType: ticket.ticket_type,
        bookingReference: bookingData?.booking_reference || '',
        customerName: bookingData?.customer_name || 'Unknown',
        visitDate: ticket.valid_from,
        visitTime: bookingData?.visit_time || '',
      },
    };
  }

  // Ticket is valid!
  return {
    isValid: true,
    status: 'valid',
    message: 'Ticket is valid',
    ticket: {
      id: ticket.id,
      ticketCode: ticket.ticket_code,
      ticketType: ticket.ticket_type,
      bookingReference: bookingData?.booking_reference || '',
      customerName: bookingData?.customer_name || 'Unknown',
      visitDate: ticket.valid_from,
      visitTime: bookingData?.visit_time || '',
    },
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
          visit_date,
          visit_time
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
          visit_date,
          visit_time
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
