import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type Booking = Tables<'bookings'>;

export const exportToCSV = (bookings: Booking[], filename: string = 'bookings') => {
  const headers = [
    'Booking Reference',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Visit Date',
    'Visit Time',
    'Adults',
    'Children',
    'Seniors',
    'Total Amount',
    'Currency',
    'Booking Status',
    'Payment Status',
    'Created At',
  ];

  const rows = bookings.map(b => [
    b.booking_reference,
    b.customer_name,
    b.customer_email,
    b.customer_phone,
    b.visit_date,
    b.visit_time,
    b.adult_count,
    b.child_count,
    b.senior_count || 0,
    b.total_amount,
    b.currency || 'SAR',
    b.booking_status,
    b.payment_status,
    b.created_at ? format(new Date(b.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const exportToExcel = (bookings: Booking[], filename: string = 'bookings') => {
  // Create a simple Excel-compatible HTML table
  const headers = [
    'Booking Reference',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Visit Date',
    'Visit Time',
    'Adults',
    'Children',
    'Seniors',
    'Total Amount',
    'Currency',
    'Booking Status',
    'Payment Status',
    'Created At',
  ];

  const rows = bookings.map(b => [
    b.booking_reference,
    b.customer_name,
    b.customer_email,
    b.customer_phone,
    b.visit_date,
    b.visit_time,
    b.adult_count,
    b.child_count,
    b.senior_count || 0,
    b.total_amount,
    b.currency || 'SAR',
    b.booking_status,
    b.payment_status,
    b.created_at ? format(new Date(b.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
  ]);

  const tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="UTF-8"></head>
    <body>
      <table border="1">
        <thead>
          <tr>${headers.map(h => `<th style="background-color:#8B6F47;color:white;font-weight:bold;">${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map((row, i) => `<tr style="background-color:${i % 2 === 0 ? '#ffffff' : '#f5f1e8'};">${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);
};