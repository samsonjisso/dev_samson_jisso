import { X } from "lucide-react";
import { type CHAT_PROFILE_QUERY_RESULT } from "@/sanity.types";
import { useSidebar } from "../../ui/sidebar";

export function ChatHeader({
  profile,
}: {
  profile: CHAT_PROFILE_QUERY_RESULT;
}) {
  const { toggleSidebar } = useSidebar();
  return (
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
  );
}
