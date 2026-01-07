import { useState, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from './useLanguage';

export interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  buttons?: ChatButton[];
  timestamp: Date;
}

export interface ChatButton {
  id: string;
  label: string;
  action: string;
}

type ChatState = 'welcome' | 'menu' | 'booking' | 'payment' | 'tickets' | 'hours' | 'location';

const generateId = () => Math.random().toString(36).substring(2, 11);

export function useChatbot() {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<ChatState>('welcome');
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const hasInitialized = useRef(false);

  // Translations
  const t = useCallback((key: string) => {
    const translations: Record<string, { en: string; ar: string }> = {
      welcome: {
        en: "Hello! 👋 Welcome to Souq Almufaijer. How can I help you today?",
        ar: "مرحباً! 👋 أهلاً بك في سوق المفيجر. كيف يمكنني مساعدتك اليوم؟"
      },
      booking: {
        en: "🎟️ Booking Help",
        ar: "🎟️ مساعدة الحجز"
      },
      payment: {
        en: "💳 Payment Issues",
        ar: "💳 مشاكل الدفع"
      },
      tickets: {
        en: "📱 QR Code / Tickets",
        ar: "📱 رمز QR / التذاكر"
      },
      hours: {
        en: "🕐 Operating Hours",
        ar: "🕐 ساعات العمل"
      },
      location: {
        en: "📍 Location",
        ar: "📍 الموقع"
      },
      backToMenu: {
        en: "← Back to Menu",
        ar: "← العودة للقائمة"
      },
      helpful: {
        en: "Was this helpful?",
        ar: "هل كان هذا مفيداً؟"
      },
      yes: {
        en: "✅ Yes",
        ar: "✅ نعم"
      },
      no: {
        en: "❌ No, I need more help",
        ar: "❌ لا، أحتاج مساعدة أكثر"
      },
      bookingInfo: {
        en: "To book tickets:\n\n1. Click 'Book Tickets' in the menu\n2. Select your ticket type and quantity\n3. Choose your visit date and time\n4. Enter your details and complete payment\n\nNeed more help?",
        ar: "لحجز التذاكر:\n\n1. اضغط على 'احجز مكانك' في القائمة\n2. اختر نوع التذكرة والكمية\n3. اختر تاريخ ووقت الزيارة\n4. أدخل بياناتك وأكمل الدفع\n\nهل تحتاج مساعدة أكثر؟"
      },
      paymentInfo: {
        en: "💳 Payment & Exchange Policy:\n\n• We accept Visa, Mastercard, and mada cards\n• Payments are processed securely\n\n⚠️ IMPORTANT:\n• ❌ NO REFUNDS - All ticket sales are final\n• ✅ Date exchange available ONCE if you contact us at least 3 days before your visit\n• 📝 Exchange requests ONLY via: almufaijer.com/contact\n\n📄 Read full policy: /terms\n\nStill having issues?",
        ar: "💳 سياسة الدفع والاستبدال:\n\n• نقبل فيزا، ماستركارد، ومدى\n• المدفوعات تتم بشكل آمن\n\n⚠️ مهم:\n• ❌ لا يوجد استرداد - جميع مبيعات التذاكر نهائية\n• ✅ استبدال التاريخ متاح مرة واحدة إذا تواصلت معنا قبل 3 أيام من موعد الزيارة\n• 📝 طلبات الاستبدال فقط عبر: almufaijer.com/contact\n\n📄 اقرأ السياسة الكاملة: /terms\n\nهل لديك مشاكل أخرى؟"
      },
      ticketsInfo: {
        en: "For tickets and QR codes:\n\n• Check your email for the confirmation\n• Go to 'My Tickets' and enter your email\n• Download or screenshot your QR code\n• Show QR code at the entrance\n\nCan't find your ticket?",
        ar: "للتذاكر ورموز QR:\n\n• تحقق من بريدك الإلكتروني للتأكيد\n• اذهب إلى 'تذاكري' وأدخل بريدك\n• حمّل أو التقط صورة لرمز QR\n• أظهر الرمز عند المدخل\n\nلم تجد تذكرتك؟"
      },
      hoursInfo: {
        en: "⏰ Operating Hours:\n\n📅 Open Daily (including Fridays)\n🕒 3:00 PM - 12:00 AM (Midnight)\n\n⏳ Tickets are valid all day during operating hours",
        ar: "⏰ ساعات العمل:\n\n📅 مفتوح يومياً (بما في ذلك الجمعة)\n🕒 ٣:٠٠ مساءً - ١٢:٠٠ منتصف الليل\n\n⏳ التذاكر صالحة طوال اليوم خلال ساعات العمل"
      },
      locationInfo: {
        en: "📍 Location:\n\nSouq Almufaijer Heritage Site\nAlmufaijer, Saudi Arabia\n\n📞 Phone: +966 50 101 8811\n📧 Email: info@almufaijer.com\n\nFind us on Google Maps for directions!",
        ar: "📍 الموقع:\n\nموقع سوق المفيجر التراثي\nالمفيجر، المملكة العربية السعودية\n\n📞 الهاتف: ٨٨١١ ١٠١ ٥٠ ٩٦٦+\n📧 البريد: info@almufaijer.com\n\nابحث عنا في خرائط جوجل للاتجاهات!"
      },
      thankYou: {
        en: "Great! Is there anything else I can help you with?",
        ar: "رائع! هل هناك شيء آخر يمكنني مساعدتك به؟"
      },
      needMoreHelp: {
        en: "For further assistance, please visit our Contact page or call us directly.",
        ar: "للمزيد من المساعدة، يرجى زيارة صفحة التواصل أو الاتصال بنا مباشرة."
      },
    };
    return translations[key]?.[isArabic ? 'ar' : 'en'] || key;
  }, [isArabic]);

  // Initialize with welcome message
  useEffect(() => {
    if (!hasInitialized.current && messages.length === 0) {
      hasInitialized.current = true;
      addBotMessageDirect(t('welcome'), getMainMenuButtonsDirect());
    }
  }, []);

  // Helper to add bot message directly (for initialization)
  const addBotMessageDirect = (content: string, buttons?: ChatButton[]) => {
    setMessages(prev => [...prev, {
      id: generateId(),
      type: 'bot',
      content,
      buttons,
      timestamp: new Date()
    }]);
  };

  const getMainMenuButtonsDirect = (): ChatButton[] => [
    { id: 'booking', label: isArabic ? '🎟️ مساعدة الحجز' : '🎟️ Booking Help', action: 'booking' },
    { id: 'payment', label: isArabic ? '💳 مشاكل الدفع' : '💳 Payment Issues', action: 'payment' },
    { id: 'tickets', label: isArabic ? '📱 رمز QR / التذاكر' : '📱 QR Code / Tickets', action: 'tickets' },
    { id: 'hours', label: isArabic ? '🕐 ساعات العمل' : '🕐 Operating Hours', action: 'hours' },
    { id: 'location', label: isArabic ? '📍 الموقع' : '📍 Location', action: 'location' },
  ];

  const getMainMenuButtons = useCallback((): ChatButton[] => [
    { id: 'booking', label: t('booking'), action: 'booking' },
    { id: 'payment', label: t('payment'), action: 'payment' },
    { id: 'tickets', label: t('tickets'), action: 'tickets' },
    { id: 'hours', label: t('hours'), action: 'hours' },
    { id: 'location', label: t('location'), action: 'location' },
  ], [t]);

  const getHelpfulButtons = useCallback((): ChatButton[] => [
    { id: 'yes', label: t('yes'), action: 'helpful_yes' },
    { id: 'no', label: t('no'), action: 'helpful_no' },
    { id: 'menu', label: t('backToMenu'), action: 'menu' },
  ], [t]);

  const addBotMessage = useCallback((content: string, buttons?: ChatButton[]) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: generateId(),
        type: 'bot',
        content,
        buttons,
        timestamp: new Date()
      }]);
      setIsTyping(false);
      if (!isOpen) setUnreadCount(prev => prev + 1);
    }, 500);
  }, [isOpen]);

  const addUserMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, {
      id: generateId(),
      type: 'user',
      content,
      timestamp: new Date()
    }]);
  }, []);

  const handleButtonClick = useCallback((action: string) => {
    switch (action) {
      case 'booking':
        addUserMessage(t('booking'));
        setState('booking');
        addBotMessage(t('bookingInfo'), [
          { id: 'book_now', label: isArabic ? '🎟️ احجز الآن' : '🎟️ Book Now', action: 'go_booking' },
          ...getHelpfulButtons()
        ]);
        break;
      case 'payment':
        addUserMessage(t('payment'));
        setState('payment');
        addBotMessage(t('paymentInfo'), getHelpfulButtons());
        break;
      case 'tickets':
        addUserMessage(t('tickets'));
        setState('tickets');
        addBotMessage(t('ticketsInfo'), [
          { id: 'my_tickets', label: isArabic ? '📱 تذاكري' : '📱 My Tickets', action: 'go_tickets' },
          ...getHelpfulButtons()
        ]);
        break;
      case 'hours':
        addUserMessage(t('hours'));
        setState('hours');
        addBotMessage(t('hoursInfo'), getHelpfulButtons());
        break;
      case 'location':
        addUserMessage(t('location'));
        setState('location');
        addBotMessage(t('locationInfo'), [
          { id: 'contact', label: isArabic ? '📞 تواصل معنا' : '📞 Contact Us', action: 'go_contact' },
          ...getHelpfulButtons()
        ]);
        break;
      case 'menu':
        setState('menu');
        addBotMessage(t('welcome'), getMainMenuButtons());
        break;
      case 'helpful_yes':
        addUserMessage(t('yes'));
        addBotMessage(t('thankYou'), getMainMenuButtons());
        setState('menu');
        break;
      case 'helpful_no':
        addUserMessage(t('no'));
        // Direct to contact page instead of live support
        addBotMessage(t('needMoreHelp'), [
          { id: 'contact', label: isArabic ? '📞 تواصل معنا' : '📞 Contact Us', action: 'go_contact' },
          { id: 'menu', label: t('backToMenu'), action: 'menu' },
        ]);
        setState('menu');
        break;
      case 'go_booking':
        window.location.href = '/book';
        break;
      case 'go_tickets':
        window.location.href = '/my-tickets';
        break;
      case 'go_contact':
        window.location.href = '/contact';
        break;
    }
  }, [t, isArabic, addUserMessage, addBotMessage, getMainMenuButtons, getHelpfulButtons]);

  const handleUserInput = useCallback((input: string) => {
    addUserMessage(input);

    // Keyword matching for general queries
    const lowerInput = input.toLowerCase();
    const arabicInput = input;

    const keywords = {
      booking: ['book', 'reserve', 'ticket', 'حجز', 'تذكرة', 'احجز'],
      payment: ['pay', 'price', 'cost', 'money', 'refund', 'cancel', 'exchange', 'return', 'دفع', 'سعر', 'مال', 'استرداد', 'إلغاء', 'استبدال', 'ارجاع', 'تغيير'],
      tickets: ['qr', 'code', 'download', 'email', 'confirmation', 'رمز', 'تحميل', 'تأكيد'],
      hours: ['hour', 'open', 'close', 'time', 'when', 'ساعة', 'متى', 'مواعيد', 'وقت'],
      location: ['where', 'location', 'address', 'map', 'direction', 'أين', 'موقع', 'عنوان', 'خريطة'],
    };

    for (const [action, words] of Object.entries(keywords)) {
      if (words.some(word => lowerInput.includes(word) || arabicInput.includes(word))) {
        handleButtonClick(action);
        return;
      }
    }

    // Default response - direct to contact for help
    addBotMessage(
      isArabic
        ? 'عذراً، لم أفهم سؤالك. يرجى اختيار من الخيارات أدناه أو زيارة صفحة التواصل.'
        : "I'm sorry, I didn't understand your question. Please choose from the options below or visit our Contact page.",
      [
        ...getMainMenuButtons(),
        { id: 'contact', label: isArabic ? '📞 تواصل معنا' : '📞 Contact Us', action: 'go_contact' },
      ]
    );
  }, [isArabic, addUserMessage, addBotMessage, handleButtonClick, getMainMenuButtons]);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
    if (!isOpen) setUnreadCount(0);
  }, [isOpen]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setState('welcome');
    setTimeout(() => {
      addBotMessage(t('welcome'), getMainMenuButtons());
    }, 100);
  }, [t, addBotMessage, getMainMenuButtons]);

  return {
    messages,
    isOpen,
    isTyping,
    state,
    unreadCount,
    toggleChat,
    handleButtonClick,
    handleUserInput,
    resetChat,
  };
}
