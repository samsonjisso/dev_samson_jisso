"use client";

import { useUser } from "@clerk/nextjs";
import type { CHAT_PROFILE_QUERY_RESULT } from "@/sanity.types";
import { ChatHeader } from "./components/ChatHeader";
import { RequestLogin } from "./components/RequestLogin";
import { ChatArea } from "./components/ChatArea";

export function Chat({
  profile,
}: {
  profile: CHAT_PROFILE_QUERY_RESULT | null;
}) {
  const { isSignedIn } = useUser();

  

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <ChatHeader profile={profile} />

      {isSignedIn ? (
        <ChatArea profile={profile} />
      ) : (
        <RequestLogin />
      )}
    </div>
  );
}

export default Chat;
