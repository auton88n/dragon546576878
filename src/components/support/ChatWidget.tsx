import { useEffect, useRef } from 'react';
import { MessageCircle, X, RotateCcw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChatbot, ChatMessage, ChatButton } from '@/hooks/useChatbot';
import { useLanguage } from '@/hooks/useLanguage';
import { useState } from 'react';

const ChatBubble = ({ message, onButtonClick }: { 
  message: ChatMessage; 
  onButtonClick: (action: string) => void;
}) => {
  const isBot = message.type === 'bot';
  
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-3`}>
      <div className={`max-w-[85%] ${isBot ? 'order-2' : ''}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
            isBot
              ? 'bg-secondary text-secondary-foreground rounded-tl-sm'
              : 'bg-primary text-primary-foreground rounded-tr-sm'
          }`}
        >
          {message.content}
        </div>
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

const ChatWidget = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isOpen,
    isTyping,
    unreadCount,
    toggleChat,
    handleButtonClick,
    handleUserInput,
    resetChat,
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
                <p className="text-xs text-primary-foreground/70">
                  {isArabic ? 'نحن هنا للمساعدة' : "We're here to help"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={resetChat}
                title={isArabic ? 'إعادة بدء المحادثة' : 'Restart chat'}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={toggleChat}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {messages.map((message) => (
              <ChatBubble 
                key={message.id} 
                message={message} 
                onButtonClick={handleButtonClick}
              />
            ))}
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
