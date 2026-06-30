import { useChat } from "@ai-sdk/react";
import { useUser } from "@clerk/nextjs";
import type { UIMessage } from "ai";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { formatSeconds } from "./Util";

export function ChatArea() {
  const [remainingPrompts, setRemainingPrompts] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [input, setInput] = useState("");

  // Handle countdown timer for the cooldown period
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

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

  // Persist messages whenever they change and on unload
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (messages.length > 0) {
        localStorage.setItem(
          "portfolio-chat-messages",
          JSON.stringify(messages),
        );
      } else {
        localStorage.removeItem("portfolio-chat-messages");
      }
    } catch (e) {
      console.error("Failed to persist chat messages", e);
    }
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleBeforeUnload = () => {
      if (messages.length > 0) {
        localStorage.setItem(
          "portfolio-chat-messages",
          JSON.stringify(messages),
        );
      } else {
        localStorage.removeItem("portfolio-chat-messages");
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [messages]);

  const { isSignedIn } = useUser();

  return (
    <>
      <div
        id="chat-area"
        className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2 text-xs text-muted-foreground"
      >
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
            Cooldown: {formatSeconds(cooldownSeconds)}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl p-3 text-sm ${
                m.role === "user"
                  ? "bg-blue-200   text-black"
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
        className="flex flex-col shrink-0 gap-2 border-gray-100 p-3 shadow-md"
      >
        <div className="flex gap-2">
          <Textarea
            className="flex-1 rounded-2xl border border-transparent backdrop-blur-sm px-4 py-2 text-sm placeholder-gray-400 resize-none shadow-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 disabled:bg-gray-50 disabled:text-gray-400"
            value={input}
            disabled={cooldownSeconds > 0}
            placeholder={
              cooldownSeconds > 0
                ? `Wait ${formatSeconds(cooldownSeconds)} to request new prompt...`
                : "Ask a question..."
            }
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!input.trim() || cooldownSeconds > 0}
            className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white w-10 h-10 flex items-center justify-center shadow-md hover:shadow-lg active:scale-95 transform transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
        {cooldownSeconds > 0 && (
          <p className="text-[10px] text-amber-600 text-center">
            Wait {formatSeconds(cooldownSeconds)} to request a new prompt
          </p>
        )}
      </form>
    </>
  );
}
