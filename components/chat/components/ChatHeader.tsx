import { X } from "lucide-react";
import type { CHAT_PROFILE_QUERY_RESULT } from "@/sanity.types";
import { useSidebar } from "../../ui/sidebar";

export function ChatHeader({
  profile,
}: {
  profile: CHAT_PROFILE_QUERY_RESULT;
}) {
  const { toggleSidebar } = useSidebar();
  return (
    <div className="flex shrink-0 items-center justify-between p-4">
      <div>
        <h3 className="text-sm  font-semibold">
          Chat with {profile?.firstName || "Me"}
        </h3>
        <p className="text-xs text-gray-400">
          Hi! I'm {profile?.firstName}. Ask me anything about my work,
          experience, or projects!
        </p>
      </div>
      <button
        type="button"
        onClick={toggleSidebar}
        className="hover:text-gray-300"
        aria-label="Close chat"
      >
        <X size={25} />
      </button>
    </div>
  );
}
