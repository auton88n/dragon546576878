// Client-side email template generators for preview purposes
// Mirrors the Edge Function templates exactly

interface BookingPreviewData {
  customer_name: string;
  customer_email: string;
  booking_reference: string;
  visit_date: string;
  visit_time: string;
  total_amount: number;
  adult_count: number;
  child_count: number;
  language: string;
}

// Sample data for preview
export const getSampleBookingData = (isArabic: boolean): BookingPreviewData => ({
  customer_name: isArabic ? 'أحمد محمد' : 'Ahmed Mohammed',
  customer_email: 'ahmed@example.com',
  booking_reference: 'MFJ-ABC123',
  visit_date: new Date().toISOString().split('T')[0],
  visit_time: '15:00',
  total_amount: 250,
  adult_count: 2,
  child_count: 1,
  language: isArabic ? 'ar' : 'en',
});

// Refund apology email preview
export const generateRefundApologyPreview = (
  refundAmount: number,
  paymentId: string,
  reason?: string,
  isArabic: boolean = false
): string => {
  const direction = isArabic ? "rtl" : "ltr";
  const textAlign = isArabic ? "right" : "left";

  const translations = {
    subject: isArabic ? "تأكيد استرداد المبلغ" : "Refund Confirmation",
    title: isArabic ? "تم استرداد المبلغ" : "Refund Processed",
    subtitle: isArabic ? "نعتذر عن أي إزعاج" : "We apologize for any inconvenience",
    greeting: isArabic ? "عزيزي العميل،" : "Dear Customer,",
    message: isArabic
      ? "نود إعلامك بأنه تم استرداد المبلغ المدفوع بنجاح. نعتذر عن أي إزعاج قد تكون واجهته."
      : "We would like to inform you that your payment has been successfully refunded. We apologize for any inconvenience this may have caused.",
    refundAmountLabel: isArabic ? "المبلغ المسترد" : "Refund Amount",
    paymentIdLabel: isArabic ? "معرف الدفع" : "Payment ID",
    reasonLabel: isArabic ? "السبب" : "Reason",
    refundNote: isArabic
      ? "سيظهر المبلغ في حسابك خلال 5-10 أيام عمل حسب البنك."
      : "The amount will appear in your account within 5-10 business days depending on your bank.",
    contact: isArabic ? "تواصل معنا" : "Contact Us",
    helpText: isArabic
      ? "إذا كان لديك أي استفسار، لا تتردد في التواصل معنا."
      : "If you have any questions, don't hesitate to contact us.",
    footer: isArabic ? "سوق المفيجر - التراث الأصيل" : "Souq Almufaijer - Authentic Heritage",
  };

  return `
<!DOCTYPE html>
<html dir="${direction}" lang="${isArabic ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${translations.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FAF6F1; direction: ${direction}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FAF6F1; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(92, 74, 58, 0.12);">
          
          <!-- Heritage Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%); padding: 40px 30px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="color: #C9A86C; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">
                      ${isArabic ? 'سوق المفيجر' : 'SOUQ ALMUFAIJER'}
                    </p>
                    <h1 style="color: #FFFFFF; font-size: 28px; margin: 0 0 8px 0; font-weight: 700;">
                      ${translations.title}
                    </h1>
                    <p style="color: #E8DED0; font-size: 16px; margin: 0;">
                      ${translations.subtitle}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #3D2E1F; font-size: 18px; margin: 0 0 20px 0; text-align: ${textAlign}; line-height: 1.6; font-weight: 500;">
                ${translations.greeting}
              </p>
              <p style="color: #5C4A3A; font-size: 16px; margin: 0 0 30px 0; text-align: ${textAlign}; line-height: 1.7;">
                ${translations.message}
              </p>

              <!-- Refund Details Card -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #DCFCE7; border-radius: 12px; border: 1px solid #BBF7D0; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #BBF7D0;">
                          <p style="color: #166534; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px; text-align: ${textAlign};">
                            ${translations.refundAmountLabel}
                          </p>
                          <p style="color: #166534 !important; font-size: 32px; font-weight: 800; margin: 0; text-align: ${textAlign};">
                            ${refundAmount} <span style="font-size: 16px; font-weight: 600;">SAR</span>
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0;">
                          <p style="color: #166534; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px; text-align: ${textAlign};">
                            ${translations.paymentIdLabel}
                          </p>
                          <p style="color: #166534 !important; font-size: 14px; font-weight: 600; margin: 0; font-family: 'Courier New', monospace; text-align: ${textAlign};">
                            ${paymentId.slice(0, 16)}...
                          </p>
                        </td>
                      </tr>
                      ${reason ? `
                      <tr>
                        <td style="padding: 10px 0 0 0; border-top: 1px solid #BBF7D0;">
                          <p style="color: #166534; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px; text-align: ${textAlign};">
                            ${translations.reasonLabel}
                          </p>
                          <p style="color: #166534 !important; font-size: 14px; margin: 0; text-align: ${textAlign};">
                            ${reason}
                          </p>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Info Notice Box -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FEF3C7; border-radius: 10px; border: 1px solid #FCD34D; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="color: #92400E; font-size: 14px; margin: 0; line-height: 1.6; text-align: ${textAlign};">
                      ${translations.refundNote}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Help Text -->
              <p style="color: #8B7355; font-size: 14px; margin: 0; text-align: ${textAlign}; line-height: 1.6;">
                ${translations.helpText}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #3D2E1F; padding: 30px; text-align: center;">
              <p style="color: #A89585; font-size: 14px; margin: 0 0 10px 0;">
                ${translations.contact}: info@almufaijer.com
              </p>
              <p style="color: #C9A86C; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">
                ${translations.footer}
              </p>
              <p style="color: #8B7355; font-size: 11px; margin: 0;">
                <a href="https://aynn.io" style="color: #8B7355; text-decoration: none;">Powered by AYN</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const generatePaymentReminderPreview = (
  booking: BookingPreviewData,
  isArabic: boolean
): string => {
  const direction = isArabic ? "rtl" : "ltr";
  const textAlign = isArabic ? "right" : "left";

  const visitDate = new Date(booking.visit_date);
  const formattedDate = visitDate.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    calendar: 'gregory',
  });

  const translations = {
    subject: isArabic ? "تذكير ودي لإتمام حجزك" : "Complete Your Reservation",
    title: isArabic ? "تذكير ودي" : "Friendly Reminder",
    subtitle: isArabic ? "لإتمام حجزك" : "Complete Your Booking",
    greeting: isArabic ? `مرحباً ${booking.customer_name}،` : `Hello ${booking.customer_name},`,
    message: isArabic 
      ? "يسعدنا إتمام حجزك! نود تذكيرك بإكمال عملية الدفع لتأكيد زيارتك المميزة إلى سوق المفيجر."
      : "We're excited to welcome you! Please complete your payment to confirm your upcoming visit to Souq Almufaijer.",
    bookingRef: isArabic ? "رقم الحجز" : "Booking Reference",
    visitDate: isArabic ? "تاريخ الزيارة" : "Visit Date",
    validHours: isArabic ? "ساعات الصلاحية" : "Valid Hours",
    hoursValue: isArabic ? "٣:٠٠ م - ١٢:٠٠ ص" : "3:00 PM - 12:00 AM",
    validAllDay: isArabic ? "صالحة طوال اليوم" : "Valid All Day",
    amountDue: isArabic ? "المبلغ المستحق" : "Amount Due",
    note: isArabic 
      ? "يرجى إتمام الدفع قبل موعد الزيارة للحفاظ على حجزك"
      : "Please complete your payment before your visit date to secure your reservation",
    payNow: isArabic ? "ادفع الآن" : "Pay Now",
    contact: isArabic ? "تواصل معنا" : "Contact Us",
    helpText: isArabic 
      ? "إذا كنت بحاجة للمساعدة أو لديك أي استفسار، لا تتردد في التواصل معنا."
      : "If you need help or have any questions, don't hesitate to contact us.",
    footer: isArabic ? "سوق المفيجر - التراث الأصيل" : "Souq Almufaijer - Authentic Heritage",
  };

  return `
<!DOCTYPE html>
<html dir="${direction}" lang="${isArabic ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${translations.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FAF6F1; direction: ${direction}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FAF6F1; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(92, 74, 58, 0.12);">
          
          <!-- Heritage Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%); padding: 40px 30px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="color: #C9A86C; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">
                      ${isArabic ? 'سوق المفيجر' : 'SOUQ ALMUFAIJER'}
                    </p>
                    <h1 style="color: #FFFFFF; font-size: 28px; margin: 0 0 8px 0; font-weight: 700;">
                      ${translations.title}
                    </h1>
                    <p style="color: #E8DED0; font-size: 16px; margin: 0;">
                      ${translations.subtitle}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #3D2E1F; font-size: 18px; margin: 0 0 20px 0; text-align: ${textAlign}; line-height: 1.6; font-weight: 500;">
                ${translations.greeting}
              </p>
              <p style="color: #5C4A3A; font-size: 16px; margin: 0 0 30px 0; text-align: ${textAlign}; line-height: 1.7;">
                ${translations.message}
              </p>

              <!-- Booking Summary Card -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FAF6F1; border-radius: 12px; border: 1px solid #E8DED0; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #E8DED0;">
                          <p style="color: #5C4A3A; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px; text-align: ${textAlign};">
                            ${translations.bookingRef}
                          </p>
                          <p style="color: #3D2E1F !important; font-size: 22px; font-weight: 700; margin: 0; font-family: 'Courier New', monospace; letter-spacing: 2px; text-align: ${textAlign};">
                            ${booking.booking_reference}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0; border-bottom: 1px solid #E8DED0;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td width="50%" style="text-align: ${textAlign}; padding-${isArabic ? 'left' : 'right'}: 10px;">
                                <p style="color: #5C4A3A; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">
                                  ${translations.visitDate}
                                </p>
                                <p style="color: #3D2E1F !important; font-size: 15px; font-weight: 600; margin: 0;">
                                  ${formattedDate}
                                </p>
                              </td>
                              <td width="50%" style="text-align: ${textAlign}; padding-${isArabic ? 'right' : 'left'}: 10px;">
                                <p style="color: #5C4A3A; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">
                                  ${translations.validHours}
                                </p>
                                <p style="color: #3D2E1F !important; font-size: 15px; font-weight: 600; margin: 0;">
                                  ${translations.hoursValue}
                                </p>
                                <p style="color: #8B7355; font-size: 11px; margin: 4px 0 0 0; font-style: italic;">
                                  ${translations.validAllDay}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0 5px 0;">
                          <p style="color: #5C4A3A; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; text-align: ${textAlign};">
                            ${translations.amountDue}
                          </p>
                          <p style="color: #3D2E1F !important; font-size: 32px; font-weight: 800; margin: 0; text-align: ${textAlign};">
                            ${booking.total_amount} <span style="font-size: 16px; font-weight: 600; color: #5C4A3A;">SAR</span>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Pay Now Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 25px;">
                <tr>
                  <td align="center">
                    <a href="#" style="
                      display: inline-block;
                      background: linear-gradient(135deg, #5C4A3A 0%, #4A3625 100%);
                      color: #FFFFFF;
                      font-size: 18px;
                      font-weight: 700;
                      padding: 18px 50px;
                      border-radius: 12px;
                      text-decoration: none;
                      box-shadow: 0 4px 15px rgba(92, 74, 58, 0.3);
                    ">${translations.payNow}</a>
                  </td>
                </tr>
              </table>

              <!-- Soft Notice Box -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FEF3C7; border-radius: 10px; border: 1px solid #FCD34D; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="color: #92400E; font-size: 14px; margin: 0; line-height: 1.6; text-align: ${textAlign};">
                      ${translations.note}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Help Text -->
              <p style="color: #8B7355; font-size: 14px; margin: 0; text-align: ${textAlign}; line-height: 1.6;">
                ${translations.helpText}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #3D2E1F; padding: 30px; text-align: center;">
              <p style="color: #A89585; font-size: 14px; margin: 0 0 10px 0;">
                ${translations.contact}: info@almufaijer.com
              </p>
              <p style="color: #C9A86C; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">
                ${translations.footer}
              </p>
              <p style="color: #8B7355; font-size: 11px; margin: 0;">
                <a href="https://aynn.io" style="color: #8B7355; text-decoration: none;">Powered by AYN</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
