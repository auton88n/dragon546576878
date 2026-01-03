import { useState, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from './useLanguage';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  role?: 'bot' | 'admin'; // Distinguish automated bot vs human admin
  content: string;
  senderName?: string;
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

type ChatState = 'welcome' | 'menu' | 'booking' | 'payment' | 'tickets' | 'hours' | 'location' | 'transfer' | 'transfer_form' | 'transferred' | 'email_lookup';

const generateId = () => Math.random().toString(36).substring(2, 11);
const STORAGE_KEY = 'support_conversation_id';

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
  const messagesRef = useRef<ChatMessage[]>([]);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
        en: "✅ You're now connected to live support!\n\nOur team will reply here shortly. Please stay on this page.\n\nReference: ",
        ar: "✅ أنت الآن متصل بالدعم المباشر!\n\nسيرد فريقنا هنا قريباً. يرجى البقاء في هذه الصفحة.\n\nالمرجع: "
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
      existingConversation: {
        en: "📧 Have an existing conversation?",
        ar: "📧 لديك محادثة سابقة؟"
      },
      enterLookupEmail: {
        en: "Enter your email to find your conversation:",
        ar: "أدخل بريدك الإلكتروني للعثور على محادثتك:"
      },
      noConversationFound: {
        en: "No active conversation found with this email. Would you like to start a new one?",
        ar: "لم يتم العثور على محادثة نشطة بهذا البريد. هل تريد بدء محادثة جديدة؟"
      },
      conversationRestored: {
        en: "✅ Your conversation has been restored! You can continue chatting with our support team.",
        ar: "✅ تم استعادة محادثتك! يمكنك متابعة الدردشة مع فريق الدعم."
      },
    };
    return translations[key]?.[isArabic ? 'ar' : 'en'] || key;
  }, [isArabic]);

  // Restore conversation from localStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      restoreConversation(savedId);
    } else if (!hasInitialized.current && messages.length === 0) {
      hasInitialized.current = true;
      addBotMessageDirect(t('welcome'), getMainMenuButtonsDirect());
    }
  }, []);

  // Helper to add bot message directly (for initialization)
  const addBotMessageDirect = (content: string, buttons?: ChatButton[], role: 'bot' | 'admin' = 'bot', senderName?: string) => {
    setMessages(prev => [...prev, {
      id: generateId(),
      type: 'bot',
      role,
      content,
      senderName,
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
    { id: 'transfer', label: isArabic ? '💬 تحدث مع الدعم' : '💬 Talk to Support', action: 'transfer' },
  ];

  // Restore conversation from database
  const restoreConversation = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        localStorage.removeItem(STORAGE_KEY);
        hasInitialized.current = true;
        addBotMessageDirect(t('welcome'), getMainMenuButtonsDirect());
        return;
      }

      // Check if conversation is still active
      if (data.status === 'closed' || data.status === 'resolved') {
        localStorage.removeItem(STORAGE_KEY);
        hasInitialized.current = true;
        addBotMessageDirect(t('welcome'), getMainMenuButtonsDirect());
        return;
      }

      // Restore messages
      const savedMessages = typeof data.messages === 'string'
        ? JSON.parse(data.messages)
        : data.messages || [];

      const restoredMessages: ChatMessage[] = savedMessages.map((m: { type: string; content: string; timestamp: string; sender_name?: string }) => ({
        id: generateId(),
        type: m.type === 'admin' ? 'bot' : m.type as 'bot' | 'user',
        role: m.type === 'admin' ? 'admin' : 'bot',
        content: m.content,
        senderName: m.sender_name,
        timestamp: new Date(m.timestamp)
      }));

      setMessages(restoredMessages);
      setConversationId(id);
      setState('transferred');
      setCustomerInfo({
        name: data.customer_name || '',
        email: data.customer_email || ''
      });
      hasInitialized.current = true;

      // Add restored notification
      setTimeout(() => {
        addBotMessageDirect(t('conversationRestored'));
      }, 300);
    } catch (err) {
      console.error('Failed to restore conversation:', err);
      localStorage.removeItem(STORAGE_KEY);
      hasInitialized.current = true;
      addBotMessageDirect(t('welcome'), getMainMenuButtonsDirect());
    }
  };

  // Lookup conversation by email
  const lookupConversationByEmail = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('customer_email', email.toLowerCase())
        .in('status', ['active', 'transferred'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  };

  // Subscribe to conversation updates for admin replies
  useEffect(() => {
    if (!conversationId) return;

    console.log('Subscribing to conversation:', conversationId);

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_conversations',
          filter: `id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Received update:', payload);
          const updatedConversation = payload.new as { messages?: string | unknown[]; status?: string };
          
          // Check if conversation was closed
          if (updatedConversation.status === 'closed' || updatedConversation.status === 'resolved') {
            localStorage.removeItem(STORAGE_KEY);
            return;
          }

          const allMessages = typeof updatedConversation.messages === 'string'
            ? JSON.parse(updatedConversation.messages)
            : updatedConversation.messages || [];
          
          // Find admin messages not yet in our chat
          const currentMessages = messagesRef.current;
          const newAdminMessages = allMessages.filter(
            (m: { type: string; content: string; timestamp: string }) => 
              m.type === 'admin' && 
              !currentMessages.some(existing => 
                existing.role === 'admin' && existing.content === m.content
              )
          );
          
          // Add new admin messages
          newAdminMessages.forEach((adminMsg: { content: string; timestamp: string; sender_name?: string }) => {
            setMessages(prev => {
              // Double-check to avoid duplicates
              if (prev.some(m => m.role === 'admin' && m.content === adminMsg.content)) {
                return prev;
              }
              return [...prev, {
                id: generateId(),
                type: 'bot' as const,
                role: 'admin' as const,
                content: adminMsg.content,
                senderName: adminMsg.sender_name || (isArabic ? 'فريق الدعم' : 'Support Team'),
                timestamp: new Date(adminMsg.timestamp)
              }];
            });
            if (!isOpen) setUnreadCount(prev => prev + 1);
          });
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, isOpen, isArabic]);

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

  const addBotMessage = useCallback((content: string, buttons?: ChatButton[], role: 'bot' | 'admin' = 'bot', senderName?: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: generateId(),
        type: 'bot',
        role,
        content,
        senderName,
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

  // Save conversation ID to localStorage
  const saveConversationId = (id: string) => {
    setConversationId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

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
      case 'email_lookup':
        setState('email_lookup');
        addBotMessage(t('enterLookupEmail'));
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

    // Handle email lookup state
    if (state === 'email_lookup') {
      const emailMatch = input.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        setIsTyping(true);
        const conversation = await lookupConversationByEmail(emailMatch[0]);
        setIsTyping(false);

        if (conversation) {
          // Restore the found conversation
          await restoreConversation(conversation.id);
        } else {
          addBotMessage(t('noConversationFound'), [
            { id: 'transfer', label: t('talkToSupport'), action: 'transfer' },
            { id: 'menu', label: t('backToMenu'), action: 'menu' },
          ]);
          setState('menu');
        }
        return;
      } else {
        addBotMessage(t('invalidEmail'));
        return;
      }
    }

    if (state === 'transfer_form') {
      // Simple keyword matching for common issues
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
              customer_email: emailMatch[0].toLowerCase(),
              messages: JSON.stringify(messages.map(m => ({
                type: m.type,
                content: m.content,
                timestamp: m.timestamp
              }))),
              status: 'transferred',
              transferred_at: new Date().toISOString()
            }]);

          if (error) throw error;

          saveConversationId(newId);
          setState('transferred');
          addBotMessage(t('transferSuccess') + newId.slice(0, 8).toUpperCase());
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

    // Handle user messages in transferred state - update conversation
    if (state === 'transferred' && conversationId) {
      try {
        // Fetch current messages and append new one
        const { data } = await supabase
          .from('support_conversations')
          .select('messages')
          .eq('id', conversationId)
          .single();

        if (data) {
          const currentMessages = typeof data.messages === 'string'
            ? JSON.parse(data.messages)
            : data.messages || [];

          const newMessage = {
            type: 'user',
            content: input,
            timestamp: new Date().toISOString()
          };

          await supabase
            .from('support_conversations')
            .update({
              messages: JSON.stringify([...currentMessages, newMessage]),
              updated_at: new Date().toISOString()
            })
            .eq('id', conversationId);
        }
      } catch (err) {
        console.error('Failed to sync message:', err);
      }
      return; // Don't process keywords when in live support
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
  }, [state, customerInfo, messages, conversationId, t, isArabic, addUserMessage, addBotMessage, handleButtonClick, getMainMenuButtons]);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
    if (!isOpen) setUnreadCount(0);
  }, [isOpen]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setState('welcome');
    setCustomerInfo({ name: '', email: '' });
    setConversationId(null);
    localStorage.removeItem(STORAGE_KEY);
    setTimeout(() => {
      addBotMessage(t('welcome'), getMainMenuButtons());
    }, 100);
  }, [t, addBotMessage, getMainMenuButtons]);

  return {
    messages,
    isOpen,
    isTyping,
    state,
    conversationId,
    unreadCount,
    toggleChat,
    handleButtonClick,
    handleUserInput,
    resetChat,
  };
}
