"use client";

import { useUser } from "@clerk/nextjs";
import type { CHAT_PROFILE_QUERY_RESULT } from "@/sanity.types";
import { ChatArea } from "./components/ChatArea";
import { ChatHeader } from "./components/ChatHeader";
import { RequestLogin } from "./components/RequestLogin";

export function Chat({
  profile,
}: {
  profile: CHAT_PROFILE_QUERY_RESULT | null;
}) {
  const { isSignedIn } = useUser();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ChatHeader profile={profile} />

      {isSignedIn ? <ChatArea /> : <RequestLogin />}
    </div>
  );
}

export default Chat;
