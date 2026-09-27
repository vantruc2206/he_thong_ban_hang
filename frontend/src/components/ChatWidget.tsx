import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User, Bot, Minimize2, ChevronDown } from 'lucide-react';
import { api, ChatMessageItem } from '../services/api';

const SESSION_ID_KEY = 'omni_chat_current_session';
const CUSTOMER_NAME_KEY = 'omni_chat_customer_name';

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onOpenAuth?: () => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, onClose, currentUser, onOpenAuth }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [step, setStep] = useState<'name' | 'chat'>('name');
  const [customerName, setCustomerName] = useState('');
  const [inputName, setInputName] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load user info or existing session on mount or currentUser change
  useEffect(() => {
    if (currentUser) {
      const name = currentUser.full_name || currentUser.email || 'Khách hàng';
      const phoneInfo = currentUser.phone ? ` (${currentUser.phone})` : '';
      const fullName = `${name}${phoneInfo}`;
      setCustomerName(fullName);
      
      const sessId = `user_${currentUser.id}_session`;
      setSessionId(sessId);
      setStep('chat');
      loadMessages(sessId);
    } else {
      setStep('name');
      setSessionId(null);
      setMessages([]);
    }
  }, [currentUser]);

  const loadMessages = async (sessId: string) => {
    try {
      const data = await api.getChatMessages(sessId);
      setMessages(data);
      if (!isOpen || isMinimized) {
        const unread = data.filter(m => m.sender_type === 'admin' && !m.is_read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    }
  };

  // Poll for new messages every 3s
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      loadMessages(sessionId);
    }, 3000);
    return () => clearInterval(interval);
  }, [sessionId, isOpen, isMinimized]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Mark panel as open & focus input
  useEffect(() => {
    if (!isOpen || isMinimized || !sessionId) return;
    setUnreadCount(0);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen, isMinimized, sessionId]);

  const handleStartChat = async () => {
    if (!inputName.trim()) return;
    const nameOnly = inputName.trim();
    const phoneOnly = inputPhone.trim();
    const displayName = phoneOnly ? `${nameOnly} (${phoneOnly})` : nameOnly;
    const sessId = getOrCreateSessionId();
    localStorage.setItem(CUSTOMER_NAME_KEY, displayName);
    setCustomerName(displayName);
    setSessionId(sessId);
    setStep('chat');

    // Send initial welcome message if no messages exist yet
    try {
      const existing = await api.getChatMessages(sessId);
      if (existing.length === 0) {
        const welcomeMsg = await api.sendChatMessage({
          session_id: sessId,
          sender_type: 'system',
          sender_name: 'OMNISTORE Bot',
          message: `Xin chào ${nameOnly}! Tôi là trợ lý OMNISTORE. Tôi có thể giúp gì cho bạn hôm nay? 😊`,
        });
        setMessages([welcomeMsg]);
      } else {
        setMessages(existing);
      }
    } catch (err) {
      console.error('Error starting chat session:', err);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !sessionId || isSending) return;
    const message = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const newMsg = await api.sendChatMessage({
        session_id: sessionId,
        sender_type: 'customer',
        sender_name: customerName || 'Khách hàng',
        message,
      });
      setMessages(prev => [...prev, newMsg]);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      step === 'name' ? handleStartChat() : handleSend();
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      return new Date(timeStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl overflow-hidden flex flex-col shadow-2xl transition-all"
      style={{
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        maxHeight: isMinimized ? 'auto' : '480px',
        height: isMinimized ? 'auto' : '480px',
      }}
    >
      {/* Header */}
      <div className="bg-[#111111] px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-[#0072bc] flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-black truncate">OMNISTORE Support</p>
          <p className="text-emerald-400 text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
            Đang trực tuyến
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
            title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
          >
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

          {!isMinimized && (
            <>
              {step === 'name' || !currentUser ? (
                /* Login Required Screen */
                <div className="flex-1 bg-white flex flex-col items-center justify-center p-6 gap-4 text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-[#0072bc]">
                    <User className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#111111]">Vui lòng Đăng nhập</h4>
                    <p className="text-[11px] text-[#707072] mt-1.5 leading-relaxed px-2">
                      Tính năng trò chuyện trực tuyến dành riêng cho tài khoản thành viên. Vui lòng đăng nhập để trao đổi với tư vấn viên!
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (onOpenAuth) onOpenAuth();
                    }}
                    className="w-full bg-[#0072bc] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#005a96] transition-colors cursor-pointer shadow-sm shadow-blue-200 mt-2 flex items-center justify-center gap-2"
                  >
                    <span>Đăng nhập ngay</span>
                  </button>
                  <p className="text-[10px] text-gray-400 mt-1">Chưa có tài khoản? Bạn có thể Đăng ký nhanh chỉ trong 10 giây</p>
                </div>
              ) : (
                <>
                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto bg-[#f8f9fc] p-3 space-y-2" style={{ minHeight: 0 }}>
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.sender_type === 'customer' ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black ${
                          msg.sender_type === 'admin' ? 'bg-[#0072bc] text-white' : msg.sender_type === 'system' ? 'bg-amber-500 text-white' : 'bg-[#111111] text-white'
                        }`}>
                          {msg.sender_type === 'customer' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                        </div>
                        <div className={`max-w-[75%] space-y-0.5 ${msg.sender_type === 'customer' ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div className={`px-3 py-2 rounded-2xl text-[11px] leading-relaxed whitespace-pre-wrap break-words w-fit ${
                            msg.sender_type === 'customer'
                              ? 'bg-[#111111] text-white rounded-tr-sm'
                              : msg.sender_type === 'system'
                              ? 'bg-amber-50 text-amber-950 border border-amber-200 rounded-tl-sm'
                              : 'bg-white text-[#111111] shadow-xs border border-[#e5e5e5] rounded-tl-sm'
                          }`}>
                            {msg.message}
                          </div>
                          <span className="text-[9px] text-[#aaa] px-1">{formatTime(msg.created_at)}</span>
                        </div>
                      </div>
                    ))}

                    {isSending && (
                      <div className="flex gap-2 flex-row-reverse">
                        <div className="bg-[#111111] border border-[#e5e5e5] rounded-2xl rounded-tr-sm px-3 py-2 flex items-center gap-1 shadow-xs">
                          <span className="w-1.5 h-1.5 bg-[#aaa] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-[#aaa] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-[#aaa] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="bg-white border-t border-[#e5e5e5] p-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="Nhập tin nhắn..."
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-[#f5f5f5] text-xs px-3 py-2 rounded-full border border-transparent focus:border-[#0072bc] focus:ring-1 focus:ring-[#0072bc] focus:bg-white focus:outline-none transition"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || isSending}
                        className="w-8 h-8 rounded-full bg-[#0072bc] hover:bg-[#005c99] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex-shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[9px] text-[#aaa] text-center mt-1.5">Thường phản hồi trong vài phút</p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
  );
};

