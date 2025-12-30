import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TicketInsert = Database['public']['Tables']['tickets']['Insert'];

interface GenerateTicketsParams {
  bookingId: string;
  bookingReference: string;
  visitDate: string;
  visitTime: string;
  adultCount: number;
  childCount: number;
  seniorCount: number;
}

interface GeneratedTicket {
  id: string;
  ticketCode: string;
  ticketType: string;
  qrCodeUrl: string;
}

// Generate a unique ticket code
const generateTicketCode = (type: string, index: number): string => {
  const typePrefix = type.charAt(0).toUpperCase(); // A, C, S
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${typePrefix}${timestamp}${random}${index}`;
};

// Generate QR code data with checksum
const generateQRData = (ticketCode: string, bookingRef: string, visitDate: string, visitTime: string): string => {
  const data = {
    code: ticketCode,
    ref: bookingRef,
    date: visitDate,
    time: visitTime,
    ts: Date.now(),
  };
  
  // Create a simple checksum
  const checksum = btoa(JSON.stringify(data)).slice(-8);
  
  return JSON.stringify({
    ...data,
    cs: checksum,
  });
};

// Generate QR code image as data URL
const generateQRCodeImage = async (data: string): Promise<string> => {
  return await QRCode.toDataURL(data, {
    width: 400,
    margin: 2,
    color: {
      dark: '#2C2416',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  });
};

// Upload QR code to Supabase storage
const uploadQRCodeToStorage = async (
  dataUrl: string,
  bookingId: string,
  ticketCode: string
): Promise<string | null> => {
  try {
    // Convert data URL to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    const fileName = `${bookingId}/${ticketCode}.png`;
    
    const { data, error } = await supabase.storage
      .from('tickets')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: true,
      });
    
    if (error) {
      console.error('Error uploading QR code:', error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('tickets')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  } catch (err) {
    console.error('Error in uploadQRCodeToStorage:', err);
    return null;
  }
};

// Main function to generate all tickets for a booking
export const generateTicketsForBooking = async (
  params: GenerateTicketsParams
): Promise<GeneratedTicket[]> => {
  const {
    bookingId,
    bookingReference,
    visitDate,
    visitTime,
    adultCount,
    childCount,
    seniorCount,
  } = params;

  const tickets: TicketInsert[] = [];
  const generatedTickets: GeneratedTicket[] = [];

  // Helper to create tickets for a type
  const createTicketsForType = async (type: 'adult' | 'child' | 'senior', count: number) => {
    for (let i = 0; i < count; i++) {
      const ticketCode = generateTicketCode(type, i + 1);
      const qrData = generateQRData(ticketCode, bookingReference, visitDate, visitTime);
      
      // Generate QR code image
      const qrDataUrl = await generateQRCodeImage(qrData);
      
      // Upload to storage
      const qrCodeUrl = await uploadQRCodeToStorage(qrDataUrl, bookingId, ticketCode);
      
      tickets.push({
        booking_id: bookingId,
        ticket_code: ticketCode,
        ticket_type: type,
        qr_code_data: qrData,
        qr_code_url: qrCodeUrl,
        valid_from: visitDate,
        valid_until: visitDate, // Same day only
        is_used: false,
      });
    }
  };

  // Generate tickets for each type
  await createTicketsForType('adult', adultCount);
  await createTicketsForType('child', childCount);
  await createTicketsForType('senior', seniorCount);

  // Insert all tickets into database
  if (tickets.length > 0) {
    const { data, error } = await supabase
      .from('tickets')
      .insert(tickets)
      .select();

    if (error) {
      console.error('Error inserting tickets:', error);
      throw new Error('Failed to create tickets');
    }

    if (data) {
      generatedTickets.push(
        ...data.map((t) => ({
          id: t.id,
          ticketCode: t.ticket_code,
          ticketType: t.ticket_type,
          qrCodeUrl: t.qr_code_url || '',
        }))
      );
    }
  }

  // Update booking to mark QR codes as generated
  await supabase
    .from('bookings')
    .update({ qr_codes_generated: true })
    .eq('id', bookingId);

  return generatedTickets;
};

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
