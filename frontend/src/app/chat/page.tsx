'use client';

import { ChatInterface } from '@/components/chat/chat-interface';

export default function ChatPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold">AI Assistant</h1>
        <p className="text-muted-foreground">
          Get instant answers to your onboarding questions
        </p>
      </div>
      <div className="flex-1">
        <ChatInterface />
      </div>
    </div>
  );
}
