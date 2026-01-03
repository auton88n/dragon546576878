import { useState, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from './useLanguage';
import { supabase } from '@/integrations/supabase/client';

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

export interface CustomerInfo {
  name: string;
  email: string;
  phone?: string;
}

type ChatState = 'welcome' | 'menu' | 'booking' | 'payment' | 'tickets' | 'hours' | 'location' | 'transfer' | 'transfer_form' | 'transferred';

const generateId = () => Math.random().toString(36).substring(2, 11);

export function useChatbot() {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<ChatState>('welcome');
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: '', email: '' });
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
      talkToSupport: {
        en: "💬 Talk to Support",
        ar: "💬 تحدث مع الدعم"
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
        en: "⏰ Operating Hours:\n\n📅 Saturday - Thursday: 9:00 AM - 6:00 PM\n🕌 Friday: Closed\n\n⏳ Time slots are available every hour from 9 AM to 5 PM (last entry)",
        ar: "⏰ ساعات العمل:\n\n📅 السبت - الخميس: ٩:٠٠ صباحاً - ٦:٠٠ مساءً\n🕌 الجمعة: مغلق\n\n⏳ الفترات متاحة كل ساعة من ٩ صباحاً إلى ٥ مساءً (آخر دخول)"
      },
      locationInfo: {
        en: "📍 Location:\n\nSouq Almufaijer Heritage Site\nAlmufaijer, Saudi Arabia\n\n📞 Phone: +966 50 101 8811\n📧 Email: info@almufaijer.com\n\nFind us on Google Maps for directions!",
        ar: "📍 الموقع:\n\nموقع سوق المفيجر التراثي\nالمفيجر، المملكة العربية السعودية\n\n📞 الهاتف: ٨٨١١ ١٠١ ٥٠ ٩٦٦+\n📧 البريد: info@almufaijer.com\n\nابحث عنا في خرائط جوجل للاتجاهات!"
      },
      transferPrompt: {
        en: "I'll connect you with our support team. Please provide your details:",
        ar: "سأقوم بتوصيلك بفريق الدعم. يرجى تقديم بياناتك:"
      },
      transferSuccess: {
        en: "✅ Your message has been sent to our support team!\n\nWe'll respond within 24 hours at the email you provided.\n\nReference: ",
        ar: "✅ تم إرسال رسالتك لفريق الدعم!\n\nسنرد خلال ٢٤ ساعة على البريد الإلكتروني الذي قدمته.\n\nالمرجع: "
      },
      thankYou: {
        en: "Great! Is there anything else I can help you with?",
        ar: "رائع! هل هناك شيء آخر يمكنني مساعدتك به؟"
      },
      enterName: {
        en: "What is your name?",
        ar: "ما هو اسمك؟"
      },
      enterEmail: {
        en: "What is your email address?",
        ar: "ما هو بريدك الإلكتروني؟"
      },
      enterMessage: {
        en: "Please describe your issue or question:",
        ar: "يرجى وصف مشكلتك أو سؤالك:"
      },
      invalidEmail: {
        en: "Please enter a valid email address.",
        ar: "يرجى إدخال بريد إلكتروني صحيح."
      },
      submitRequest: {
        en: "📤 Submit Request",
        ar: "📤 إرسال الطلب"
      },
    };
    return translations[key]?.[isArabic ? 'ar' : 'en'] || key;
  }, [isArabic]);

  // Initialize with welcome message (only once)
  useEffect(() => {
    if (!hasInitialized.current && messages.length === 0) {
      hasInitialized.current = true;
      addBotMessage(t('welcome'), getMainMenuButtons());
    }
  }, []);

  const getMainMenuButtons = useCallback((): ChatButton[] => [
    { id: 'booking', label: t('booking'), action: 'booking' },
    { id: 'payment', label: t('payment'), action: 'payment' },
    { id: 'tickets', label: t('tickets'), action: 'tickets' },
    { id: 'hours', label: t('hours'), action: 'hours' },
    { id: 'location', label: t('location'), action: 'location' },
    { id: 'transfer', label: t('talkToSupport'), action: 'transfer' },
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
      case 'transfer':
        addUserMessage(t('talkToSupport'));
        setState('transfer_form');
        addBotMessage(t('transferPrompt'));
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
        setState('transfer_form');
        addBotMessage(t('transferPrompt'));
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

  const handleUserInput = useCallback(async (input: string) => {
    addUserMessage(input);

    if (state === 'transfer_form') {
      // Simple keyword matching for common issues
      const lowerInput = input.toLowerCase();
      
      // Check for email pattern
      const emailMatch = input.match(/[\w.-]+@[\w.-]+\.\w+/);
      
      if (emailMatch && !customerInfo.email) {
        setCustomerInfo(prev => ({ ...prev, email: emailMatch[0] }));
      }
      
      if (!customerInfo.name && !emailMatch) {
        setCustomerInfo(prev => ({ ...prev, name: input }));
        addBotMessage(t('enterEmail'));
        return;
      }
      
      if (customerInfo.name && !customerInfo.email && emailMatch) {
        // Validate email and save conversation
        try {
          // Generate UUID client-side to avoid needing SELECT after INSERT
          const newId = crypto.randomUUID();

          const { error } = await supabase
            .from('support_conversations')
            .insert([{
              id: newId,
              customer_name: customerInfo.name,
              customer_email: emailMatch[0],
              messages: JSON.stringify(messages.map(m => ({
                type: m.type,
                content: m.content,
                timestamp: m.timestamp
              }))),
              status: 'transferred',
              transferred_at: new Date().toISOString()
            }]);

          if (error) throw error;

          setConversationId(newId);
          setState('transferred');
          addBotMessage(
            t('transferSuccess') + newId.slice(0, 8).toUpperCase(),
            getMainMenuButtons()
          );
        } catch (err) {
          console.error('Failed to save conversation:', err);
          addBotMessage(
            isArabic 
              ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.' 
              : 'Sorry, an error occurred. Please try again.',
            getMainMenuButtons()
          );
        }
        return;
      }

      // If we have name but no email yet
      if (customerInfo.name && !customerInfo.email) {
        addBotMessage(t('invalidEmail'));
        return;
      }
    }

    // Keyword matching for general queries
    const lowerInput = input.toLowerCase();
    const arabicInput = input;

    const keywords = {
      booking: ['book', 'reserve', 'ticket', 'حجز', 'تذكرة', 'احجز'],
      payment: ['pay', 'price', 'cost', 'money', 'refund', 'cancel', 'exchange', 'return', 'دفع', 'سعر', 'مال', 'استرداد', 'إلغاء', 'استبدال', 'ارجاع', 'تغيير'],
      tickets: ['qr', 'code', 'download', 'email', 'confirmation', 'رمز', 'تحميل', 'تأكيد'],
      hours: ['hour', 'open', 'close', 'time', 'when', 'ساعة', 'متى', 'مواعيد', 'وقت'],
      location: ['where', 'location', 'address', 'map', 'direction', 'أين', 'موقع', 'عنوان', 'خريطة'],
      transfer: ['human', 'agent', 'support', 'help', 'person', 'talk', 'بشري', 'دعم', 'مساعدة', 'تحدث'],
    };

    for (const [action, words] of Object.entries(keywords)) {
      if (words.some(word => lowerInput.includes(word) || arabicInput.includes(word))) {
        handleButtonClick(action);
        return;
      }
    }

    // Default response
    addBotMessage(
      isArabic
        ? 'عذراً، لم أفهم سؤالك. يرجى اختيار من الخيارات أدناه أو التحدث مع فريق الدعم.'
        : "I'm sorry, I didn't understand your question. Please choose from the options below or talk to our support team.",
      getMainMenuButtons()
    );
  }, [state, customerInfo, messages, t, isArabic, addUserMessage, addBotMessage, handleButtonClick, getMainMenuButtons]);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
    if (!isOpen) setUnreadCount(0);
  }, [isOpen]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setState('welcome');
    setCustomerInfo({ name: '', email: '' });
    setConversationId(null);
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
