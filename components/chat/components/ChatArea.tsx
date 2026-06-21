import { UIMessage } from "ai";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Send } from "lucide-react";
import { CHAT_PROFILE_QUERY_RESULT } from "@/sanity.types";

export function ChatArea({ profile }: { profile: CHAT_PROFILE_QUERY_RESULT }) {
  const [remainingPrompts, setRemainingPrompts] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [input, setInput] = useState("");

  // Handle countdown timer for the cooldown period

  useState(() => {
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  });

  const getGreeting = () => {
    if (!profile?.firstName) {
      return "Ask me anything about my work, experience, or projects.";
    }

    const fullName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(" ");

    return `Hi! I'm ${fullName}. Ask me anything about my work, experience, or projects.`;
  };

  // Initialize initialMessages from localStorage on client side
  const [initialMessages] = useState<UIMessage[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("portfolio-chat-messages");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Error loading chat messages from localStorage", e);
        }
      }
    }
    return [];
  });

  const { messages, sendMessage, status } = useChat({
    messages: initialMessages,
    onFinish(message) {
      // Small timeout or microtask to ensure `messages` has updated inside useChat state,
      // but to be absolutely safe we can append to the existing localStorage inside a useEffect or callback.
    },
    onError(error: Error) {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) {
          setErrorMessage(parsed.error);
        } else {
          setErrorMessage("Failed to send message. Please try again.");
        }
        if (parsed.rateLimit) {
          setRemainingPrompts(parsed.rateLimit.remaining);
          setCooldownSeconds(parsed.rateLimit.cooldownSeconds);
        }
      } catch {
        setErrorMessage(
          error.message || "Failed to send message. Please try again.",
        );
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Persist messages whenever they change using a proper useEffect
  useState(() => {
    if (typeof window !== "undefined") {
      const handleBeforeUnload = () => {
        if (messages.length > 0) {
          localStorage.setItem(
            "portfolio-chat-messages",
            JSON.stringify(messages),
          );
        }
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () =>
        window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  });

  // Track state changes to messages dynamically so refreshes reflect immediately
  useState(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem("portfolio-chat-messages", JSON.stringify(messages));
    }
  });

  const { isSignedIn } = useUser();

  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-500">
        <div>
          {remainingPrompts !== null ? (
            <span>
              Prompts left:{" "}
              <strong
                className={
                  remainingPrompts <= 3 ? "text-red-500" : "text-gray-700"
                }
              >
                {remainingPrompts}
              </strong>{" "}
              / 15
            </span>
          ) : (
            <span>Max 15 requests per hr</span>
          )}
        </div>
        {cooldownSeconds > 0 && (
          <span className="font-semibold text-amber-600 animate-pulse">
            Cooldown: {cooldownSeconds}s
          </span>
        )}
      </div>

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
              {m.parts.map((part) =>
                part.type === "text" ? (
                  <span key={`${m.id}-part-${part.text.substring(0, 16)}`}>
                    {part.text}
                  </span>
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
        {errorMessage && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-100">
            {errorMessage}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text || !isSignedIn || cooldownSeconds > 0) return;
          sendMessage({ text });
          setInput("");
          setErrorMessage(null);
        }}
        className="flex flex-col shrink-0 gap-2 border-t border-gray-200 bg-white p-3"
      >
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
            value={input}
            disabled={cooldownSeconds > 0}
            placeholder={
              cooldownSeconds > 0
                ? `Wait ${cooldownSeconds}s to request new prompt...`
                : "Ask a question..."
            }
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!input.trim() || cooldownSeconds > 0}
            className="rounded-lg bg-black p-2 text-white transition-colors hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center min-w-[36px]"
          >
            <Send size={16} />
          </button>
        </div>
        {cooldownSeconds > 0 && (
          <p className="text-[10px] text-amber-600 text-center">
            Wait {cooldownSeconds}s to request a new prompt
          </p>
        )}
      </form>
    </>
  );
}
