import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, RotateCcw, Send, User, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChatbot, ChatMessage, ChatButton } from '@/hooks/useChatbot';
import { useLanguage } from '@/hooks/useLanguage';
import { format, isToday, isYesterday } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const formatMessageTime = (date: Date, isArabic: boolean) => {
  return format(date, 'h:mm a', { locale: isArabic ? ar : enUS });
};

const formatDateLabel = (date: Date, isArabic: boolean) => {
  if (isToday(date)) return isArabic ? 'اليوم' : 'Today';
  if (isYesterday(date)) return isArabic ? 'أمس' : 'Yesterday';
  return format(date, 'dd MMM yyyy', { locale: isArabic ? ar : enUS });
};

const DateSeparator = ({ date, isArabic }: { date: Date; isArabic: boolean }) => (
  <div className="flex items-center justify-center my-4">
    <div className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
      {formatDateLabel(date, isArabic)}
    </div>
  </div>
);

const ChatBubble = ({ message, onButtonClick, isArabic }: { 
  message: ChatMessage; 
  onButtonClick: (action: string) => void;
  isArabic: boolean;
}) => {
  const isBot = message.type === 'bot';
  const isAdmin = message.role === 'admin';
  
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-3`}>
      {/* Admin avatar */}
      {isAdmin && (
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2 rtl:mr-0 rtl:ml-2 shrink-0">
          <User className="w-4 h-4 text-green-600" />
        </div>
      )}
      
      <div className="max-w-[85%]">
        {/* Admin header with name and time */}
        {isAdmin && (
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
            <span className="font-medium text-green-700">
              {message.senderName || (isArabic ? 'فريق الدعم' : 'Support Team')}
            </span>
            <span>{formatMessageTime(message.timestamp, isArabic)}</span>
          </div>
        )}
        
        <div
          className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
            isAdmin
              ? 'bg-green-50 border border-green-200 text-green-900 rounded-tl-sm'
              : isBot
                ? 'bg-secondary text-secondary-foreground rounded-tl-sm'
                : 'bg-primary text-white rounded-tr-sm'
          }`}
        >
          {message.content}
        </div>
        
        {/* Timestamp for non-admin bot messages */}
        {isBot && !isAdmin && (
          <div className="text-[10px] text-muted-foreground mt-1">
            {formatMessageTime(message.timestamp, isArabic)}
          </div>
        )}
        
        {/* Timestamp for user messages */}
        {!isBot && (
          <div className={`text-[10px] text-muted-foreground mt-1 ${isArabic ? 'text-left' : 'text-right'}`}>
            {formatMessageTime(message.timestamp, isArabic)}
          </div>
        )}
        
        {message.buttons && message.buttons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.buttons.map((btn: ChatButton) => (
              <button
                key={btn.id}
                onClick={() => onButtonClick(btn.action)}
                className="px-3 py-1.5 text-xs font-medium bg-background border border-border rounded-full hover:bg-secondary transition-colors"
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TypingIndicator = () => (
  <div className="flex justify-start mb-3">
    <div className="bg-secondary px-4 py-3 rounded-2xl rounded-tl-sm">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

const LiveSupportBanner = ({ 
  conversationId, 
  isArabic,
  onStartNew 
}: { 
  conversationId: string | null; 
  isArabic: boolean;
  onStartNew: () => void;
}) => (
  <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
    <div className="flex items-center gap-2 mb-1">
      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-sm font-medium text-green-800">
        {isArabic ? 'متصل بالدعم المباشر' : 'Connected to Live Support'}
      </span>
    </div>
    <p className="text-xs text-green-600">
      {isArabic 
        ? 'سيرد فريق الدعم هنا مباشرة' 
        : 'Support team will reply here directly'}
    </p>
    {conversationId && (
      <p className="text-xs text-muted-foreground mt-1">
        {isArabic ? 'المرجع:' : 'Ref:'} {conversationId.slice(0, 8).toUpperCase()}
      </p>
    )}
    <Button
      onClick={onStartNew}
      size="sm"
      className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white border-0 font-medium"
    >
      <Plus className="w-4 h-4 me-2" />
      {isArabic ? 'بدء محادثة جديدة' : 'Start New Conversation'}
    </Button>
  </div>
);

const ChatWidget = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
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
    startNewConversation,
  } = useChatbot();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      handleUserInput(inputValue.trim());
      setInputValue('');
    }
  };

  // Group messages by date for separators
  const getMessagesWithDateSeparators = () => {
    const result: (ChatMessage | { type: 'date-separator'; date: Date; id: string })[] = [];
    let lastDate: string | null = null;

    messages.forEach((message) => {
      const messageDate = format(message.timestamp, 'yyyy-MM-dd');
      if (messageDate !== lastDate) {
        result.push({
          type: 'date-separator',
          date: message.timestamp,
          id: `date-${messageDate}`
        });
        lastDate = messageDate;
      }
      result.push(message);
    });

    return result;
  };

  const messagesWithSeparators = getMessagesWithDateSeparators();

  return (
    <>
      {/* Chat Dialog */}
      {isOpen && (
        <div 
          className={`fixed bottom-20 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[70vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300 ${
            isArabic ? 'left-4 md:left-6' : 'right-4 md:right-6'
          }`}
        >
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  {isArabic ? 'دعم سوق المفيجر' : 'Souq Almufaijer Support'}
                </h3>
                <p className="text-xs text-primary-foreground/70 flex items-center gap-1">
                  {state === 'transferred' ? (
                    <>
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      {isArabic ? 'دعم مباشر' : 'Live Support'}
                    </>
                  ) : (
                    isArabic ? 'نحن هنا للمساعدة' : "We're here to help"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/20 rounded-lg"
                onClick={resetChat}
                title={isArabic ? 'إعادة بدء المحادثة' : 'Restart chat'}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/20 rounded-lg"
                onClick={toggleChat}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Live Support Banner */}
          {state === 'transferred' && (
            <LiveSupportBanner 
              conversationId={conversationId} 
              isArabic={isArabic} 
              onStartNew={startNewConversation}
            />
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {messagesWithSeparators.map((item) => {
              if ('type' in item && item.type === 'date-separator') {
                return <DateSeparator key={item.id} date={item.date} isArabic={isArabic} />;
              }
              const message = item as ChatMessage;
              return (
                <ChatBubble 
                  key={message.id} 
                  message={message} 
                  onButtonClick={handleButtonClick}
                  isArabic={isArabic}
                />
              );
            })}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-background">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isArabic ? 'اكتب رسالتك...' : 'Type your message...'}
                className="flex-1"
              />
              <Button type="submit" size="icon" className="shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className={`fixed bottom-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-105 ${
          isArabic ? 'left-4 md:left-6' : 'right-4 md:right-6'
        }`}
        aria-label={isArabic ? 'فتح الدردشة' : 'Open chat'}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </>
        )}
      </button>
    </>
  );
};

export default ChatWidget;
