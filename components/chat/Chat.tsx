"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { useChat } from "@ai-sdk/react";
import { Send, X } from "lucide-react";
import { useState } from "react";
import type { CHAT_PROFILE_QUERY_RESULT } from "@/sanity.types";
import { useSidebar } from "../ui/sidebar";

export function Chat({
  profile,
}: {
  profile: CHAT_PROFILE_QUERY_RESULT | null;
}) {
  const [input, setInput] = useState("");
  const { isSignedIn } = useUser();
  const { toggleSidebar } = useSidebar();
  const { messages, sendMessage, status } = useChat();
  const isLoading = status === "submitted" || status === "streaming";

  const getGreeting = () => {
    if (!profile?.firstName) {
      return "Ask me anything about my work, experience, or projects.";
    }

    const fullName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(" ");

    return `Hi! I'm ${fullName}. Ask me anything about my work, experience, or projects.`;
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center justify-between bg-black p-4 text-white">
        <div>
          <h3 className="text-sm font-semibold">
            Chat with {profile?.firstName || "Me"}
          </h3>
          <p className="text-xs text-gray-400">Powered by Gemini AI</p>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="hover:text-gray-300"
          aria-label="Close chat"
        >
          <X size={18} />
        </button>
      </div>

      {isSignedIn ? (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
            {messages.length === 0 && (
              <p className="mt-4 text-center text-sm text-gray-500">
                {getGreeting()}
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl p-3 text-sm ${
                    m.role === "user"
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {m.parts.map((part, i) =>
                    part.type === "text" ? (
                      <span key={`${m.id}-${i}`}>{part.text}</span>
                    ) : null,
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="animate-pulse text-xs italic text-gray-400">
                Typing...
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const text = input.trim();
              if (!text || !isSignedIn) return;
              sendMessage({ text });
              setInput("");
            }}
            className="flex shrink-0 gap-2 border-t border-gray-200 bg-white p-3"
          >
            <input
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-black focus:outline-none"
              value={input}
              placeholder="Ask a question..."
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-lg bg-black p-2 text-white transition-colors hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400"
            >
              <Send size={16} />
            </button>
          </form>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">
            Sign in to chat with the portfolio assistant.
          </p>
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-lg bg-black px-4 py-2 text-sm text-white transition-colors hover:bg-gray-800"
            >
              Sign in
            </button>
          </SignInButton>
        </div>
      )}
    </div>
  );
}

export default Chat;
