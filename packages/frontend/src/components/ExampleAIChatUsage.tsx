'use client';

import { useAIChatStore } from '@/lib/ai-chat-store';
import { Button } from './ui/button';

/**
 * Example component showing how to use AI Chat from anywhere in the app
 *
 * This demonstrates how any component can:
 * 1. Open the chat
 * 2. Close the chat
 * 3. Toggle the chat
 * 4. Add messages programmatically
 */
export function ExampleAIChatUsage() {
  const { openChat, toggleChat, addMessage } = useAIChatStore();

  const handleOpenWithMessage = () => {
    // Open chat and add a pre-filled message
    addMessage({
      role: 'user',
      content: 'I need help finding a property',
    });
    openChat();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">AI Chat Integration Examples</h3>

      {/* Example 1: Simple toggle */}
      <Button onClick={toggleChat}>
        Toggle AI Assistant
      </Button>

      {/* Example 2: Open with context */}
      <Button onClick={handleOpenWithMessage} variant="outline">
        Get Help Finding Property
      </Button>

      {/* Example 3: Open from help section */}
      <Button
        onClick={() => {
          addMessage({
            role: 'assistant',
            content: 'Hi! How can I help you today?',
          });
          openChat();
        }}
        variant="secondary"
      >
        Talk to Assistant
      </Button>
    </div>
  );
}
