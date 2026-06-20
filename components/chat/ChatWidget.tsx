'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();
  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* 1. Floating Action Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-black text-white p-4 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* 2. Main Floating Chat Widget Window */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[500px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header Bar */}
          <div className="bg-black text-white p-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-sm">Portfolio Assistant</h3>
              <p className="text-xs text-gray-400">Powered by Gemini AI</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:text-gray-300">
              <X size={18} />
            </button>
          </div>

          {/* Conversation Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <p className="text-sm text-gray-500 text-center mt-4">
                Ask me anything about my projects, technical stack, or background!
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-xl text-sm max-w-[85%] ${
                  m.role === 'user' ? 'bg-black text-white' : 'bg-gray-200 text-gray-800'
                }`}>
                  {m.parts.map((part, i) =>
                    part.type === 'text' ? <span key={`${m.id}-${i}`}>{part.text}</span> : null
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-xs text-gray-400 italic animate-pulse">Typing...</div>
            )}
          </div>

          {/* Prompt Submission Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const text = input.trim();
              if (!text) return;
              sendMessage({ text });
              setInput('');
            }}
            className="p-3 border-t border-gray-200 flex gap-2 bg-white"
          >
            <input
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black"
              value={input}
              placeholder="Ask a question..."
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
