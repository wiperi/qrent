/**
 * AI 聊天框主组件
 * 实现可拖拽调整宽度的侧边聊天框，支持桌面端和移动端响应式设计，包含消息展示、输入框和发送功能
 */
'use client';

import { useAIChatStore, type Message } from '@/lib/ai-chat-store';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FiChevronsRight, FiMessageSquare, FiSend } from 'react-icons/fi';
import { RiRobot2Line } from 'react-icons/ri';
import { Button } from './ui/button';

export function AIChatBox() {
  const pathname = usePathname();
  const {
    isOpen,
    width,
    messages,
    isLoading,
    closeChat,
    openChat,
    addMessage,
    setWidth,
    setLoading,
  } = useAIChatStore();

  const [input, setInput] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  // Check if we are on the home page (root or localized root)
  const isHomePage = pathname === '/' || /^\/[a-z]{2}$/.test(pathname);

  // Auto-open on desktop, keep closed on mobile (client-side only to avoid hydration issues)
  useEffect(() => {
    if (isHomePage && !isOpen && window.innerWidth >= 768) {
      openChat();
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userMessage });
    setLoading(true);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history: messages }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      addMessage({ role: 'assistant', content: data.message });
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !chatBoxRef.current) return;

      const windowWidth = window.innerWidth;
      const newWidth = ((windowWidth - e.clientX) / windowWidth) * 100;
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setWidth]);

  useEffect(() => {
    if (!isHomePage && isOpen) {
      closeChat();
    }
  }, [pathname, isHomePage, isOpen, closeChat]);

  if (!isHomePage) return null;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeChat}
        />
      )}

      {/* Chat box */}
      <div
        ref={chatBoxRef}
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full flex-col bg-background shadow-2xl transition-all duration-300 ease-in-out',
          // Hide when closed
          !isOpen && 'pointer-events-none',
          // Mobile: always full width
          isOpen ? 'w-full md:w-auto' : 'w-0',
        )}
        style={{
          // Desktop: use percentage width with minimum
          width: isOpen ? `max(300px, ${width}%)` : '0',
        }}
      >
        {/* Resize handle - desktop only */}
        <div
          className="absolute left-0 top-0 hidden h-full w-1 cursor-ew-resize bg-border hover:bg-primary md:block"
          onMouseDown={handleMouseDown}
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <FiMessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">AI Assistant</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeChat}
            className="h-8 w-8"
            title="Collapse chat"
          >
            <FiChevronsRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <FiMessageSquare className="mb-4 h-12 w-12 opacity-50" />
              <p className="text-sm">
                Hello! I&apos;m your AI assistant. How can I help you today?
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce delay-100">.</span>
                    <span className="animate-bounce delay-200">.</span>
                  </div>
                  AI is typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <Button type="submit" disabled={!input.trim() || isLoading}>
              <FiSend className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const [isMounted, setIsMounted] = useState(false);

  // Only show timestamp on client-side to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div
      className={cn(
        'flex',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {isMounted && (
          <p className="mt-1 text-xs opacity-70">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  );
}

export function AIChatToggleButton() {
  const pathname = usePathname();
  const { isOpen, openChat } = useAIChatStore();

  // Check if we are on the home page (root or localized root)
  const isHomePage = pathname === '/' || /^\/[a-z]{2}$/.test(pathname);

  if (isOpen || !isHomePage) return null;

  return (
    <Button
      onClick={openChat}
      size="icon"
      className={cn(
        'fixed z-[70] shadow-lg transition-all hover:scale-110',
        'rounded-full bg-rainbow-gradient',
        'hover:shadow-2xl',
        'border-2 border-white/30',
        // Mobile: bottom-right corner
        'bottom-6 right-6 h-12 w-12',
        // Desktop: top-right corner
        'md:bottom-auto md:top-24 md:right-8 md:h-14 md:w-14',
      )}
      aria-label="Open AI Assistant"
    >
      <RiRobot2Line className="h-6 w-6 text-white" />
    </Button>
  );
}
