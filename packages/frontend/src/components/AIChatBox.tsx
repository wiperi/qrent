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
    messages,
    isLoading,
    closeChat,
    openChat,
    addMessage,
    setLoading,
  } = useAIChatStore();

  const [input, setInput] = useState('');
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

  // Handle close chatbox events
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close chatbox when clicking outside of it
      if (isOpen && chatBoxRef.current && !chatBoxRef.current.contains(event.target as Node)) {
        // Don't close if clicking on the toggle button
        // const toggleButton = document.querySelector('[aria-label="Open AI Assistant"]');
        // if (toggleButton && toggleButton.contains(event.target as Node)) {
        //   return;
        // }
        closeChat();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeChat();
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, closeChat]);

  // Prevent internal clicks from closing chat (except for close button)
  useEffect(() => {
    const chatElement = chatBoxRef.current;
    if (!chatElement || !isOpen) return;

    const handleInternalClick = (e: MouseEvent) => {
      // Don't stop propagation if clicking on the close button or its children
      const target = e.target as HTMLElement;
      const closeButton = target.closest('button[title="Collapse chat"]');
      if (closeButton) return;
      
      e.stopPropagation();
    };
    
    chatElement.addEventListener('click', handleInternalClick, true);
    return () => chatElement.removeEventListener('click', handleInternalClick, true);
  }, [isOpen]);

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

  useEffect(() => {
    if (!isHomePage && isOpen) {
      closeChat();
    }
  }, [pathname, isHomePage, isOpen, closeChat]);

  if (!isHomePage) return null;

  return (
    <>
      {/* Chat box - independent floating window */}
      <div
        ref={chatBoxRef}
        className={cn(
          'fixed z-50 flex flex-col bg-background shadow-2xl transition-all duration-300 ease-in-out',
          'rounded-2xl border border-border overflow-hidden',
          // Positioning - bottom right corner
          'bottom-0 right-0 md:bottom-auto md:right-7 md:top-22',
          // Size constraints - 20% larger: w-80->w-96, h-96->h-[28rem]
          'max-w-96 h-[calc(98vh-5rem)] ',
          // Visibility
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-x-4 pointer-events-none',
        )}
      >

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
